import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { sendTokenEmail } from "@/lib/email/sendTokenEmail";
import generateToken from "@/lib/generateToken";
import { redis } from "@/lib/redis";
import { TIME } from "@/lib/timeDB";

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "All fields required" },
        { status: 400 }
      );
    }

    // Check if already fully registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Check if verification already pending in Redis
    const existingVerification = await redis.get(`verify:${email}`);

    if (existingVerification) {
      return NextResponse.json(
        { message: "Verification already sent. Check your email." },
        { status: 200 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = generateToken();
    const hashedToken = await bcrypt.hash(token, 10);

    await redis.set(
      `verify:${email}`,
      {
        email,
        name,
        password: hashedPassword,
        token: hashedToken,
      },
      {
        ex: TIME.FIFTEEN_MINUTES.seconds, // 15 minutes
      }
    );

    await sendTokenEmail({ email, token, name });

    return NextResponse.json(
      { message: "Verification email sent." },
      { status: 201 }
    );

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}