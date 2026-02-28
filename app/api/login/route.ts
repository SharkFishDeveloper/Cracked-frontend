"use server"
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendTokenEmail } from "@/lib/email/sendTokenEmail";
import generateToken from "@/lib/generateToken";
import { TIME } from "@/lib/timeDB";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, deviceType } = body;


    const normalizedEmail = email?.toLowerCase().trim();

    // ===============================
    // Basic validation
    // ===============================
    if (!normalizedEmail || !password || !deviceType) {
      return NextResponse.json(
        { error: "Email, password and deviceType required" },
        { status: 400 }
      );
    }

    if (!["WEB", "ELECTRON"].includes(deviceType)) {
      return NextResponse.json(
        { error: "Invalid device type" },
        { status: 400 }
      );
    }

    // ===============================
    // Find user
    // ===============================
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }


    const valid = await bcrypt.compare(password, user.password);


    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    // ===============================
    // Email not verified
    // ===============================
    if (!user.emailVerified) {

      const existingVerification = await redis.get(
        `verify:${normalizedEmail}`
      );


      if (!existingVerification) {
        const token = generateToken();
        const hashedToken = await bcrypt.hash(token, 10);

        await redis.set(
          `verify:${normalizedEmail}`,
          {
            email: user.email,
            name: user.name,
            token: hashedToken,
          },
          { ex: TIME.FIFTEEN_MINUTES.seconds }
        );


        await sendTokenEmail({
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          token,
        });
      }

      return NextResponse.json(
        { error: "Email not verified. Verification email sent." },
        { status: 403 }
      );
    }


    // ===============================
    // SESSION CONTROL
    // ===============================
    const sessionKey = `session:${user.id}:${deviceType}`;
    const existingSession = await redis.get(sessionKey);


    if (existingSession) {
      return NextResponse.json(
        { error: `Already logged in on this account` },
        { status: 401 }
      );
    }

    // ===============================
    // Generate JWT
    // ===============================
    const accessToken = jwt.sign(
      { userId: user.id, deviceType },
      process.env.JWT_SECRET!,
      { expiresIn: TIME.ONE_HOUR.label }
    );


    // ===============================
    // Store session
    // ===============================
    await redis.set(sessionKey, accessToken, {
      ex: TIME.ONE_HOUR.seconds,
    });


    return NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        remainingSeconds: user.subscription?.remainingSeconds ?? 0,
        planName: user.subscription?.planName ?? null,
        subscriptionExpiresAt:
          user.subscription?.expiresAt ?? null,
      },
    });

  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}