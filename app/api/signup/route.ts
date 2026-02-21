import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import {  sendTokenEmail } from "@/lib/email/sendTokenEmail";
import generateToken from "@/lib/generateToken";


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
     
    await sendTokenEmail({email,token,name})

    return NextResponse.json(
      { message: "User created. OTP sent to email." },
      { status: 201 }
    );  
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}