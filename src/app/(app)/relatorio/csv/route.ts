import { NextResponse, type NextRequest } from "next/server";
import { getEvents, getReadings } from "@/lib/data";
import { localDay, parsePeriod, TIMEZONE } from "@/lib/glucose";
import { createClient } from "@/lib/supabase/server";

const DAY = 24 * 60 * 60 * 1000;

const localDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Exporta leituras e registros do período em CSV (separador ";" para abrir direto no Excel em pt-BR)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  const days = parsePeriod(request.nextUrl.searchParams.get("dias") ?? undefined);
  const now = Date.now();
  const from = new Date(now - days * DAY);

  const [points, events] = await Promise.all([getReadings(supabase, from), getEvents(supabase, from)]);

  const rows = [
    ...points.map((p) => ({ t: p.t, type: "glicemia", value: String(p.v), unit: "mg/dL", detail: "" })),
    ...events.map((e) => ({ t: e.t, type: e.kind, value: e.title, unit: "", detail: e.detail ?? "" })),
  ].sort((a, b) => a.t - b.t);

  const lines = [
    ["data_hora_local", "data_hora_utc", "tipo", "valor", "unidade", "detalhe"].join(";"),
    ...rows.map((r) =>
      [localDateTime.format(r.t), new Date(r.t).toISOString(), r.type, r.value, r.unit, r.detail]
        .map(csvField)
        .join(";"),
    ),
  ];

  // BOM para o Excel reconhecer UTF-8 (acentos)
  const body = "﻿" + lines.join("\r\n");
  const filename = `glicemia_${localDay(from.getTime())}_a_${localDay(now)}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvField(value: string) {
  // Evita que o Excel interprete textos como fórmulas
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
