"use client";

import { useActionState, useState } from "react";
import { INTENSITIES, MEAL_TYPES, NOTE_CATEGORIES, type EventKind } from "@/lib/data";
import { FOODS } from "@/lib/foods";
import { addEntry, type FormState } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent sm:text-sm";
const labelClass = "block text-sm font-medium";

export function EntryForm({ kind, defaultMealType }: { kind: EventKind; defaultMealType: string }) {
  const [carbs, setCarbs] = useState("");
  const [description, setDescription] = useState("");

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      // datetime-local vem sem fuso; converte no navegador, que sabe o fuso do usuário
      const local = String(formData.get("at_local") ?? "");
      formData.set("at", local ? new Date(local).toISOString() : "");
      const result = await addEntry(prev, formData);
      if (result?.ok) {
        setCarbs("");
        setDescription("");
      }
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="kind" value={kind} />

      {kind === "insulin" && (
        <>
          <fieldset>
            <legend className={labelClass}>Tipo</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { value: "bolus", label: "Rápida (bolus)" },
                { value: "basal", label: "Basal (lenta)" },
              ].map((o, i) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-checked:border-accent has-checked:bg-accent/10"
                >
                  <input type="radio" name="insulin_kind" value={o.value} defaultChecked={i === 0} />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={labelClass}>
            Unidades
            <input
              name="units"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0.5"
              max="100"
              required
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Nome da insulina <span className="font-normal text-muted">(opcional)</span>
            <input name="insulin_name" list="insulinas" maxLength={60} className={inputClass} />
            <datalist id="insulinas">
              {["Fiasp", "NovoRapid", "Humalog", "Apidra", "Lantus", "Basaglar", "Toujeo", "Tresiba", "Levemir"].map(
                (n) => (
                  <option key={n} value={n} />
                ),
              )}
            </datalist>
          </label>
          <label className={labelClass}>
            Observação <span className="font-normal text-muted">(opcional)</span>
            <input name="note" maxLength={500} className={inputClass} />
          </label>
        </>
      )}

      {kind === "meal" && (
        <>
          <label className={labelClass}>
            Refeição
            <select name="meal_type" defaultValue={defaultMealType} className={inputClass}>
              {Object.entries(MEAL_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <FoodPicker
            onAdd={(food, qty) => {
              const grams = Math.round(food.carbs * qty * 10) / 10;
              setCarbs((c) => String(Math.round(((Number(c.replace(",", ".")) || 0) + grams) * 10) / 10));
              setDescription((d) => {
                const item = `${qty === 1 ? "" : `${qty}× `}${food.name}`;
                return d ? `${d}, ${item}` : item;
              });
            }}
          />

          <label className={labelClass}>
            Carboidratos (g)
            <input
              name="carbs_g"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="1000"
              required
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Descrição <span className="font-normal text-muted">(opcional)</span>
            <input
              name="description"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </label>
        </>
      )}

      {kind === "exercise" && (
        <>
          <label className={labelClass}>
            Exercício
            <input name="exercise_kind" list="exercicios" required maxLength={60} className={inputClass} />
            <datalist id="exercicios">
              {["Caminhada", "Corrida", "Musculação", "Bicicleta", "Natação", "Futebol", "Dança", "Yoga"].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Duração (min)
              <input
                name="duration_min"
                type="number"
                inputMode="numeric"
                min="1"
                max="1440"
                required
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Intensidade
              <select name="intensity" defaultValue="moderada" className={inputClass}>
                {Object.entries(INTENSITIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label[0].toUpperCase() + label.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={labelClass}>
            Observação <span className="font-normal text-muted">(opcional)</span>
            <input name="note" maxLength={500} className={inputClass} />
          </label>
        </>
      )}

      {kind === "note" && (
        <>
          <label className={labelClass}>
            Categoria
            <select name="category" defaultValue="outro" className={inputClass}>
              {Object.entries(NOTE_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Nota
            <textarea name="body" required maxLength={2000} rows={3} className={inputClass} />
          </label>
        </>
      )}

      <label className={labelClass}>
        Data e hora <span className="font-normal text-muted">(em branco = agora)</span>
        <input name="at_local" type="datetime-local" className={inputClass} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {state && !pending && (
          <p
            role="status"
            className={`text-sm ${state.ok ? "text-glucose-in-range" : "text-glucose-very-low"}`}
          >
            {state.ok ? "✓ " : "✕ "}
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function FoodPicker({ onAdd }: { onAdd: (food: (typeof FOODS)[number], qty: number) => void }) {
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState("1");

  const food = FOODS.find((f) => f.name.toLowerCase() === query.trim().toLowerCase());
  const quantity = Number(qty.replace(",", "."));

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="text-sm font-medium">Somar alimentos</p>
      <p className="text-xs text-muted">
        Valores aproximados (base TACO). Se houver rótulo, prefira ele.
      </p>
      <div className="mt-2 grid grid-cols-[1fr_5rem] gap-2">
        <input
          aria-label="Alimento"
          placeholder="Ex.: arroz, pão francês…"
          list="alimentos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inputClass.replace("mt-1 ", "")}
        />
        <datalist id="alimentos">
          {FOODS.map((f) => (
            <option key={f.name} value={f.name}>
              {f.portion} · {f.carbs} g
            </option>
          ))}
        </datalist>
        <input
          aria-label="Quantidade de porções"
          type="number"
          inputMode="decimal"
          min="0.5"
          step="0.5"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className={inputClass.replace("mt-1 ", "")}
        />
      </div>
      {food && (
        <p className="mt-2 text-xs text-muted">
          {food.portion}: {food.carbs} g por porção
          {quantity > 0 && quantity !== 1 && ` · ${Math.round(food.carbs * quantity * 10) / 10} g no total`}
        </p>
      )}
      <button
        type="button"
        disabled={!food || !(quantity > 0)}
        onClick={() => {
          if (!food || !(quantity > 0)) return;
          onAdd(food, quantity);
          setQuery("");
          setQty("1");
        }}
        className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50"
      >
        + Somar aos carboidratos
      </button>
    </div>
  );
}
