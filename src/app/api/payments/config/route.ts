import { NextResponse } from "next/server";
import { getPublicPaymentsConfig } from "@/lib/payments/config";

/**
 * Safe public payments flags for client UI (sandbox badge).
 * Never includes secret keys or webhook secrets.
 */
export async function GET() {
  return NextResponse.json(getPublicPaymentsConfig(), {
    headers: {
      // Avoid caching across env flips during local switching.
      "Cache-Control": "no-store",
    },
  });
}
