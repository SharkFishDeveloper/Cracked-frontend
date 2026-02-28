import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  // await redis.flushall();
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // ===============================
    // Verify and decode JWT
    // ===============================
    let decoded: { userId: string; deviceType: string };

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as { userId: string; deviceType: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // ===============================
    // Delete session from Redis
    // ===============================
    const sessionKey = `session:${decoded.userId}:${decoded.deviceType}`;

    await redis.del(sessionKey);

    return NextResponse.json({
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}