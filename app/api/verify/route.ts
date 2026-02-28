import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { TIME } from "@/lib/timeDB";

export async function POST(req: NextRequest) {
  try {
    const { email, token, deviceType } = await req.json();

    // ===============================
    // Basic validation
    // ===============================
    if (!email || !token || !deviceType) {
      return NextResponse.json(
        { error: "Email, token and deviceType required" },
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
    // Get verification data
    // ===============================
    const pendingUser = await redis.get<any>(`verify:${email}`);

    if (!pendingUser) {
      return NextResponse.json(
        { error: "Token expired or invalid" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(token, pendingUser.token);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Remove verification entry
    await redis.del(`verify:${email}`);

    // ===============================
    // Upsert user
    // ===============================
    let user;
    try {
      user = await prisma.user.upsert({
        where: { email: pendingUser.email },
        update: {
          emailVerified: true,
        },
        create: {
          email: pendingUser.email,
          name: pendingUser.name,
          password: pendingUser.password,
          emailVerified: true,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Try again after some time" },
        { status: 500 }
      );
    }

    // ===============================
    // SESSION CONTROL (1 per device)
    // ===============================
    const sessionKey = `session:${user.id}:${deviceType}`;

    const existingSession = await redis.get(sessionKey);
    if (existingSession) {
      return NextResponse.json(
        { error: `Already logged in on ${deviceType}` },
        { status: 403 }
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
    // Store session in Redis
    // ===============================
    await redis.set(sessionKey, accessToken, {
      ex: TIME.ONE_HOUR.seconds, // must match JWT expiry
    });

    return NextResponse.json({
      message: "Email verified successfully",
      accessToken,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}