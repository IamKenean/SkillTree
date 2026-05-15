import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const username = String(body.username || "").trim();
    const avatarEmoji = String(body.avatarEmoji || "🧑‍🚀").trim() || "🧑‍🚀";

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (username.length < 2 || username.length > 32) {
      return NextResponse.json({ error: "Username must be 2–32 characters" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, username, passwordHash, avatarEmoji },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not register" }, { status: 500 });
  }
}
