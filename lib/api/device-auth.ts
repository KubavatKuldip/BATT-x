// Device-side authentication for IoT ingestion endpoints.
// A real device presents an X-Device-Key header that must match
// process.env.DEVICE_INGEST_SECRET. Without it, the request is rejected.
//
// This is a thin shared-secret check suitable for the simulated-device path
// in this codebase. In production, swap for per-device keys stored on the
// Device model and looked up in Prisma, or for mTLS / signed JWTs.
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function verifyDeviceIngestKey(req: NextRequest): boolean {
  const expected = process.env.DEVICE_INGEST_SECRET;
  if (!expected || expected.length < 16) {
    // No key configured → refuse. Prevents accidental open endpoints.
    return false;
  }
  const provided = req.headers.get("x-device-key");
  if (!provided) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
