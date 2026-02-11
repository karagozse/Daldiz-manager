import { Eye } from "lucide-react";
import { formatDateDisplay } from "@/lib/date";
import { getRowStatus, type HarvestSummaryRow, type HarvestRowStatus } from "@/lib/harvest";
import { cn } from "@/lib/utils";

/** Integer only (e.g. Kg column). */
const formatInt = (n: number | null | undefined) =>
  n != null ? String(Math.round(n)) : "—";

/** TL/Kg and Tutar: up to 2 decimals, trim trailing zeros. Used only in this table. */
const formatTableNumber = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

/** Row-level status: left strip + background. */
const ROW_STATUS_CLASS: Record<HarvestRowStatus, string> = {
  danger: "border-l-4 border-l-destructive bg-destructive/10",
  warning: "border-l-4 border-l-warning bg-warning/10",
  ok: "border-l-4 border-l-success bg-success/10",
};

function getRowClassName(row: HarvestSummaryRow): string {
  return ROW_STATUS_CLASS[getRowStatus(row)] ?? "";
}

/** Columns: Tarih | Bahçe | Tüccar | Kg | TL/Kg | Tutar(TL) | icon. Tarih/Bahçe dar, Tüccar esnek; sayısal kolonlar aynı. */
const GRID_COLUMNS = "80px 76px minmax(0,1fr) 44px 48px 58px 28px";

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
    <div
      className="w-full min-w-0 text-[13px] leading-tight border-b border-border"
      style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS }}
    >
      {/* Header row: Tarih | Bahçe | Tüccar | Kg | TL/Kg | Tutar(TL) | icon */}
      <div className="sticky top-0 z-[2] flex items-center pl-2.5 pr-1.5 py-1.5 h-9 font-medium text-[14px] text-foreground bg-background border-b border-border text-left whitespace-nowrap min-w-0">
        Tarih
      </div>
      <div className="sticky top-0 z-[2] flex items-center pl-1.5 pr-2.5 py-1.5 h-9 font-medium text-[14px] text-foreground bg-background border-b border-border text-left whitespace-nowrap min-w-0">
        Bahçe
      </div>
      <div className="sticky top-0 z-[2] flex items-center px-2.5 py-1.5 h-9 font-medium text-[14px] text-foreground bg-background border-b border-border text-left whitespace-nowrap min-w-0">
        Tüccar
      </div>
      <div className="sticky top-0 z-[2] flex items-center justify-end px-2.5 py-1.5 h-9 font-medium text-[14px] text-foreground bg-background border-b border-border text-right whitespace-nowrap">
        Kg
      </div>
      <div className="sticky top-0 z-[2] flex items-center justify-end px-2.5 py-1.5 h-9 font-medium text-[14px] text-foreground bg-background border-b border-border text-right whitespace-nowrap">
        TL/Kg
      </div>
      <div className="sticky top-0 z-[2] flex items-center justify-end px-2.5 py-1.5 h-9 font-medium text-[14px] text-foreground bg-background border-b border-border text-right whitespace-nowrap">
        Tutar(TL)
      </div>
      <div className="sticky top-0 z-[2] flex items-center justify-center px-2 py-1.5 h-9 font-medium text-[14px] text-foreground bg-background border-b border-border" aria-label="İnceleme">
        <span className="sr-only">İnceleme</span>
      </div>

      {/* Body rows: same grid template, row wrapper for background */}
      {rows.map((r) => (
        <div
          key={r.id}
          className={cn(
            "col-span-full grid border-b border-border h-7 hover:bg-muted/30 transition-colors",
            getRowClassName(r)
          )}
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          <div className="flex items-center pl-2.5 pr-1.5 py-1 text-muted-foreground text-left whitespace-nowrap min-w-0 bg-transparent overflow-hidden text-ellipsis" title={formatDateDisplay(r.harvest_date)}>
            {formatDateDisplay(r.harvest_date)}
          </div>
          <div className="flex items-center pl-1.5 pr-2.5 py-1 text-foreground text-left overflow-hidden text-ellipsis whitespace-nowrap min-w-0 bg-transparent" title={r.garden_name || undefined}>
            {r.garden_name || "—"}
          </div>
          <div className="flex items-center px-2.5 py-1 text-foreground text-left overflow-hidden text-ellipsis whitespace-nowrap min-w-0 bg-transparent" title={r.trader_name || undefined}>
            {r.trader_name || "—"}
          </div>
          <div className="flex items-center justify-end px-2.5 py-1 tabular-nums text-right overflow-hidden text-ellipsis whitespace-nowrap bg-transparent">
            {formatInt(r.total_kg)}
          </div>
          <div className="flex items-center justify-end px-2.5 py-1 tabular-nums text-right overflow-hidden text-ellipsis whitespace-nowrap bg-transparent">
            {formatTableNumber(r.sale_price)}
          </div>
          <div className="flex items-center justify-end px-2.5 py-1 tabular-nums text-right overflow-hidden text-ellipsis whitespace-nowrap bg-transparent">
            {r.total_amount != null && r.sale_price > 0 ? formatTableNumber(r.total_amount) : "—"}
          </div>
          <div className="flex items-center justify-center px-1 py-1 shrink-0 bg-transparent">
            <button
              type="button"
              onClick={() => onView(r.id)}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground inline-flex"
              aria-label="İncele"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
