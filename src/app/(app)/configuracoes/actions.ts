"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";

export type SettingsState = { ok: boolean; message: string } | null;

export async function saveTargets(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, user } = await requireUser();

  const low = Number(formData.get("target_low"));
  const high = Number(formData.get("target_high"));

  if (!Number.isInteger(low) || low < 60 || low > 120) {
    return { ok: false, message: "Limite inferior: use um valor entre 60 e 120" };
  }
  if (!Number.isInteger(high) || high < 120 || high > 250) {
    return { ok: false, message: "Limite superior: use um valor entre 120 e 250" };
  }
  if (low >= high) {
    return { ok: false, message: "O limite inferior precisa ser menor que o superior" };
  }

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    target_low: low,
    target_high: high,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[configuracoes]", error);
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }

  refresh();
  return { ok: true, message: "Faixa alvo salva" };
}
