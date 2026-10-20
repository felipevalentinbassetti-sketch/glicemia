import { formatNumber, type DaySummary } from "@/lib/glucose";

export type DayTotals = { bolus: number; basal: number; carbs: number };

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });

// Resumo dia a dia; insulina e carboidratos aparecem quando informados
export function DailyTable({
  days,
  totals,
}: {
  days: DaySummary[];
  totals?: Map<string, DayTotals>;
}) {
  if (days.length === 0) return <p className="text-sm text-muted">Sem dados no período.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[32rem] text-left text-sm tabular-nums">
        <thead className="bg-background text-xs text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Dia</th>
            <th className="px-3 py-2 font-medium">Média</th>
            <th className="px-3 py-2 font-medium">Mín–Máx</th>
            <th className="px-3 py-2 font-medium">No alvo</th>
            <th className="px-3 py-2 font-medium">Abaixo</th>
            {totals && (
              <>
                <th className="px-3 py-2 font-medium">Bolus</th>
                <th className="px-3 py-2 font-medium">Basal</th>
                <th className="px-3 py-2 font-medium">Carbo</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((d) => {
            const tot = totals?.get(d.day);
            return (
              <tr key={d.day} className="border-t border-border">
                {/* d.day já é a data local; formata como UTC para não deslocar o dia */}
                <td className="whitespace-nowrap px-3 py-2">{weekday.format(new Date(`${d.day}T12:00:00Z`))}</td>
                <td className="px-3 py-2">{formatNumber(d.mean)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {d.min}–{d.max}
                </td>
                <td className="px-3 py-2">{formatNumber(d.inRange)}%</td>
                <td className="px-3 py-2">{formatNumber(d.below)}%</td>
                {totals && (
                  <>
                    <td className="px-3 py-2">{tot?.bolus ? `${formatNumber(tot.bolus, 1)} U` : "—"}</td>
                    <td className="px-3 py-2">{tot?.basal ? `${formatNumber(tot.basal, 1)} U` : "—"}</td>
                    <td className="px-3 py-2">{tot?.carbs ? `${formatNumber(tot.carbs)} g` : "—"}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
