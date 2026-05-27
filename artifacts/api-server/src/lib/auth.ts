import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Response } from "express";
import { getStorage } from "../storage";
import { AdminAlreadyExistsError } from "../storage/types";
import { logger } from "./logger";

export const SESSION_COOKIE = "sp_session";
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? "7");
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

function generateSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function sign(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export interface SessionPayload {
  adminId: number;
  expiresAt: number;
}

export function buildSessionCookie(
  adminId: number,
  sessionSecret: string,
): { value: string; maxAgeMs: number; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${adminId}.${expiresAt}`;
  const sig = sign(payload, sessionSecret);
  return { value: `${payload}.${sig}`, maxAgeMs: SESSION_TTL_MS, expiresAt };
}

export function verifySessionCookie(
  cookie: string | undefined,
  sessionSecret: string,
): SessionPayload | null {
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length !== 3) return null;
  const [adminIdStr, expiresAtStr, providedSig] = parts;
  const payload = `${adminIdStr}.${expiresAtStr}`;
  const expectedSig = sign(payload, sessionSecret);
  if (!timingSafeEqual(providedSig, expectedSig)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const adminId = Number(adminIdStr);
  if (!Number.isFinite(adminId)) return null;
  return { adminId, expiresAt };
}

export function setSessionCookie(res: Response, value: string, maxAgeMs: number): void {
  res.cookie(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function seedAdminFromEnvIfNeeded(): Promise<void> {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) return;
  const storage = await getStorage();
  const existing = await storage.getAdmin();
  if (existing) return;
  const passwordHash = await hashPassword(envPassword);
  const sessionSecret = generateSecret();
  try {
    await storage.createAdmin(passwordHash, sessionSecret);
    logger.info("Admin seeded from ADMIN_PASSWORD env var");
  } catch (err) {
    if (err instanceof AdminAlreadyExistsError) {
      logger.info("Admin already exists; skipping ADMIN_PASSWORD seeding");
      return;
    }
    throw err;
  }
}

export function newSessionSecret(): string {
  return generateSecret();
}
