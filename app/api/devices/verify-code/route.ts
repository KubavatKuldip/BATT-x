import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/middleware";
import { z } from "zod";

const verifyCodeSchema = z.object({
  code: z.string().length(6, "Pairing code must be exactly 6 characters"),
});

// POST /api/devices/verify-code - Verify a pairing code
//
// Status: NOT IMPLEMENTED. The previous implementation accepted any 6-character
// code except "000000" and echoed it back as a "BATTX-<code>" serial number.
// That is unsafe (it let any caller fabricate a serial) and is replaced here
// with an explicit 501 + rate-limit-friendly error so callers know the
// endpoint is not yet functional.
//
// To finish this route safely:
//   1. Add a PairingCode model to prisma/schema.prisma with { code, deviceId,
//      expiresAt, usedAt } and a unique index on `code`.
//   2. In this handler, do a single Prisma lookup with `where: { code }` and
//      check `expiresAt > now()` and `usedAt === null`.
//   3. Apply rate limiting (e.g. 5 attempts per 15 minutes per user) — brute
//      force against a 6-char space is feasible.
//   4. Mark the code as used in the same transaction that creates/links the
//      Device.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const body = await req.json();
    const validation = verifyCodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Pairing code verification is not yet implemented. " +
          "This endpoint requires a PairingCode table — see the route file for the implementation plan.",
      },
      { status: 501 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
