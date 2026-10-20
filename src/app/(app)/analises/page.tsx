import { Suspense } from "react";
import { AgpChart } from "@/components/agp-chart";
import { DailyTable } from "@/components/daily-table";
import { PeriodFilter } from "@/components/period-filter";
import { StatTiles } from "@/components/stat-tiles";
import { TirBar } from "@/components/tir-bar";
import { requireUser } from "@/lib/auth";
import { getReadings, getSettings } from "@/lib/data";
import { computeAgp, computeMetrics, formatDate, parsePeriod, summarizeByDay } from "@/lib/glucose";

const DAY = 24 * 60 * 60 * 1000;

export default function AnalysisPage({ searchParams }: PageProps<"/analises">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-border bg-surface" />}>
        <Analysis searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Analysis({ searchParams }: Pick<PageProps<"/analises">, "searchParams">) {
  const [params, { supabase, now }] = await Promise.all([searchParams, requireUser()]);
  const days = parsePeriod(params.dias);
  const from = new Date(now - days * DAY);

  const [settings, points] = await Promise.all([getSettings(supabase), getReadings(supabase, from)]);
  const { targetLow, targetHigh } = settings;
  const metrics = computeMetrics(points, targetLow, targetHigh, days * DAY);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Análises</h1>
          <p className="text-sm text-muted">
            {formatDate(from.getTime())} a {formatDate(now)}
          </p>
        </div>
        <PeriodFilter basePath="/analises" days={days} />
      </div>

      {!metrics ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          Ainda não há leituras neste período.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <section className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
              <h2 className="text-sm font-medium text-muted">Tempo em cada faixa</h2>
              <div className="mt-4">
                <TirBar tir={metrics.tir} targetLow={targetLow} targetHigh={targetHigh} />
              </div>
              <p className="mt-3 text-xs text-muted">
                Metas do consenso: no alvo &gt; 70%, abaixo de 70 &lt; 4%, abaixo de 54 &lt; 1%.
              </p>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-5 lg:col-span-3">
              <h2 className="text-sm font-medium text-muted">Métricas</h2>
              <div className="mt-4">
                <StatTiles metrics={metrics} />
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-medium text-muted">Padrão por horário do dia (AGP)</h2>
            <p className="mt-1 text-xs text-muted">
              Junta todos os dias do período para mostrar em que horários a glicemia costuma subir ou cair.
            </p>
            <div className="mt-4">
              <AgpChart buckets={computeAgp(points)} targetLow={targetLow} targetHigh={targetHigh} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-medium text-muted">Dia a dia</h2>
            <div className="mt-4">
              <DailyTable days={summarizeByDay(points, targetLow, targetHigh)} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
