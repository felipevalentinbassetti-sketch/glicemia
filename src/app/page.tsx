import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

// O cabeçalho é estático; o conteúdo depende da sessão e entra via <Suspense>
export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">Glicemia</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-6 md:grid-cols-3">
        <section className="rounded-2xl border border-border bg-surface p-5 md:col-span-1">
          <h2 className="text-sm font-medium text-muted">Glicemia atual</h2>
          <p className="mt-3 text-4xl font-semibold tabular-nums">— mg/dL</p>
          <p className="mt-2 text-sm text-muted">
            Aguardando a sincronização com o FreeStyle Libre.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 md:col-span-2">
          <h2 className="text-sm font-medium text-muted">Últimas horas</h2>
          <div className="mt-3 flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
            O gráfico aparecerá aqui
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 md:col-span-3">
          <h2 className="text-sm font-medium text-muted">Tempo no alvo</h2>
          <p className="mt-3 text-sm text-muted">Sem dados ainda.</p>
        </section>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-muted">
        Logado como {user.email}. Este app não substitui o aplicativo oficial
        do sensor nem orientação médica.
      </footer>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto grid w-full max-w-6xl flex-1 animate-pulse gap-4 px-4 py-6 md:grid-cols-3"
    >
      <div className="h-36 rounded-2xl border border-border bg-surface md:col-span-1" />
      <div className="h-64 rounded-2xl border border-border bg-surface md:col-span-2" />
      <div className="h-24 rounded-2xl border border-border bg-surface md:col-span-3" />
    </main>
  );
}
