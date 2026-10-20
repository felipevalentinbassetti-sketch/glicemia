import { formatNumber, type Metrics } from "@/lib/glucose";

// Métricas principais do período, com a referência do consenso ao lado
export function StatTiles({ metrics }: { metrics: Metrics }) {
  const tiles = [
    { label: "Glicemia média", value: `${formatNumber(metrics.mean)}`, unit: "mg/dL", hint: null },
    { label: "GMI", value: formatNumber(metrics.gmi, 1), unit: "%", hint: "estimativa da HbA1c" },
    {
      label: "Variabilidade (CV)",
      value: formatNumber(metrics.cv, 1),
      unit: "%",
      hint: metrics.cv <= 36 ? "estável (meta ≤ 36%)" : "acima da meta de 36%",
    },
    { label: "Desvio padrão", value: formatNumber(metrics.sd), unit: "mg/dL", hint: null },
    {
      label: "Hipoglicemias",
      value: String(metrics.hypoEvents),
      unit: metrics.hypoEvents === 1 ? "evento" : "eventos",
      hint: "≥ 15 min abaixo de 70",
    },
    {
      label: "Uso do sensor",
      value: formatNumber(metrics.coverage),
      unit: "%",
      hint: metrics.coverage >= 70 ? "dados suficientes" : "abaixo de 70%: análise menos confiável",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-border p-3">
          <dt className="text-xs text-muted">{t.label}</dt>
          <dd className="mt-1">
            <span className="text-2xl font-semibold">{t.value}</span>{" "}
            <span className="text-xs text-muted">{t.unit}</span>
            {t.hint && <span className="mt-0.5 block text-xs text-muted">{t.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
