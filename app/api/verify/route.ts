import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, token, deviceType } = await req.json();

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

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (
      !user.verificationToken ||
      !user.verificationTokenExpiry ||
      user.verificationToken !== token ||
      user.verificationTokenExpiry < new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // ✅ Mark verified
    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    // ✅ Create refresh token
    const refreshToken = crypto.randomUUID();

    await prisma.refreshToken.upsert({
      where: {
        userId_deviceType: {
          userId: user.id,
          deviceType,
        },
      },
      update: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      create: {
        token: refreshToken,
        userId: user.id,
        deviceType,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // ✅ Create access token
    const accessToken = jwt.sign(
      { userId: user.id, deviceType },
      process.env.JWT_SECRET!,
      { expiresIn: "30m" }
    );

    return NextResponse.json({
      message: "Email verified successfully",
      accessToken,
      refreshToken,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}