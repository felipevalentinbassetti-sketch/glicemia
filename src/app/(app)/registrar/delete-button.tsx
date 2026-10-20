"use client";

import type { EventKind } from "@/lib/data";
import { deleteEntry } from "./actions";

export function DeleteButton({ kind, id }: { kind: EventKind; id: number }) {
  return (
    <form
      action={deleteEntry}
      onSubmit={(e) => {
        if (!confirm("Excluir este registro?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-xs text-muted hover:bg-background hover:text-glucose-very-low"
      >
        Excluir
      </button>
    </form>
  );
}
