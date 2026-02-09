import { Eye } from "lucide-react";
import { formatDateDisplay } from "@/lib/date";
import { getRowStatus, type HarvestSummaryRow, type HarvestRowStatus } from "@/lib/harvest";
import { cn } from "@/lib/utils";

const formatNum = (n: number | null | undefined, decimals = 2) =>
  n != null ? (decimals === 0 ? Math.round(n) : n.toFixed(decimals)) : "—";

/** Kritik uyarı stili: sol 4px şerit + hafif tint. danger > warning > ok. */
const ROW_STATUS_CLASS: Record<HarvestRowStatus, string> = {
  danger: "border-l-4 border-l-destructive bg-destructive/10",
  warning: "border-l-4 border-l-warning bg-warning/10",
  ok: "border-l-4 border-l-success bg-success/10",
};

function getRowClassName(row: HarvestSummaryRow): string {
  return ROW_STATUS_CLASS[getRowStatus(row)] ?? "";
}

interface HarvestSummaryTableCompactProps {
  rows: HarvestSummaryRow[];
  onView: (id: string) => void;
}

export function HarvestSummaryTableCompact({ rows, onView }: HarvestSummaryTableCompactProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Filtreye uyan hasat kaydı yok.
      </p>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="sticky top-0 z-[19] border-b border-border bg-background">
          <th className="text-left py-1.5 px-2 font-medium text-foreground">Tarih</th>
          <th className="text-left py-1.5 px-2 font-medium text-foreground">Tüccar</th>
          <th className="text-right py-1.5 px-2 font-medium text-foreground">Toplam (kg)</th>
          <th className="text-right py-1.5 px-2 font-medium text-foreground">Fiyat (TL/kg)</th>
          <th className="text-right py-1.5 px-2 font-medium text-foreground">Toplam Tutar (TL)</th>
          <th className="w-8 py-1.5 px-1" aria-label="İnceleme" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            className={cn(
              "border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors",
              getRowClassName(r)
            )}
          >
            <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">
              {formatDateDisplay(r.harvest_date)}
            </td>
            <td className="py-1 px-2 text-foreground truncate max-w-[100px]" title={r.trader_name}>
              {r.trader_name || "—"}
            </td>
            <td className="py-1 px-2 text-right tabular-nums">{formatNum(r.total_kg, 0)}</td>
            <td className="py-1 px-2 text-right tabular-nums">{formatNum(r.sale_price)}</td>
            <td className="py-1 px-2 text-right tabular-nums">
              {r.total_amount != null && r.sale_price > 0 ? formatNum(r.total_amount) : "—"}
            </td>
            <td className="py-1 px-1">
              <button
                type="button"
                onClick={() => onView(r.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="İncele"
              >
                <Eye className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
