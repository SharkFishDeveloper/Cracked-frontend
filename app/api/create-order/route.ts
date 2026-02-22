import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

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
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;
    const { plan } = await req.json();
    // Map frontend plan codes to internal plan IDs
    let planID: "MONTH_60" | "MONTH_240" | null = null;

    if (plan === "6015") {
      planID = "MONTH_60";
    } else if (plan === "24030") {
      planID = "MONTH_240";
    }

    if (!planID) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Server-controlled pricing
    const plans = {
      MONTH_60: { amount: 600, minutes: 60 },
      MONTH_240: { amount: 2200, minutes: 240 },
    };

    const selected = plans[planID];

    const existing = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        expiresAt: true,
        remainingMinutes: true,
      },
    });

    if (
      existing &&
      existing.expiresAt > new Date() &&
      existing.remainingMinutes >= 7
    ) {
      return NextResponse.json(
        { error: "Plan still active" },
        { status: 400 }
      );
    }

    if (
      existing &&
      existing.expiresAt > new Date() &&
      existing.remainingMinutes >= 7
    ) {
      return NextResponse.json(
        { error: "Plan still active" },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: selected.amount * 100, // rupees → paise
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
