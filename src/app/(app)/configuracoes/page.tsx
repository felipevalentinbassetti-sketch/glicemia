import { Suspense } from "react";
import { SyncButton } from "@/components/sync-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { formatAge, formatDateTime } from "@/lib/glucose";
import { TargetsForm } from "./targets-form";

export default function SettingsPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Aparência</h2>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </section>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />}>
        <UserSettings />
      </Suspense>
    </main>
  );
}

async function UserSettings() {
  const { supabase, user, now } = await requireUser();
  const settings = await getSettings(supabase);
  const syncOk = settings.lastSyncStatus === "ok";

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Faixa alvo</h2>
        <div className="mt-3">
          <TargetsForm low={settings.targetLow} high={settings.targetHigh} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Sincronização com o FreeStyle Libre</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">Última tentativa</dt>
            <dd>
              {settings.lastSyncAt
                ? `${formatDateTime(new Date(settings.lastSyncAt).getTime())} (${formatAge(settings.lastSyncAt, now)})`
                : "nunca"}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">Situação</dt>
            <dd className={syncOk ? "text-glucose-in-range" : "text-glucose-low"}>
              {settings.lastSyncStatus ? (syncOk ? "✓ funcionando" : `✕ ${settings.lastSyncStatus}`) : "—"}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">Frequência</dt>
            <dd>automática, a cada 5 minutos</dd>
          </div>
        </dl>
        <div className="mt-4">
          <SyncButton />
        </div>
        <p className="mt-3 text-xs text-muted">
          O e-mail e a senha do LibreLinkUp ficam guardados como segredos na Vercel (Settings → Environment
          Variables: LIBRE_LINK_UP_EMAIL e LIBRE_LINK_UP_PASSWORD). Se trocar a senha, atualize lá e publique de
          novo.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Conta</h2>
        <p className="mt-2 text-sm text-muted">Conectado como {user.email}</p>
      </section>
    </>
  );
}
