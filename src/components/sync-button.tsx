"use client";

import { useActionState } from "react";
import { syncNow, type SyncState } from "@/app/(app)/actions";

export function SyncButton() {
  const [state, action, pending] = useActionState<SyncState>(syncNow, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-60"
      >
        {pending ? "Sincronizando…" : "Sincronizar agora"}
      </button>
      {state && !pending && (
        <span role="status" className="text-xs text-muted">
          {state.ok ? "✓ " : "✕ "}
          {state.message}
        </span>
      )}
    </form>
  );
}
