import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { redis } from "@/lib/redis";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // ===============================
    // Verify JWT
    // ===============================
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string; deviceType: string };

    // ===============================
    // Check Redis session (NEW LOGIC)
    // ===============================
    const sessionKey = `session:${decoded.userId}:${decoded.deviceType}`;
    const storedToken = await redis.get(sessionKey);

    if (!storedToken || storedToken !== token) {
      return NextResponse.json(
        { error: "Session expired or logged out" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    const { plan } = await req.json();

    // ===============================
    // Server-controlled plans
    // ===============================
    const plans = {
      MONTH_60: { amount: 600, seconds: 3600 },
      MONTH_240: { amount: 2200, seconds: 14400 },
    } as const;

    if (!plans[plan as keyof typeof plans]) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    const selected = plans[plan as keyof typeof plans];

    // ===============================
    // Check existing subscription
    // ===============================
    const existing = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        expiresAt: true,
        remainingSeconds: true,
      },
    });

    if (
      existing &&
      existing.expiresAt > new Date() &&
      existing.remainingSeconds > 0
    ) {
      return NextResponse.json(
        { error: "Plan still active" },
        { status: 400 }
      );
    }

    // ===============================
    // Create Razorpay order
    // ===============================
    const order = await razorpay.orders.create({
      amount: selected.amount * 100, // paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({ order });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Order creation failed" },
      { status: 500 }
    );
  }
}