import { formatNumber, RANGES, type RangeKey } from "@/lib/glucose";

// Barra empilhada do tempo em cada faixa, da mais alta (topo/esquerda) à mais baixa.
// A lista ao lado repete os valores, então nada depende só da cor.
export function TirBar({
  tir,
  targetLow,
  targetHigh,
}: {
  tir: Record<RangeKey, number>;
  targetLow: number;
  targetHigh: number;
}) {
  // A faixa "no alvo" e "baixa" mudam com a meta configurada
  const short = (key: RangeKey, fallback: string) =>
    key === "inRange"
      ? `${targetLow}–${targetHigh}`
      : key === "low"
        ? `54–${targetLow - 1}`
        : key === "high"
          ? `${targetHigh + 1}–250`
          : fallback;

  const segments = [...RANGES].reverse();

  return (
    <div>
      <div
        className="flex h-6 w-full gap-0.5 overflow-hidden rounded"
        role="img"
        aria-label={RANGES.map((r) => `${r.label}: ${formatNumber(tir[r.key])}%`).join(", ")}
      >
        {segments.map((r) =>
          tir[r.key] > 0 ? (
            <div
              key={r.key}
              title={`${r.label} (${short(r.key, r.short)} mg/dL): ${formatNumber(tir[r.key], 1)}%`}
              className={`${r.bgClass} first:rounded-l last:rounded-r`}
              style={{ width: `${tir[r.key]}%`, minWidth: 3 }}
            />
          ) : null,
        )}
      </div>

      <ul className="mt-3 grid gap-1 text-sm">
        {RANGES.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted">
              <span className={`inline-block size-2.5 rounded-sm ${r.bgClass}`} />
              {r.label}
              <span className="text-xs">({short(r.key, r.short)})</span>
            </span>
            <span
              className={`tabular-nums ${r.key === "inRange" ? "font-semibold text-foreground" : "text-foreground"}`}
            >
              {formatNumber(tir[r.key])}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
