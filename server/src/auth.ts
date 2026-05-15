import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-me";

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signToken = (userId: string) =>
  jwt.sign({ userId }, jwtSecret, { expiresIn: "14d" });

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token." });
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, jwtSecret) as { userId: string };
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};
