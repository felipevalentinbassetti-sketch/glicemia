"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber, type AgpBucket } from "@/lib/glucose";

// Perfil ambulatorial de glicose: mediana e faixas de percentis por horário do dia
const HEIGHT = 240;
const AXIS = 24;
const PLOT = HEIGHT - AXIS - 8;
const TOP = 8;
const LEFT = 34;
const RIGHT = 12;
const DAY_MIN = 24 * 60;

type Props = { buckets: AgpBucket[]; targetLow: number; targetHigh: number; bucketMin?: number };

export function AgpChart({ buckets, targetLow, targetHigh, bucketMin = 30 }: Props) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(width - LEFT - RIGHT, 1);
  const maxValue = buckets.reduce((m, b) => Math.max(m, b.p95), 0);
  const yMax = Math.min(Math.max(300, Math.ceil((maxValue + 20) / 50) * 50), 450);
  const yMin = 40;

  // Cada faixa é desenhada no meio do seu intervalo de tempo
  const x = (minute: number) => LEFT + ((minute + bucketMin / 2) / DAY_MIN) * plotWidth;
  const y = (v: number) => TOP + PLOT - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * PLOT;

  const area = (lo: keyof AgpBucket, hi: keyof AgpBucket) =>
    buckets.length
      ? `M${buckets.map((b) => `${x(b.minute)},${y(b[hi])}`).join("L")}` +
        `L${[...buckets].reverse().map((b) => `${x(b.minute)},${y(b[lo])}`).join("L")}Z`
      : "";
  const median = buckets.length ? `M${buckets.map((b) => `${x(b.minute)},${y(b.p50)}`).join("L")}` : "";

  const bucket = active !== null ? buckets[active] : null;
  const yTicks = [70, 180, 250, yMax].filter((v, i, all) => all.indexOf(v) === i);

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!buckets.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = ((e.clientX - rect.left - LEFT) / plotWidth) * DAY_MIN;
    let best = 0;
    buckets.forEach((b, i) => {
      if (Math.abs(b.minute + bucketMin / 2 - minute) < Math.abs(buckets[best].minute + bucketMin / 2 - minute)) best = i;
    });
    setActive(best);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!buckets.length) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const d = e.key === "ArrowLeft" ? -1 : 1;
      setActive((i) => (i === null ? 0 : Math.min(Math.max(i + d, 0), buckets.length - 1)));
    } else if (e.key === "Escape") setActive(null);
  }

  const hhmm = (minute: number) =>
    `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

  return (
    <div>
      <div ref={ref} className="relative" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Perfil ambulatorial de glicose por horário do dia. Use as setas para percorrer os horários."
            tabIndex={0}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            className="absolute top-0 left-0 touch-pan-y select-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <rect
              x={LEFT}
              width={plotWidth}
              y={y(targetHigh)}
              height={y(targetLow) - y(targetHigh)}
              fill="var(--glucose-in-range)"
              opacity={0.1}
            />
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={LEFT}
                  x2={LEFT + plotWidth}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={v === targetLow || v === targetHigh ? "var(--glucose-in-range)" : "var(--border)"}
                  strokeOpacity={v === targetLow || v === targetHigh ? 0.5 : 1}
                  shapeRendering="crispEdges"
                />
                <text x={LEFT - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {v}
                </text>
              </g>
            ))}
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
              <text
                key={h}
                x={LEFT + (h / 24) * plotWidth}
                y={TOP + PLOT + 16}
                textAnchor="middle"
                className={`fill-muted text-[11px] tabular-nums ${h % 6 !== 0 ? "max-sm:hidden" : ""}`}
              >
                {String(h).padStart(2, "0")}h
              </text>
            ))}
            <line x1={LEFT} x2={LEFT + plotWidth} y1={TOP + PLOT} y2={TOP + PLOT} stroke="var(--border)" shapeRendering="crispEdges" />

            <path d={area("p5", "p95")} fill="var(--chart-line)" opacity={0.12} />
            <path d={area("p25", "p75")} fill="var(--chart-line)" opacity={0.28} />
            <path d={median} fill="none" stroke="var(--chart-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {bucket && (
              <g pointerEvents="none">
                <line x1={x(bucket.minute)} x2={x(bucket.minute)} y1={TOP} y2={TOP + PLOT} stroke="var(--muted)" />
                <circle cx={x(bucket.minute)} cy={y(bucket.p50)} r={4} fill="var(--chart-line)" stroke="var(--surface)" strokeWidth={2} />
              </g>
            )}

            {buckets.length === 0 && (
              <text x={LEFT + plotWidth / 2} y={TOP + PLOT / 2} textAnchor="middle" className="fill-muted text-sm">
                Dados insuficientes no período
              </text>
            )}
          </svg>
        )}

        {bucket && width > 0 && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-10 w-44 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md"
            style={{ left: Math.min(Math.max(x(bucket.minute) - 88, 0), Math.max(width - 176, 0)) }}
          >
            <p className="text-muted">
              {hhmm(bucket.minute)}–{hhmm(bucket.minute + bucketMin)}
            </p>
            <p className="text-base font-semibold">
              {formatNumber(bucket.p50)} <span className="text-xs font-normal text-muted">mg/dL (mediana)</span>
            </p>
            <p className="text-muted">
              50% entre {formatNumber(bucket.p25)} e {formatNumber(bucket.p75)}
            </p>
            <p className="text-muted">
              90% entre {formatNumber(bucket.p5)} e {formatNumber(bucket.p95)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-chart-line" /> Mediana
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-sm bg-chart-line/30" /> 50% das leituras (25–75%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-sm bg-chart-line/12" /> 90% das leituras (5–95%)
        </span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">Ver em tabela</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-surface text-xs text-muted">
              <tr>
                <th className="px-3 py-1.5 font-medium">Horário</th>
                <th className="px-3 py-1.5 font-medium">Mediana</th>
                <th className="px-3 py-1.5 font-medium">25–75%</th>
                <th className="px-3 py-1.5 font-medium">5–95%</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.minute} className="border-t border-border">
                  <td className="px-3 py-1.5 text-muted">{hhmm(b.minute)}</td>
                  <td className="px-3 py-1.5">{formatNumber(b.p50)}</td>
                  <td className="px-3 py-1.5">
                    {formatNumber(b.p25)}–{formatNumber(b.p75)}
                  </td>
                  <td className="px-3 py-1.5">
                    {formatNumber(b.p5)}–{formatNumber(b.p95)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
