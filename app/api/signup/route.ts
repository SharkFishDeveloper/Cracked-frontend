import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function generateToken() {
  return crypto.randomInt(10000, 100000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = generateToken();
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        verificationToken: token,
        verificationTokenExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      },
    });
    // Send Email via Resend
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Cracked <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: "Verify your email",
        html: `
          <div style="font-family: sans-serif;">
            <h2>Hello :${name.toUpperCase()}</h2>
            <h2>Email Verification</h2>
            <p>Your OTP is:</p>
            <h1>${token}</h1>
            <p>This OTP expires in 15 minutes.</p>
          </div>
        `,
      }),
    });

    return NextResponse.json(
      { message: "User created. OTP sent to email." },
      { status: 201 }
    );  
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}