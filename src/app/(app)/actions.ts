"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { runSync } from "@/lib/sync";

export type SyncState = { message: string; ok: boolean } | null;

export async function syncNow(): Promise<SyncState> {
  await requireUser();

  const result = await runSync();
  refresh();

  return result.ok
    ? { ok: true, message: `${result.received} leituras recebidas` }
    : { ok: false, message: result.error };
}
