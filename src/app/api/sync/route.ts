import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

// Chamada a cada 5 minutos pelo pg_cron do Supabase (ver supabase/migrations)
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const result = await runSync();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    received: result.received,
    latest: result.latest && {
      measuredAt: result.latest.measuredAt.toISOString(),
      valueMgdl: result.latest.valueMgdl,
      trend: result.latest.trend,
    },
  });
}

function isAuthorized(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;

  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
