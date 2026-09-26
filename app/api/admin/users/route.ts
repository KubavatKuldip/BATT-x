import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z
    .enum(["CONSUMER", "FLEET_MANAGER", "TECHNICIAN", "ADMIN", "SUPER_ADMIN"])
    .optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/users - List all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const result = await requireRole(req, ["ADMIN", "FLEET_MANAGER"]);
    if (result instanceof NextResponse) return result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const role = searchParams.get("role");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { devices: true, activityLogs: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/admin/users?id=<userId> - Update user
export async function PATCH(req: NextRequest) {
  try {
    const result = await requireRole(req, ["ADMIN", "SUPER_ADMIN"]);
    if (result instanceof NextResponse) return result;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validation.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: result.user.id,
        action: "admin.user.updated",
        details: {
          targetUserId: userId,
          changes: validation.data,
        },
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/users?id=<userId> - Delete user (super admin only)
export async function DELETE(req: NextRequest) {
  try {
    const result = await requireRole(req, ["SUPER_ADMIN"]);
    if (result instanceof NextResponse) return result;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Don't allow deleting yourself
    if (userId === result.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: result.user.id,
        action: "admin.user.deleted",
        details: { targetUserId: userId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}