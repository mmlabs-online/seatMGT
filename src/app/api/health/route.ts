import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Used by the Docker healthcheck — confirms the app can actually reach
 * Postgres, not just that the Node process is up. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
