import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// TEMPORARY ENDPOINT - Delete after demo user is initialized in production
//
// Creates demo@battx.com as a real database user in production.
// Protected by DEMO_INIT_SECRET via x-demo-init-secret header.
// Production-only. Idempotent.

export async function POST(req: NextRequest) {
  try {
    // 1. Production environment check
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "This endpoint only works in production" },
        { status: 403 }
      );
    }

    // 2. Verify secret from header (never query params)
    const secret = req.headers.get("x-demo-init-secret");

    if (!secret) {
      return NextResponse.json(
        { error: "Missing x-demo-init-secret header" },
        { status: 401 }
      );
    }

    if (!process.env.DEMO_INIT_SECRET) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    if (secret !== process.env.DEMO_INIT_SECRET) {
      return NextResponse.json(
        { error: "Invalid secret" },
        { status: 403 }
      );
    }

    // 3. Check if demo user already exists (idempotency)
    const existingUser = await prisma.user.findUnique({
      where: { email: "demo@battx.com" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        created: false,
        message: "Demo user already exists",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
          createdAt: existingUser.createdAt,
        },
      });
    }

    // 4. Hash password using same algorithm as signup (bcryptjs, 12 rounds)
    const hashedPassword = await hash("BATTxDemo!2026#47", 12);

    // 5. Create demo user with Prisma-generated CUID
    const demoUser = await prisma.user.create({
      data: {
        email: "demo@battx.com",
        name: "Demo User",
        password: hashedPassword,
        role: "CONSUMER",
        preferredLanguage: "en",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      created: true,
      message: "Demo user created successfully",
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        createdAt: demoUser.createdAt,
      },
    });

  } catch (error: any) {
    // Don't expose detailed error information
    return NextResponse.json(
      { error: "Failed to initialize demo user" },
      { status: 500 }
    );
  }
}
