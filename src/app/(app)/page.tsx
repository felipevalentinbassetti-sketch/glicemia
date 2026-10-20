import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { GlucoseChart } from "@/components/glucose-chart";
import { SyncButton } from "@/components/sync-button";
import { TirBar } from "@/components/tir-bar";
import { requireUser } from "@/lib/auth";
import { getEvents, getReadings, getSettings } from "@/lib/data";
import { computeMetrics, formatAge, formatNumber, rangeInfo, TRENDS } from "@/lib/glucose";

const DAY = 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const { supabase, now } = await requireUser();

  const from = new Date(now - DAY);

  const [settings, points, events, { data: latest }] = await Promise.all([
    getSettings(supabase),
    getReadings(supabase, from),
    getEvents(supabase, from),
    supabase
      .from("glucose_readings")
      .select("measured_at, value_mgdl, trend")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { targetLow, targetHigh } = settings;
  const metrics = computeMetrics(points, targetLow, targetHigh, DAY);
  const syncFailed = settings.lastSyncStatus && settings.lastSyncStatus !== "ok";
  const range = latest && rangeInfo(latest.value_mgdl, targetLow, targetHigh);

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 px-4 py-6 md:grid-cols-3">
      <AutoRefresh />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h1 className="text-sm font-medium text-muted">Glicemia atual</h1>
        {latest && range ? (
          <>
            <p className="mt-3 flex items-baseline gap-2">
              <span className={`text-6xl font-semibold ${range.textClass}`}>
                {latest.value_mgdl}
              </span>
              {latest.trend && (
                <span className="text-4xl" aria-hidden>
                  {TRENDS[latest.trend].arrow}
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-muted">
              mg/dL · {range.label}
              {latest.trend && ` · ${TRENDS[latest.trend].label}`}
            </p>
            <p className="mt-3 text-sm text-muted">{formatAge(latest.measured_at, now)}</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-4xl font-semibold">— mg/dL</p>
            <p className="mt-2 text-sm text-muted">
              Aguardando a sincronização com o FreeStyle Libre.
            </p>
          </>
        )}

        {syncFailed && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-glucose-low/40 bg-glucose-low/10 px-3 py-2 text-xs"
          >
            Falha na última sincronização: {settings.lastSyncStatus}
          </p>
        )}

        <div className="mt-4">
          <SyncButton />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 md:col-span-2">
        <GlucoseChart
          points={points}
          events={events}
          targetLow={targetLow}
          targetHigh={targetHigh}
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 md:col-span-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-muted">Tempo no alvo · últimas 24 h</h2>
          <Link href="/analises" className="text-sm text-accent hover:underline">
            Ver análises
          </Link>
        </div>
        {metrics ? (
          <div className="mt-4">
            <TirBar tir={metrics.tir} targetLow={targetLow} targetHigh={targetHigh} />
            <p className="mt-3 text-xs text-muted">
              Média {formatNumber(metrics.mean)} mg/dL · {metrics.count} leituras
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Sem dados ainda.</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium text-muted">Registrar</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            { tipo: "insulina", label: "Insulina" },
            { tipo: "refeicao", label: "Refeição" },
            { tipo: "exercicio", label: "Exercício" },
            { tipo: "nota", label: "Nota" },
          ].map((item) => (
            <Link
              key={item.tipo}
              href={`/registrar?tipo=${item.tipo}`}
              className="rounded-lg border border-border px-3 py-3 text-center font-medium hover:bg-background"
            >
              + {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto grid w-full max-w-6xl flex-1 animate-pulse content-start gap-4 px-4 py-6 md:grid-cols-3"
    >
      <div className="h-56 rounded-2xl border border-border bg-surface" />
      <div className="h-80 rounded-2xl border border-border bg-surface md:col-span-2" />
      <div className="h-48 rounded-2xl border border-border bg-surface md:col-span-2" />
      <div className="h-48 rounded-2xl border border-border bg-surface" />
    </main>
  );
}
