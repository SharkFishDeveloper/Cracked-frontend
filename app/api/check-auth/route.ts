import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
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
    // Verify JWT
    // ===============================
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string; deviceType: string };

    // ===============================
    // Check Redis session
    // ===============================
    const sessionKey = `session:${decoded.userId}:${decoded.deviceType}`;
    const storedToken = await redis.get(sessionKey);

    if (!storedToken || storedToken !== token) {
      return NextResponse.json(
        { error: "Session expired or logged out" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: decoded.userId,
    });

  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}