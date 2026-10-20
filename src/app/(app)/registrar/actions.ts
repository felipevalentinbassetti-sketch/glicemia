"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { INTENSITIES, MEAL_TYPES, NOTE_CATEGORIES, type EventKind } from "@/lib/data";

export type FormState = { ok: boolean; message: string } | null;

const TABLES: Record<EventKind, string> = {
  insulin: "insulin_doses",
  meal: "meals",
  exercise: "exercises",
  note: "notes",
};

class ValidationError extends Error {}

export async function addEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();

  try {
    const kind = formData.get("kind") as EventKind;
    const at = parseDate(formData.get("at"));
    let row: Record<string, unknown>;
    let message: string;

    switch (kind) {
      case "insulin": {
        const units = parseNumber(formData.get("units"), "Unidades", 0.1, 100);
        const type = oneOf(formData.get("insulin_kind"), ["bolus", "basal"], "Tipo de insulina");
        row = {
          taken_at: at,
          kind: type,
          units,
          insulin_name: optionalText(formData.get("insulin_name"), 60),
          note: optionalText(formData.get("note"), 500),
        };
        message = `${units} U registradas`;
        break;
      }
      case "meal": {
        const carbs = parseNumber(formData.get("carbs_g"), "Carboidratos", 0, 1000);
        row = {
          eaten_at: at,
          carbs_g: carbs,
          meal_type: oneOf(formData.get("meal_type"), Object.keys(MEAL_TYPES), "Refeição"),
          description: optionalText(formData.get("description"), 500),
        };
        message = `Refeição com ${carbs} g registrada`;
        break;
      }
      case "exercise": {
        const kindText = optionalText(formData.get("exercise_kind"), 60);
        if (!kindText) throw new ValidationError("Informe o tipo de exercício");
        row = {
          started_at: at,
          kind: kindText,
          duration_min: parseNumber(formData.get("duration_min"), "Duração", 1, 1440, true),
          intensity: oneOf(formData.get("intensity"), Object.keys(INTENSITIES), "Intensidade"),
          note: optionalText(formData.get("note"), 500),
        };
        message = "Exercício registrado";
        break;
      }
      case "note": {
        const body = optionalText(formData.get("body"), 2000);
        if (!body) throw new ValidationError("Escreva a nota");
        row = {
          noted_at: at,
          category: oneOf(formData.get("category"), Object.keys(NOTE_CATEGORIES), "Categoria"),
          body,
        };
        message = "Nota registrada";
        break;
      }
      default:
        throw new ValidationError("Tipo de registro inválido");
    }

    const { error } = await supabase.from(TABLES[kind]).insert(row);
    if (error) throw error;

    refresh();
    return { ok: true, message };
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, message: err.message };
    console.error("[registrar]", err);
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }
}

export async function deleteEntry(formData: FormData) {
  const { supabase } = await requireUser();

  const kind = formData.get("kind") as EventKind;
  const id = Number(formData.get("id"));
  if (!TABLES[kind] || !Number.isInteger(id)) return;

  // O RLS garante que só registros do próprio usuário podem ser apagados
  await supabase.from(TABLES[kind]).delete().eq("id", id);
  refresh();
}

function parseDate(value: FormDataEntryValue | null) {
  if (!value) return new Date().toISOString();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ValidationError("Data e hora inválidas");
  if (date.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new ValidationError("A data e hora não podem estar no futuro");
  }
  return date.toISOString();
}

function parseNumber(
  value: FormDataEntryValue | null,
  label: string,
  min: number,
  max: number,
  integer = false,
) {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new ValidationError(`${label}: informe um valor entre ${min} e ${max}`);
  }
  return n;
}

function oneOf(value: FormDataEntryValue | null, options: string[], label: string) {
  const v = String(value ?? "");
  if (!options.includes(v)) throw new ValidationError(`${label}: opção inválida`);
  return v;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  const v = String(value ?? "").trim();
  return v ? v.slice(0, max) : null;
}
