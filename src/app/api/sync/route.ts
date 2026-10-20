import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  fetchReadings,
  LibreError,
  login,
  type LibreSession,
} from "@/lib/libre";
import { createAdminClient } from "@/lib/supabase/admin";

// Chamada a cada 5 minutos pelo pg_cron do Supabase (ver supabase/migrations)
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const userId = await findOwnerId(supabase);
  if (!userId) {
    return NextResponse.json(
      { error: "usuário dono ainda não fez login no app" },
      { status: 409 },
    );
  }

  try {
    const readings = await syncReadings(supabase, userId);
    const rows = readings.map((r) => ({
      user_id: userId,
      measured_at: r.measuredAt.toISOString(),
      value_mgdl: r.valueMgdl,
      trend: r.trend,
      source: "librelinkup",
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("glucose_readings")
        .upsert(rows, { onConflict: "user_id,measured_at", ignoreDuplicates: true });
      if (error) throw error;
    }

    await saveStatus(supabase, userId, "ok");

    const latest = readings.at(-1);
    return NextResponse.json({
      received: rows.length,
      latest: latest && {
        measuredAt: latest.measuredAt.toISOString(),
        valueMgdl: latest.valueMgdl,
        trend: latest.trend,
      },
    });
  } catch (err) {
    const message =
      err instanceof LibreError
        ? err.message
        : err instanceof Error
          ? `erro interno: ${err.message}`
          : "erro interno";
    console.error("[sync]", err);
    await saveStatus(supabase, userId, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

function isAuthorized(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;

  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

async function findOwnerId(supabase: AdminClient) {
  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  if (!email) return null;

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
}

// Reaproveita o token salvo para não fazer login a cada 5 minutos
async function syncReadings(supabase: AdminClient, userId: string) {
  let session = await loadSession(supabase, userId);

  if (session) {
    try {
      return await fetchReadings(session);
    } catch (err) {
      // Token recusado: faz login de novo uma única vez
      if (!(err instanceof LibreError && err.httpStatus === 401)) throw err;
    }
  }

  session = await login(
    requireEnv("LIBRE_LINK_UP_EMAIL"),
    requireEnv("LIBRE_LINK_UP_PASSWORD"),
  );
  await saveSession(supabase, userId, session);
  return fetchReadings(session);
}

async function loadSession(
  supabase: AdminClient,
  userId: string,
): Promise<LibreSession | null> {
  const { data } = await supabase
    .from("libre_sessions")
    .select("host, token, expires_at, account_id_hash")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const expiresAt = new Date(data.expires_at);
  // Renova com 10 minutos de folga
  if (expiresAt.getTime() - Date.now() < 10 * 60 * 1000) return null;

  return {
    host: data.host,
    token: data.token,
    expiresAt,
    accountIdHash: data.account_id_hash,
  };
}

async function saveSession(
  supabase: AdminClient,
  userId: string,
  session: LibreSession,
) {
  const { error } = await supabase.from("libre_sessions").upsert({
    user_id: userId,
    host: session.host,
    token: session.token,
    expires_at: session.expiresAt.toISOString(),
    account_id_hash: session.accountIdHash,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function saveStatus(
  supabase: AdminClient,
  userId: string,
  status: string,
) {
  await supabase.from("user_settings").upsert({
    user_id: userId,
    last_sync_at: new Date().toISOString(),
    last_sync_status: status,
    updated_at: new Date().toISOString(),
  });
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new LibreError(`Variável ${name} não configurada na Vercel`);
  return value;
}
