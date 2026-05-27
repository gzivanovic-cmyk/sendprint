import { Router, type IRouter } from "express";
import { z } from "zod";
import { getStorage } from "../storage";
import { AdminAlreadyExistsError } from "../storage/types";
import {
  buildSessionCookie,
  clearSessionCookie,
  hashPassword,
  newSessionSecret,
  SESSION_COOKIE,
  setSessionCookie,
  verifyPassword,
  verifySessionCookie,
} from "../lib/auth";
import { adminOnly } from "../middleware/adminOnly";

const router: IRouter = Router();

const LoginBody = z.object({ password: z.string().min(1) });
const SetupBody = z.object({ password: z.string().min(8) });
const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.get("/auth/me", async (req, res) => {
  const storage = await getStorage();
  const admin = await storage.getAdmin();
  if (!admin) {
    res.json({ needsSetup: true, authenticated: false });
    return;
  }
  const cookie = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const session = verifySessionCookie(cookie, admin.sessionSecret);
  res.json({
    needsSetup: false,
    authenticated: Boolean(session && session.adminId === admin.id),
    expiresAt: session ? new Date(session.expiresAt).toISOString() : null,
  });
});

router.post("/auth/setup", async (req, res) => {
  const storage = await getStorage();
  const existing = await storage.getAdmin();
  if (existing) {
    res.status(409).json({ error: "Admin already configured" });
    return;
  }
  const parsed = SetupBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const sessionSecret = newSessionSecret();
  let admin;
  try {
    admin = await storage.createAdmin(passwordHash, sessionSecret);
  } catch (err) {
    if (err instanceof AdminAlreadyExistsError) {
      res.status(409).json({ error: "Admin already configured" });
      return;
    }
    throw err;
  }
  const { value, maxAgeMs } = buildSessionCookie(admin.id, admin.sessionSecret);
  setSessionCookie(res, value, maxAgeMs);
  res.json({ success: true });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Password is required" });
    return;
  }
  const storage = await getStorage();
  const admin = await storage.getAdmin();
  if (!admin) {
    res.status(401).json({ error: "Admin not configured", needsSetup: true });
    return;
  }
  const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  const { value, maxAgeMs } = buildSessionCookie(admin.id, admin.sessionSecret);
  setSessionCookie(res, value, maxAgeMs);
  res.json({ success: true });
});

router.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

router.post("/auth/change-password", adminOnly, async (req, res) => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Current password required; new password must be 8+ characters",
    });
    return;
  }
  const storage = await getStorage();
  const admin = await storage.getAdmin();
  if (!admin) {
    res.status(401).json({ error: "Admin not configured" });
    return;
  }
  const ok = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const newHash = await hashPassword(parsed.data.newPassword);
  await storage.updateAdminPassword(newHash);
  const newSecret = newSessionSecret();
  const updated = await storage.rotateAdminSessionSecret(newSecret);
  const { value, maxAgeMs } = buildSessionCookie(updated.id, updated.sessionSecret);
  setSessionCookie(res, value, maxAgeMs);
  res.json({ success: true });
});

export default router;
