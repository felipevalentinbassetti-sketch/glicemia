import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { EVENT_GLYPHS, getEvents, type EventKind } from "@/lib/data";
import { formatDateTime, TIMEZONE } from "@/lib/glucose";
import { DeleteButton } from "./delete-button";
import { EntryForm } from "./entry-form";

const TABS: { tipo: string; kind: EventKind; label: string }[] = [
  { tipo: "insulina", kind: "insulin", label: "Insulina" },
  { tipo: "refeicao", kind: "meal", label: "Refeição" },
  { tipo: "exercicio", kind: "exercise", label: "Exercício" },
  { tipo: "nota", kind: "note", label: "Nota" },
];

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function RegisterPage({ searchParams }: PageProps<"/registrar">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 px-4 py-6 lg:grid-cols-2">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-border bg-surface" />}>
        <Register searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Register({ searchParams }: Pick<PageProps<"/registrar">, "searchParams">) {
  const [{ tipo }, { supabase, now }] = await Promise.all([searchParams, requireUser()]);
  const tab = TABS.find((t) => t.tipo === tipo) ?? TABS[0];
  const events = (await getEvents(supabase, new Date(now - WEEK), new Date(now + 60_000))).reverse();

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h1 className="text-lg font-semibold">Novo registro</h1>
        <nav aria-label="Tipo de registro" className="mt-3 grid grid-cols-4 gap-1 rounded-lg border border-border p-0.5 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.tipo}
              href={`/registrar?tipo=${t.tipo}`}
              aria-current={t === tab ? "page" : undefined}
              className={`rounded-md px-1 py-1.5 text-center ${
                t === tab ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="mt-5">
          <EntryForm key={tab.kind} kind={tab.kind} defaultMealType={mealTypeFor(now)} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Últimos 7 dias</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nenhum registro ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {events.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex items-start gap-3 py-2.5">
                <span
                  aria-label={EVENT_GLYPHS[e.kind].label}
                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-surface"
                >
                  {EVENT_GLYPHS[e.kind].letter}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{e.title}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(e.t)}
                    {e.detail && ` · ${e.detail}`}
                  </p>
                </div>
                <DeleteButton kind={e.kind} id={e.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// Sugere o tipo de refeição pelo horário local
function mealTypeFor(now: number) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(now),
  );
  if (hour >= 5 && hour < 10) return "cafe";
  if (hour >= 11 && hour < 15) return "almoco";
  if (hour >= 18 && hour < 22) return "jantar";
  if (hour >= 22 || hour < 2) return "ceia";
  return "lanche";
}
