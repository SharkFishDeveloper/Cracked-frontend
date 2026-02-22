import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = body;

    // 1️⃣ Validate request
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

    // 2️⃣ Verify JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // 3️⃣ Verify Razorpay signature
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

    // 4️⃣ Map plan
    let planID: "MONTH_60" | "MONTH_240" | null = null;

    if (plan === "6015") planID = "MONTH_60";
    else if (plan === "24030") planID = "MONTH_240";

    if (!planID) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    const plans = {
        MONTH_60: { minutes: 60, price: 600, validityDays: 15 },
        MONTH_240: { minutes: 240, price: 2200, validityDays: 30 },
    };

    const selected = plans[planID];
    const expiry = new Date(
        Date.now() + selected.validityDays * 24 * 60 * 60 * 1000
    );

    // 5️⃣ Transaction (idempotent + minimal ops)
    await prisma.$transaction(async (tx) => {

      const existing = await tx.subscription.findUnique({
        where: { userId },
        select: {
          razorpayPaymentId: true,
          remainingMinutes: true,
          expiresAt: true,
        },
      });

      // 🔒 Idempotency: already processed this payment
      if (existing?.razorpayPaymentId === razorpay_payment_id) {
        return;
      }

      const carryForward =
        existing && existing.expiresAt > new Date()
          ? existing.remainingMinutes
          : 0;

      await tx.subscription.upsert({
        where: { userId },
        update: {
          planName: planID,
          remainingMinutes: selected.minutes + carryForward,
          price: selected.price,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          expiresAt: expiry,
        },
        create: {
          userId,
          planName: planID,
          remainingMinutes: selected.minutes,
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
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
