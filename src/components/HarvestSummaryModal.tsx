import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateDisplay } from "@/lib/date";
import { getRowStatus, type HarvestSummaryRow, type HarvestSummaryTotals, type HarvestRowStatus } from "@/lib/harvest";
import { cn } from "@/lib/utils";

const formatNum = (n: number | null | undefined, decimals = 2) =>
  n != null ? (decimals === 0 ? Math.round(n) : n.toFixed(decimals)) : "—";
const formatPct = (n: number | null | undefined) =>
  n != null ? `%${n.toFixed(1)}` : "—";

/** Kritik uyarı stili: sol 4px şerit + hafif tint. danger > warning > ok. */
const ROW_STATUS_CLASS: Record<HarvestRowStatus, string> = {
  danger: "border-l-4 border-l-destructive bg-destructive/10",
  warning: "border-l-4 border-l-warning bg-warning/10",
  ok: "border-l-4 border-l-success bg-success/10",
};

function getRowClassName(row: HarvestSummaryRow): string {
  return ROW_STATUS_CLASS[getRowStatus(row)] ?? "";
}

interface HarvestSummaryModalProps {
  open: boolean;
  onClose: () => void;
  rows: HarvestSummaryRow[];
  totals: HarvestSummaryTotals;
  onView?: (id: string) => void;
}

export function HarvestSummaryModal({
  open,
  onClose,
  rows,
  totals,
  onView,
}: HarvestSummaryModalProps) {
  const navigate = useNavigate();

  const handleView = (id: string) => {
    onClose();
    if (onView) {
      onView(id);
    } else {
      navigate(`/hasat/${id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 p-4 pb-2 border-b flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-base font-semibold">Hasat İcmali (Detay)</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full"
            aria-label="Kapat"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Kesim Tarihi
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Kampüs
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Bahçe
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Tüccar
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    1.kalite
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    2.kalite
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Toplam
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Dolu
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Boş
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Fark
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    2.Oran
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Kantar Fark
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Kantar farkı %
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Fiyat
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    1.Toplam
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    2.Toplam
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-foreground whitespace-nowrap">
                    Kdv Hariç
                  </th>
                  <th className="w-9 py-2 px-1" aria-label="İnceleme" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors",
                      getRowClassName(r)
                    )}
                  >
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {formatDateDisplay(r.harvest_date)}
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {r.campus_name || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {r.garden_name || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-foreground whitespace-nowrap">
                      {r.trader_name || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.grade1_kg)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.grade2_kg)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.total_kg)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.scale_full_kg)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.scale_empty_kg)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.scale_diff)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {r.second_ratio != null ? formatPct(r.second_ratio) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.scale_gap)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {r.scale_diff_pct != null ? formatPct(r.scale_diff_pct) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.sale_price)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.grade1_total)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNum(r.grade2_total)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {r.total_amount != null && r.sale_price > 0
                        ? formatNum(r.net_total)
                        : "—"}
                    </td>
                    <td className="py-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => handleView(r.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="İncele"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-medium sticky bottom-0">
                  <td className="py-2 px-2 text-foreground" colSpan={4}>
                    Toplam
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_grade1)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_grade2)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_total_kg)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_full)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_empty)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_scale_diff)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {totals.second_ratio_total != null
                      ? formatPct(totals.second_ratio_total)
                      : "—"}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_scale_gap)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">—</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {totals.avg_price != null ? formatNum(totals.avg_price) : "—"}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_grade1_total)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_grade2_total)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatNum(totals.sum_net_total)}
                  </td>
                  <td className="py-2 px-1" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
