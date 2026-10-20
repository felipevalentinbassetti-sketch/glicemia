// Cálculos e classificações de glicemia (consenso internacional de TIR, Battelino et al. 2019)

// O app é de um único usuário no Brasil; usado onde o servidor (UTC) precisa da hora local
export const TIMEZONE = "America/Sao_Paulo";

export type GlucosePoint = { t: number; v: number };

export type RangeKey = "veryLow" | "low" | "inRange" | "high" | "veryHigh";

export const RANGES: {
  key: RangeKey;
  label: string;
  short: string;
  textClass: string;
  bgClass: string;
}[] = [
  { key: "veryHigh", label: "Muito alta", short: "> 250", textClass: "text-glucose-very-high-text", bgClass: "bg-glucose-very-high" },
  { key: "high", label: "Alta", short: "181–250", textClass: "text-glucose-high-text", bgClass: "bg-glucose-high" },
  { key: "inRange", label: "No alvo", short: "70–180", textClass: "text-glucose-in-range-text", bgClass: "bg-glucose-in-range" },
  { key: "low", label: "Baixa", short: "54–69", textClass: "text-glucose-low-text", bgClass: "bg-glucose-low" },
  { key: "veryLow", label: "Muito baixa", short: "< 54", textClass: "text-glucose-very-low-text", bgClass: "bg-glucose-very-low" },
];

export function rangeOf(value: number, low: number, high: number): RangeKey {
  if (value < 54) return "veryLow";
  if (value < low) return "low";
  if (value <= high) return "inRange";
  if (value <= 250) return "high";
  return "veryHigh";
}

export function rangeInfo(value: number, low: number, high: number) {
  const key = rangeOf(value, low, high);
  return RANGES.find((r) => r.key === key)!;
}

export const TRENDS: Record<number, { arrow: string; label: string }> = {
  1: { arrow: "↓", label: "caindo rápido" },
  2: { arrow: "↘", label: "caindo" },
  3: { arrow: "→", label: "estável" },
  4: { arrow: "↗", label: "subindo" },
  5: { arrow: "↑", label: "subindo rápido" },
};

// Leituras com mais de 20 min de intervalo não são ligadas no gráfico
export const MAX_GAP_MS = 20 * 60 * 1000;

export type Metrics = {
  count: number;
  mean: number;
  gmi: number;
  sd: number;
  cv: number;
  // % do tempo em cada faixa (soma 100)
  tir: Record<RangeKey, number>;
  // % do período coberto por leituras do sensor
  coverage: number;
  hypoEvents: number;
};

// Ponderado pelo tempo: cada leitura vale até a próxima (limitado a MAX_GAP_MS),
// assim leituras de 5 e de 15 em 15 min contam de forma justa
export function computeMetrics(
  points: GlucosePoint[],
  low: number,
  high: number,
  periodMs: number,
): Metrics | null {
  if (points.length === 0) return null;

  const tirMs: Record<RangeKey, number> = { veryLow: 0, low: 0, inRange: 0, high: 0, veryHigh: 0 };
  let totalMs = 0;
  let sum = 0;
  let sumSq = 0;

  points.forEach((p, i) => {
    const next = points[i + 1];
    const w = next ? Math.min(next.t - p.t, MAX_GAP_MS) : 5 * 60 * 1000;
    tirMs[rangeOf(p.v, low, high)] += w;
    totalMs += w;
    sum += p.v * w;
    sumSq += p.v * p.v * w;
  });

  const mean = sum / totalMs;
  const sd = Math.sqrt(Math.max(sumSq / totalMs - mean * mean, 0));

  const tir = Object.fromEntries(
    Object.entries(tirMs).map(([k, ms]) => [k, (ms / totalMs) * 100]),
  ) as Record<RangeKey, number>;

  return {
    count: points.length,
    mean,
    // GMI (%) = 3,31 + 0,02392 × glicemia média (mg/dL)
    gmi: 3.31 + 0.02392 * mean,
    sd,
    cv: (sd / mean) * 100,
    tir,
    coverage: Math.min((totalMs / periodMs) * 100, 100),
    hypoEvents: countHypoEvents(points),
  };
}

// Evento de hipoglicemia: ≥ 15 min abaixo de 70; termina com ≥ 15 min acima de 70
function countHypoEvents(points: GlucosePoint[]) {
  const MIN = 15 * 60 * 1000;
  let events = 0;
  let belowSince: number | null = null;
  let aboveSince: number | null = null;
  let inEvent = false;

  for (const p of points) {
    if (p.v < 70) {
      aboveSince = null;
      belowSince ??= p.t;
      if (!inEvent && p.t - belowSince >= MIN) {
        inEvent = true;
        events++;
      }
    } else {
      belowSince = null;
      aboveSince ??= p.t;
      if (inEvent && p.t - aboveSince >= MIN) inEvent = false;
    }
  }
  return events;
}

export type AgpBucket = {
  minute: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  n: number;
};

// Perfil ambulatorial: percentis por faixa de 30 min do dia (hora local)
export function computeAgp(points: GlucosePoint[], bucketMin = 30): AgpBucket[] {
  const buckets = new Map<number, number[]>();
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (const p of points) {
    const [h, m] = fmt.format(p.t).split(":").map(Number);
    const minute = Math.floor((h * 60 + m) / bucketMin) * bucketMin;
    const list = buckets.get(minute) ?? [];
    list.push(p.v);
    buckets.set(minute, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([, values]) => values.length >= 3)
    .map(([minute, values]) => {
      values.sort((a, b) => a - b);
      return {
        minute,
        p5: percentile(values, 5),
        p25: percentile(values, 25),
        p50: percentile(values, 50),
        p75: percentile(values, 75),
        p95: percentile(values, 95),
        n: values.length,
      };
    });
}

function percentile(sorted: number[], p: number) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function formatAge(measuredAt: string | number, now: number) {
  const minutes = Math.floor((now - new Date(measuredAt).getTime()) / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? `há ${hours} h — dados desatualizados`
    : "há mais de um dia — dados desatualizados";
}

export const formatTime = (t: number) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(t);

export const formatDateTime = (t: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(t);

export const formatDate = (t: number) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(t);

export const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export type DaySummary = {
  day: string; // AAAA-MM-DD na hora local
  t: number; // primeira leitura do dia
  mean: number;
  min: number;
  max: number;
  inRange: number; // % no alvo
  below: number; // % abaixo do alvo
  count: number;
};

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const localDay = (t: number) => dayKey.format(t);

export function summarizeByDay(points: GlucosePoint[], low: number, high: number): DaySummary[] {
  const days = new Map<string, GlucosePoint[]>();
  for (const p of points) {
    const key = localDay(p.t);
    const list = days.get(key) ?? [];
    list.push(p);
    days.set(key, list);
  }

  return [...days.entries()].map(([day, list]) => {
    const m = computeMetrics(list, low, high, 24 * 60 * 60 * 1000)!;
    return {
      day,
      t: list[0].t,
      mean: m.mean,
      min: Math.min(...list.map((p) => p.v)),
      max: Math.max(...list.map((p) => p.v)),
      inRange: m.tir.inRange,
      below: m.tir.low + m.tir.veryLow,
      count: list.length,
    };
  });
}

export const PERIOD_OPTIONS = [7, 14, 30, 90] as const;

export function parsePeriod(value: string | string[] | undefined, fallback = 14) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIOD_OPTIONS as readonly number[]).includes(n) ? n : fallback;
}
