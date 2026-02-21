import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendTokenEmail } from "@/lib/email/sendTokenEmail";
import generateToken from "@/lib/generateToken";

export async function POST(req: NextRequest) {
  try {
    const { email, password, deviceType } = await req.json();

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

    // Check if email verified
    if (!user.emailVerified) {
      const token = generateToken();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken:token,
          verificationTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await sendTokenEmail({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        token: token,
      });

      return NextResponse.json(
        { error: "Email not verified. Verification email sent." },
        { status: 403 }
      );
    }

    // Normal login flow continues if verified

    const refreshToken = crypto.randomUUID();

    await prisma.refreshToken.upsert({
      where: {
        userId_deviceType: {
          userId: user.id,
          deviceType: deviceType,
        },
      },
      update: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      create: {
        token: refreshToken,
        userId: user.id,
        deviceType: deviceType,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = jwt.sign(
      { userId: user.id, deviceType },
      process.env.JWT_SECRET!,
      { expiresIn: "2m" }
    );

    return NextResponse.json({
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