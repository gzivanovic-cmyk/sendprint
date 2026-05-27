import type { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE, verifySessionCookie } from "../lib/auth";
import { getStorage } from "../storage";

export async function adminOnly(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const storage = await getStorage();
  const admin = await storage.getAdmin();
  if (!admin) {
    res
      .status(401)
      .json({ error: "Admin not configured", needsSetup: true });
    return;
  }
  const cookie = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const session = verifySessionCookie(cookie, admin.sessionSecret);
  if (!session || session.adminId !== admin.id) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
