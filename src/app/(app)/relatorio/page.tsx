import { Suspense } from "react";
import { AgpChart } from "@/components/agp-chart";
import { DailyTable, type DayTotals } from "@/components/daily-table";
import { PeriodFilter } from "@/components/period-filter";
import { PrintButton } from "@/components/print-button";
import { StatTiles } from "@/components/stat-tiles";
import { TirBar } from "@/components/tir-bar";
import { requireUser } from "@/lib/auth";
import { getReadings, getSettings, getTotals } from "@/lib/data";
import {
  computeAgp,
  computeMetrics,
  formatDate,
  formatDateTime,
  formatNumber,
  localDay,
  parsePeriod,
  summarizeByDay,
} from "@/lib/glucose";

const DAY = 24 * 60 * 60 * 1000;

export default function ReportPage({ searchParams }: PageProps<"/relatorio">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 print:max-w-none print:p-0">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-border bg-surface" />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Report({ searchParams }: Pick<PageProps<"/relatorio">, "searchParams">) {
  const [params, { supabase, user, now }] = await Promise.all([searchParams, requireUser()]);
  const days = parsePeriod(params.dias);
  const from = new Date(now - days * DAY);

  const [settings, points, totals] = await Promise.all([
    getSettings(supabase),
    getReadings(supabase, from),
    getTotals(supabase, from),
  ]);
  const { targetLow, targetHigh } = settings;
  const metrics = computeMetrics(points, targetLow, targetHigh, days * DAY);

  const byDay = new Map<string, DayTotals>();
  const add = (t: number, field: keyof DayTotals, value: number) => {
    const key = localDay(t);
    const entry = byDay.get(key) ?? { bolus: 0, basal: 0, carbs: 0 };
    entry[field] += value;
    byDay.set(key, entry);
  };
  totals.insulin.forEach((r) => add(r.t, r.kind, r.units));
  totals.meals.forEach((r) => add(r.t, "carbs", r.carbs));

  const daysWithData = Math.max(new Set(points.map((p) => localDay(p.t))).size, 1);
  const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
  const avgBolus = sum(totals.insulin.filter((r) => r.kind === "bolus").map((r) => r.units)) / daysWithData;
  const avgBasal = sum(totals.insulin.filter((r) => r.kind === "basal").map((r) => r.units)) / daysWithData;
  const avgCarbs = sum(totals.meals.map((r) => r.carbs)) / daysWithData;

  return (
    <div className="grid gap-4 print:gap-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Relatório</h1>
        <PeriodFilter basePath="/relatorio" days={days} />
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <PrintButton />
        <a
          href={`/relatorio/csv?dias=${days}`}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          Baixar dados (CSV)
        </a>
        <p className="w-full text-xs text-muted">
          No PDF, escolha &quot;Salvar como PDF&quot; como impressora. O tema claro é usado automaticamente na impressão.
        </p>
      </div>

      <article className="grid gap-4 rounded-2xl border border-border bg-surface p-5 print:border-0 print:p-0">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold">Relatório de glicemia — FreeStyle Libre</h2>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>
              Período: {formatDate(from.getTime())} a {formatDate(now)} ({days} dias)
            </p>
            <p>Gerado em {formatDateTime(now)}</p>
          </div>
        </header>

        {!metrics ? (
          <p className="text-sm text-muted">Sem leituras no período.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
              <section className="break-inside-avoid">
                <h3 className="text-sm font-semibold">Tempo em cada faixa</h3>
                <p className="text-xs text-muted">Faixa alvo: {targetLow}–{targetHigh} mg/dL</p>
                <div className="mt-3">
                  <TirBar tir={metrics.tir} targetLow={targetLow} targetHigh={targetHigh} />
                </div>
              </section>
              <section className="break-inside-avoid">
                <h3 className="text-sm font-semibold">Insulina e carboidratos (média por dia)</h3>
                <dl className="mt-3 grid gap-1 text-sm">
                  {[
                    ["Insulina rápida (bolus)", avgBolus ? `${formatNumber(avgBolus, 1)} U` : "não registrada"],
                    ["Insulina basal", avgBasal ? `${formatNumber(avgBasal, 1)} U` : "não registrada"],
                    ["Carboidratos", avgCarbs ? `${formatNumber(avgCarbs)} g` : "não registrados"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-muted">{label}</dt>
                      <dd className="tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs text-muted">
                  Calculado sobre {daysWithData} {daysWithData === 1 ? "dia" : "dias"} com leituras.
                </p>
              </section>
            </div>

            <section className="break-inside-avoid">
              <h3 className="text-sm font-semibold">Métricas</h3>
              <div className="mt-3">
                <StatTiles metrics={metrics} />
              </div>
            </section>

            <section className="break-inside-avoid">
              <h3 className="text-sm font-semibold">Perfil ambulatorial de glicose (AGP)</h3>
              <div className="mt-3">
                <AgpChart buckets={computeAgp(points)} targetLow={targetLow} targetHigh={targetHigh} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Resumo diário</h3>
              <div className="mt-3">
                <DailyTable days={summarizeByDay(points, targetLow, targetHigh)} totals={byDay} />
              </div>
            </section>
          </>
        )}

        <p className="text-xs text-muted">
          Dados do sensor obtidos via LibreLinkUp. Relatório gerado por app pessoal; não substitui o relatório oficial
          do LibreView.
        </p>
      </article>
    </div>
  );
}
