import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "session";
const DAY_MS = 24 * 60 * 60 * 1000;

export type UserRole = "teacher" | "student";

export type SessionUser = {
  id: string;
  login_id: string;
  display_name: string;
  role: UserRole;
};

type SessionPayload = {
  id: string;
  loginId: string;
  displayName: string;
  role: UserRole;
  exp: number;
};

function base64UrlEncode(input: string | Buffer) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buffer.toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function secret() {
  return process.env.APP_SESSION_SECRET || "dev-only-secret";
}

function sign(data: string) {
  return base64UrlEncode(crypto.createHmac("sha256", secret()).update(data).digest());
}

function encodeSession(payload: SessionPayload) {
  const data = base64UrlEncode(JSON.stringify(payload));
  return `${data}.${sign(data)}`;
}

function decodeSession(value: string): SessionPayload | null {
  const [data, signature] = value.split(".");
  if (!data || !signature || sign(data) !== signature) return null;
  try {
    return JSON.parse(base64UrlDecode(data)) as SessionPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function setSession(user: SessionUser) {
  const payload: SessionPayload = {
    id: user.id,
    loginId: user.login_id,
    displayName: user.display_name,
    role: user.role,
    exp: Date.now() + DAY_MS,
  };

  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decodeSession(token);
  if (!payload || payload.exp < Date.now()) return null;

  const { data } = await db()
    .from("ncs_users")
    .select("id,login_id,display_name,role")
    .eq("id", payload.id)
    .maybeSingle();

  return (data as SessionUser | null) ?? null;
}

export async function requireRole(role: UserRole) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.role !== role) throw new Error("FORBIDDEN");
  return user;
}
