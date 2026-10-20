"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EVENT_GLYPHS, type TimelineEvent } from "@/lib/data";
import {
  formatDateTime,
  formatTime,
  MAX_GAP_MS,
  rangeInfo,
  type GlucosePoint,
} from "@/lib/glucose";
import { useNow } from "@/lib/use-now";

const HOUR = 60 * 60 * 1000;

const PERIODS = [3, 6, 12, 24] as const;
const TICK_STEP: Record<number, number> = { 3: 1, 6: 1, 12: 2, 24: 4 };

// Geometria: faixa de eventos no topo, área do gráfico e eixo X embaixo
const LANE = 26;
const PLOT = 210;
const AXIS = 24;
const HEIGHT = LANE + PLOT + AXIS;
const LEFT = 34;
const RIGHT = 44;

type Props = {
  points: GlucosePoint[];
  events: TimelineEvent[];
  targetLow: number;
  targetHigh: number;
};

export function GlucoseChart({ points, events, targetLow, targetHigh }: Props) {
  const [hours, setHours] = useState<number>(6);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const now = useNow();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const start = now - hours * HOUR;
  const visible = useMemo(
    () => points.filter((p) => p.t >= start && p.t <= now),
    [points, start, now],
  );
  const visibleEvents = useMemo(
    () => events.filter((e) => e.t >= start && e.t <= now),
    [events, start, now],
  );

  const plotWidth = Math.max(width - LEFT - RIGHT, 1);
  const maxValue = visible.reduce((m, p) => Math.max(m, p.v), 0);
  const yMax = Math.min(Math.max(300, Math.ceil((maxValue + 20) / 50) * 50), 450);
  const yMin = 40;

  const x = (t: number) => LEFT + ((t - start) / (now - start)) * plotWidth;
  const y = (v: number) =>
    LANE + PLOT - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * PLOT;

  const path = useMemo(() => {
    let d = "";
    visible.forEach((p, i) => {
      const prev = visible[i - 1];
      const cmd = !prev || p.t - prev.t > MAX_GAP_MS ? "M" : "L";
      d += `${cmd}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`;
    });
    return d;
    // x e y dependem só destes valores
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, start, now, plotWidth, yMax]);

  const xTicks = useMemo(() => {
    if (!now) return [];
    const step = TICK_STEP[hours];
    const ticks: number[] = [];
    const d = new Date(start);
    d.setMinutes(0, 0, 0);
    while (d.getTime() <= now) {
      if (d.getTime() >= start && d.getHours() % step === 0) ticks.push(d.getTime());
      d.setHours(d.getHours() + 1);
    }
    return ticks;
  }, [start, now, hours]);

  const yTicks = [70, 180, 250, yMax].filter(
    (v, i, all) => v <= yMax && all.indexOf(v) === i,
  );

  // Marcadores de eventos próximos (ex.: bolus junto da refeição) são afastados 20px
  const markers = visibleEvents.reduce<{ event: TimelineEvent; ex: number; mx: number }[]>((list, event) => {
    const ex = x(event.t);
    const prev = list.at(-1)?.mx ?? -Infinity;
    list.push({ event, ex, mx: Math.min(Math.max(ex, prev + 20), LEFT + plotWidth + RIGHT - 10) });
    return list;
  }, []);

  const active = activeIndex !== null ? visible[activeIndex] : null;
  const latest = visible.at(-1);
  const nearbyEvents = active
    ? visibleEvents.filter((e) => Math.abs(e.t - active.t) <= 20 * 60 * 1000)
    : [];

  function nearestIndex(clientX: number, rect: DOMRect) {
    if (visible.length === 0) return null;
    const t = start + ((clientX - rect.left - LEFT) / plotWidth) * (now - start);
    let lo = 0;
    let hi = visible.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (visible[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && t - visible[lo - 1].t < visible[lo].t - t) lo--;
    return lo;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (visible.length === 0) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? -1 : 1;
      setActiveIndex((i) =>
        i === null
          ? visible.length - 1
          : Math.min(Math.max(i + delta, 0), visible.length - 1),
      );
    } else if (e.key === "Escape") {
      setActiveIndex(null);
    }
  }

  const ready = width > 0 && now > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted">Últimas {hours} horas</h2>
        <div
          role="radiogroup"
          aria-label="Período do gráfico"
          className="inline-flex rounded-lg border border-border p-0.5 text-sm"
        >
          {PERIODS.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={hours === h}
              onClick={() => {
                setHours(h);
                setActiveIndex(null);
              }}
              className={`rounded-md px-2.5 py-1 tabular-nums transition-colors ${
                hours === h ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative mt-3" style={{ height: HEIGHT }}>
        {ready && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Gráfico de glicemia das últimas ${hours} horas. Use as setas para percorrer as leituras.`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActiveIndex(null)}
            onPointerMove={(e) =>
              setActiveIndex(nearestIndex(e.clientX, e.currentTarget.getBoundingClientRect()))
            }
            onPointerLeave={() => setActiveIndex(null)}
            className="absolute top-0 left-0 touch-pan-y select-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {/* Faixa alvo */}
            <rect
              x={LEFT}
              width={plotWidth}
              y={y(targetHigh)}
              height={y(targetLow) - y(targetHigh)}
              fill="var(--glucose-in-range)"
              opacity={0.1}
            />

            {/* Grade e eixo Y */}
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={LEFT}
                  x2={LEFT + plotWidth}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={v === targetLow || v === targetHigh ? "var(--glucose-in-range)" : "var(--border)"}
                  strokeOpacity={v === targetLow || v === targetHigh ? 0.5 : 1}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={LEFT - 6}
                  y={y(v)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted text-[11px] tabular-nums"
                >
                  {v}
                </text>
              </g>
            ))}

            {/* Eixo X */}
            <line
              x1={LEFT}
              x2={LEFT + plotWidth}
              y1={LANE + PLOT}
              y2={LANE + PLOT}
              stroke="var(--border)"
              shapeRendering="crispEdges"
            />
            {xTicks.map((t) => (
              <text
                key={t}
                x={x(t)}
                y={LANE + PLOT + 16}
                textAnchor="middle"
                className="fill-muted text-[11px] tabular-nums"
              >
                {formatTime(t)}
              </text>
            ))}

            {/* Linha de glicemia */}
            <path
              d={path}
              fill="none"
              stroke="var(--chart-line)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Eventos (insulina, refeição, exercício, nota) */}
            {markers.map(({ event: e, ex, mx }) => (
              <g key={`${e.kind}-${e.id}`}>
                <title>{`${formatTime(e.t)} — ${e.title}`}</title>
                {/* Haste no horário real; o marcador pode ter sido afastado para não sobrepor */}
                <polyline
                  points={`${mx},${LANE / 2 + 9} ${ex},${LANE} ${ex},${LANE + PLOT}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <circle cx={mx} cy={LANE / 2} r={9} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2} />
                <text
                  x={mx}
                  y={LANE / 2}
                  dy="0.35em"
                  textAnchor="middle"
                  className="fill-surface text-[10px] font-semibold"
                >
                  {EVENT_GLYPHS[e.kind].letter}
                </text>
              </g>
            ))}

            {/* Última leitura */}
            {latest && !active && (
              <g>
                <circle
                  cx={x(latest.t)}
                  cy={y(latest.v)}
                  r={4}
                  fill="var(--chart-line)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
                <text
                  x={x(latest.t) + 8}
                  y={y(latest.v)}
                  dy="0.32em"
                  className="fill-foreground text-xs font-semibold"
                >
                  {latest.v}
                </text>
              </g>
            )}

            {/* Cursor */}
            {active && (
              <g pointerEvents="none">
                <line
                  x1={x(active.t)}
                  x2={x(active.t)}
                  y1={LANE}
                  y2={LANE + PLOT}
                  stroke="var(--muted)"
                  strokeWidth={1}
                />
                <circle
                  cx={x(active.t)}
                  cy={y(active.v)}
                  r={5}
                  fill="var(--chart-line)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              </g>
            )}

            {visible.length === 0 && (
              <text
                x={LEFT + plotWidth / 2}
                y={LANE + PLOT / 2}
                textAnchor="middle"
                className="fill-muted text-sm"
              >
                Sem leituras neste período
              </text>
            )}
          </svg>
        )}

        {ready && active && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 w-44 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md"
            style={{
              left: Math.min(Math.max(x(active.t) - 88, 0), Math.max(width - 176, 0)),
              transform: `translateY(${y(active.v) > LANE + PLOT / 2 ? LANE : LANE + PLOT - 90}px)`,
            }}
          >
            <p className="text-base font-semibold text-foreground">
              {active.v} <span className="text-xs font-normal text-muted">mg/dL</span>
            </p>
            <p className="text-muted">
              {formatTime(active.t)} · {rangeInfo(active.v, targetLow, targetHigh).label}
            </p>
            {nearbyEvents.map((e) => (
              <p key={`${e.kind}-${e.id}`} className="mt-1 text-foreground">
                <span className="font-semibold">{EVENT_GLYPHS[e.kind].letter}</span>{" "}
                {formatTime(e.t)} — {e.title}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {Object.values(EVENT_GLYPHS).map((g) => (
          <span key={g.letter} className="inline-flex items-center gap-1.5">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-surface">
              {g.letter}
            </span>
            {g.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-sm bg-glucose-in-range/20" />
          Faixa alvo ({targetLow}–{targetHigh})
        </span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">
          Ver em tabela
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-surface text-xs text-muted">
              <tr>
                <th className="px-3 py-1.5 font-medium">Horário</th>
                <th className="px-3 py-1.5 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...visible.map((p) => ({
                  key: `g-${p.t}`,
                  t: p.t,
                  text: `${p.v} mg/dL (${rangeInfo(p.v, targetLow, targetHigh).label})`,
                })),
                ...visibleEvents.map((e) => ({
                  key: `${e.kind}-${e.id}`,
                  t: e.t,
                  text: `${EVENT_GLYPHS[e.kind].label}: ${e.title}`,
                })),
              ]
                .sort((a, b) => b.t - a.t)
                .map((row) => (
                  <tr key={row.key} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-1.5 text-muted">
                      {formatDateTime(row.t)}
                    </td>
                    <td className="px-3 py-1.5">{row.text}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
