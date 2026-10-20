"use client";

import { useActionState } from "react";
import { saveTargets, type SettingsState } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent sm:text-sm";

export function TargetsForm({ low, high }: { low: number; high: number }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveTargets, null);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Limite inferior (mg/dL)
          <input
            name="target_low"
            type="number"
            inputMode="numeric"
            min={60}
            max={120}
            required
            defaultValue={low}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Limite superior (mg/dL)
          <input
            name="target_high"
            type="number"
            inputMode="numeric"
            min={120}
            max={250}
            required
            defaultValue={high}
            className={inputClass}
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        O padrão do consenso internacional é 70–180 mg/dL. Combine qualquer mudança com sua equipe de saúde.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {state && !pending && (
          <p role="status" className={`text-sm ${state.ok ? "text-glucose-in-range" : "text-glucose-very-low"}`}>
            {state.ok ? "✓ " : "✕ "}
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
