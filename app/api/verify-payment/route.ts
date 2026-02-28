import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = await req.json();

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !plan
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    // ==============================
    // 🔐 Auth Check (JWT + Redis)
    // ==============================
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    let decoded: { userId: string; deviceType: string };

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as { userId: string; deviceType: string };
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const sessionKey = `session:${decoded.userId}:${decoded.deviceType}`;
    const storedToken = await redis.get(sessionKey);

    if (!storedToken || storedToken !== token) {
      return NextResponse.json(
        { success: false, error: "Session expired or logged out" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // ==============================
    // 🔐 Verify Razorpay Signature
    // ==============================
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 400 }
      );
    }

    // ==============================
    // 📦 Server-Controlled Plans
    // ==============================
    const plans = {
      MONTH_60: { seconds: 3600, price: 600, validityDays: 15 },
      MONTH_240: { seconds: 14400, price: 2200, validityDays: 30 },
    } as const;

    if (!plans[plan as keyof typeof plans]) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    const selected = plans[plan as keyof typeof plans];

    const expiry = new Date(
      Date.now() + selected.validityDays * 24 * 60 * 60 * 1000
    );

    // ==============================
    // 💳 Transaction (Idempotent)
    // ==============================
    await prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { userId },
      });

      // Idempotency protection
      if (existing?.razorpayPaymentId === razorpay_payment_id) {
        return;
      }

      const carryForward =
        existing && existing.expiresAt > new Date()
          ? existing.remainingSeconds
          : 0;

      await tx.subscription.upsert({
        where: { userId },
        update: {
          planName: plan,
          remainingSeconds: selected.seconds + carryForward,
          price: selected.price,
          currency: "INR",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          expiresAt: expiry,
        },
        create: {
          userId,
          planName: plan,
          remainingSeconds: selected.seconds,
          price: selected.price,
          currency: "INR",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          expiresAt: expiry,
        },
      });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("VERIFY ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}