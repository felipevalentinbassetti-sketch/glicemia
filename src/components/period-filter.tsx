import Link from "next/link";
import { PERIOD_OPTIONS } from "@/lib/glucose";

// Filtro de período (uma linha acima de todo o conteúdo que ele afeta)
export function PeriodFilter({ basePath, days }: { basePath: string; days: number }) {
  return (
    <nav aria-label="Período" className="no-print inline-flex rounded-lg border border-border bg-surface p-0.5 text-sm">
      {PERIOD_OPTIONS.map((d) => (
        <Link
          key={d}
          href={`${basePath}?dias=${d}`}
          aria-current={d === days ? "page" : undefined}
          className={`rounded-md px-3 py-1 tabular-nums ${
            d === days ? "bg-foreground text-background" : "text-muted hover:text-foreground"
          }`}
        >
          {d} dias
        </Link>
      ))}
    </nav>
  );
}
