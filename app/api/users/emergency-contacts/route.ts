import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateBody, handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
});

const emergencyContactsUpdateSchema = z.object({
  emergencyContacts: z.array(emergencyContactSchema),
});

// GET /api/users/emergency-contacts - Get user's emergency contacts
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emergencyContacts: true },
    });

    return NextResponse.json({ emergencyContacts: userData?.emergencyContacts || [] });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/users/emergency-contacts - Add emergency contact
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = await validateBody(req, emergencyContactSchema);
    if (validation instanceof NextResponse) return validation;

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emergencyContacts: true },
    });

    const currentContacts = (userData?.emergencyContacts as any[]) || [];

    // Check max 5 contacts
    if (currentContacts.length >= 5) {
      return NextResponse.json(
        { error: "Maximum 5 emergency contacts allowed" },
        { status: 400 }
      );
    }

    // Check for duplicate phone
    if (currentContacts.some((c: any) => c.phone === validation.data.phone)) {
      return NextResponse.json(
        { error: "Contact with this phone number already exists" },
        { status: 409 }
      );
    }

    const newContact = {
      ...validation.data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const updatedContacts = [...currentContacts, newContact];

    await prisma.user.update({
      where: { id: user.id },
      data: { emergencyContacts: updatedContacts as any },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "emergency_contact.added",
        details: { contact: newContact },
      },
    });

    return NextResponse.json({ emergencyContacts: updatedContacts }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/users/emergency-contacts - Replace all emergency contacts
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const validation = await validateBody(req, emergencyContactsUpdateSchema);
    if (validation instanceof NextResponse) return validation;

    const { emergencyContacts } = validation.data;

    // Validate max 5 contacts
    if (emergencyContacts.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 emergency contacts allowed" },
        { status: 400 }
      );
    }

    // Check for duplicates
    const phones = emergencyContacts.map((c: any) => c.phone);
    if (new Set(phones).size !== phones.length) {
      return NextResponse.json(
        { error: "Duplicate phone numbers are not allowed" },
        { status: 400 }
      );
    }

    const contactsWithIds = emergencyContacts.map((c: any) => ({
      ...c,
      id: c.id || crypto.randomUUID(),
      createdAt: c.createdAt || new Date().toISOString(),
    }));

    await prisma.user.update({
      where: { id: user.id },
      data: { emergencyContacts: contactsWithIds as any },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "emergency_contacts.updated",
        details: { count: contactsWithIds.length },
      },
    });

    return NextResponse.json({ emergencyContacts: contactsWithIds });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/users/emergency-contacts - Remove emergency contact(s)
//
//   DELETE /api/users/emergency-contacts?id=<contactId>
//     removes a single contact.
//
//   DELETE /api/users/emergency-contacts?confirm=true
//     clears ALL contacts. The previous behavior accepted this with no
//     confirmation, which is unsafe: a single call wipes the entire
//     emergency-contact list with no second factor or explicit intent.
//     We now require ?confirm=true and return 400 otherwise.
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("id");
    const confirm = searchParams.get("confirm");

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emergencyContacts: true },
    });

    const currentContacts = (userData?.emergencyContacts as any[]) || [];

    if (contactId) {
      // Remove specific contact
      const updatedContacts = currentContacts.filter((c: any) => c.id !== contactId);

      if (updatedContacts.length === currentContacts.length) {
        return NextResponse.json(
          { error: "Contact not found" },
          { status: 404 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { emergencyContacts: updatedContacts as any },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "emergency_contact.removed",
          details: { contactId },
        },
      });

      return NextResponse.json({ emergencyContacts: updatedContacts });
    }

    if (confirm !== "true") {
      return NextResponse.json(
        {
          error:
            "Clearing all emergency contacts requires explicit confirmation. " +
            "Retry with ?confirm=true.",
        },
        { status: 400 }
      );
    }

    // Clear all contacts (explicit confirmation present)
    await prisma.user.update({
      where: { id: user.id },
      data: { emergencyContacts: [] },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "emergency_contacts.cleared",
        details: { previousCount: currentContacts.length },
      },
    });

    return NextResponse.json({ emergencyContacts: [] });
  } catch (error) {
    return handleApiError(error);
  }
}