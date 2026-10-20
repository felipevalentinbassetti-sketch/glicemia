import type { SupabaseClient } from "@supabase/supabase-js";
import type { GlucosePoint } from "./glucose";

// Acesso aos dados do usuário logado (sempre com o cliente de sessão: o RLS filtra por dono)

export type Settings = {
  targetLow: number;
  targetHigh: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
};

export async function getSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data } = await supabase
    .from("user_settings")
    .select("target_low, target_high, last_sync_at, last_sync_status")
    .maybeSingle();

  return {
    targetLow: data?.target_low ?? 70,
    targetHigh: data?.target_high ?? 180,
    lastSyncAt: data?.last_sync_at ?? null,
    lastSyncStatus: data?.last_sync_status ?? null,
  };
}

const PAGE = 1000;

export async function getReadings(
  supabase: SupabaseClient,
  from: Date,
  to: Date = new Date(),
): Promise<GlucosePoint[]> {
  const points: GlucosePoint[] = [];

  // O Supabase limita cada resposta a 1000 linhas; 90 dias passam disso
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("glucose_readings")
      .select("measured_at, value_mgdl")
      .gte("measured_at", from.toISOString())
      .lte("measured_at", to.toISOString())
      .order("measured_at", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) throw error;
    for (const row of data) {
      points.push({ t: new Date(row.measured_at).getTime(), v: row.value_mgdl });
    }
    if (data.length < PAGE) break;
  }

  return points;
}

export type EventKind = "insulin" | "meal" | "exercise" | "note";

// Marcadores dos eventos no gráfico e nas listas (letra + nome, nunca só cor)
export const EVENT_GLYPHS: Record<EventKind, { letter: string; label: string }> = {
  insulin: { letter: "I", label: "Insulina" },
  meal: { letter: "C", label: "Carboidrato" },
  exercise: { letter: "E", label: "Exercício" },
  note: { letter: "N", label: "Nota" },
};

export type TimelineEvent = {
  id: number;
  kind: EventKind;
  t: number;
  title: string;
  detail: string | null;
};

const INSULIN_KIND: Record<string, string> = { bolus: "rápida", basal: "basal" };

export const MEAL_TYPES: Record<string, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia",
  outro: "Outro",
};

export const INTENSITIES: Record<string, string> = {
  leve: "leve",
  moderada: "moderada",
  intensa: "intensa",
};

export const NOTE_CATEGORIES: Record<string, string> = {
  doenca: "Doença",
  estresse: "Estresse",
  troca_sensor: "Troca de sensor",
  hipo_tratada: "Hipo tratada",
  outro: "Outro",
};

const fmtNum = (n: number) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export async function getEvents(
  supabase: SupabaseClient,
  from: Date,
  to: Date = new Date(),
): Promise<TimelineEvent[]> {
  const range = <T extends string>(column: T) => [from.toISOString(), to.toISOString(), column] as const;

  const [insulin, meals, exercises, notes] = await Promise.all([
    query(supabase, "insulin_doses", "id, taken_at, kind, units, insulin_name, note", ...range("taken_at")),
    query(supabase, "meals", "id, eaten_at, carbs_g, meal_type, description", ...range("eaten_at")),
    query(supabase, "exercises", "id, started_at, duration_min, kind, intensity, note", ...range("started_at")),
    query(supabase, "notes", "id, noted_at, category, body", ...range("noted_at")),
  ]);

  const events: TimelineEvent[] = [
    ...insulin.map((r) => ({
      id: r.id,
      kind: "insulin" as const,
      t: new Date(r.taken_at).getTime(),
      title: `${fmtNum(r.units)} U de insulina ${INSULIN_KIND[r.kind] ?? r.kind}`,
      detail: [r.insulin_name, r.note].filter(Boolean).join(" · ") || null,
    })),
    ...meals.map((r) => ({
      id: r.id,
      kind: "meal" as const,
      t: new Date(r.eaten_at).getTime(),
      title: `${fmtNum(r.carbs_g)} g de carboidrato · ${MEAL_TYPES[r.meal_type] ?? r.meal_type}`,
      detail: r.description || null,
    })),
    ...exercises.map((r) => ({
      id: r.id,
      kind: "exercise" as const,
      t: new Date(r.started_at).getTime(),
      title: `${r.kind} · ${r.duration_min} min (${INTENSITIES[r.intensity] ?? r.intensity})`,
      detail: r.note || null,
    })),
    ...notes.map((r) => ({
      id: r.id,
      kind: "note" as const,
      t: new Date(r.noted_at).getTime(),
      title: NOTE_CATEGORIES[r.category] ?? r.category,
      detail: r.body || null,
    })),
  ];

  return events.sort((a, b) => a.t - b.t);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function query(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  from: string,
  to: string,
  timeColumn: string,
): Promise<Row[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .gte(timeColumn, from)
    .lte(timeColumn, to)
    .order(timeColumn, { ascending: true })
    .limit(PAGE);

  if (error) throw error;
  return (data ?? []) as Row[];
}

export type InsulinRow = { t: number; kind: "bolus" | "basal"; units: number };
export type MealRow = { t: number; carbs: number };

// Doses e carboidratos em formato bruto, para somas por dia (relatório)
export async function getTotals(supabase: SupabaseClient, from: Date, to: Date = new Date()) {
  const [insulin, meals] = await Promise.all([
    query(supabase, "insulin_doses", "taken_at, kind, units", from.toISOString(), to.toISOString(), "taken_at"),
    query(supabase, "meals", "eaten_at, carbs_g", from.toISOString(), to.toISOString(), "eaten_at"),
  ]);

  return {
    insulin: insulin.map(
      (r): InsulinRow => ({ t: new Date(r.taken_at).getTime(), kind: r.kind, units: Number(r.units) }),
    ),
    meals: meals.map((r): MealRow => ({ t: new Date(r.eaten_at).getTime(), carbs: Number(r.carbs_g) })),
  };
}
