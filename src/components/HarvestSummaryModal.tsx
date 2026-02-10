import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, X, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateDisplay } from "@/lib/date";
import {
  getRowStatus,
  getDefaultHarvestYear,
  type HarvestSummaryRow,
  type HarvestSummaryTotals,
  type HarvestRowStatus,
} from "@/lib/harvest";
import { cn } from "@/lib/utils";

const formatNum = (n: number | null | undefined, decimals = 2) =>
  n != null ? (decimals === 0 ? Math.round(n) : n.toFixed(decimals)) : "—";
const formatPct = (n: number | null | undefined) =>
  n != null ? `%${n.toFixed(1)}` : "—";

/** Campus column: UI-only short names. Does not change stored/DB values. */
const CAMPUS_DISPLAY_MAP: Record<string, string> = {
  "Belek Kampüsü": "Belek",
  "Manavgat Kampüsü": "Manavgat",
  "Çandır Kampüsü": "Çandır",
};
function formatCampusShort(campusName: string | null | undefined): string {
  if (campusName == null || campusName === "") return "—";
  return CAMPUS_DISPLAY_MAP[campusName] ?? campusName;
}

// --- CSV export helpers (ASCII labels, comma decimals) ---
function csvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function toCsvRow(arr: unknown[]): string {
  return arr.map(csvCell).join(";");
}
function formatDateOnlyCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    if (val.includes("T") && val.length >= 10) return val.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  }
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return String(val);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
/** Export için: 33.3 gibi değerleri bozmaz; sadece TR formatında (1.234,56) noktayı siler. */
function toNumberCsv(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val !== "string") return null;
  let s = val.trim();
  if (!s || s === "—" || s === "-") return null;
  s = s.replace(/%/g, "").trim();
  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (s.includes(",") && !s.includes(".")) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function format1dpComma(val: unknown): string {
  const n = toNumberCsv(val);
  if (n === null) return "";
  return n.toFixed(1).replace(".", ",");
}
function format0dpCsv(val: unknown): string {
  const n = toNumberCsv(val);
  if (n === null) return "";
  return String(Math.round(n));
}
function trToAscii(s: string): string {
  return s
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
}

/** Güvenli sayı parse: null/undefined/"—"/"-"/TR formatı. */
function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const s = val.trim();
    if (!s || s === "—" || s === "-") return null;
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Kritik uyarı stili: sol 4px şerit + hafif tint. danger > warning > ok. */
const ROW_STATUS_CLASS: Record<HarvestRowStatus, string> = {
  danger: "border-l-4 border-l-destructive bg-destructive/10",
  warning: "border-l-4 border-l-warning bg-warning/10",
  ok: "border-l-4 border-l-success bg-success/10",
};

function getRowClassName(row: HarvestSummaryRow): string {
  return ROW_STATUS_CLASS[getRowStatus(row)] ?? "";
}

function getYearFromDate(dateStr: string): number {
  if (!dateStr || dateStr.length < 4) return 0;
  const y = parseInt(dateStr.slice(0, 4), 10);
  return Number.isNaN(y) ? 0 : y;
}

/** Modal'da kullanılan toplam tipi: scale_diff/scale_gap null olabilir, oran toplamı eklendi. */
type ModalTotals = Omit<
  HarvestSummaryTotals,
  "sum_scale_diff" | "sum_scale_gap"
> & {
  sum_scale_diff: number | null;
  sum_scale_gap: number | null;
  scale_diff_pct_total: number | null;
};

function calcTotals(rows: HarvestSummaryRow[]): ModalTotals {
  const sumGrade1 = rows.reduce((s, r) => s + (r.grade1_kg ?? 0), 0);
  const sumGrade2 = rows.reduce((s, r) => s + (r.grade2_kg ?? 0), 0);
  const sumTotalKg = rows.reduce((s, r) => s + (r.total_kg ?? 0), 0);
  const sumFull = rows.reduce((s, r) => s + (r.scale_full_kg ?? 0), 0);
  const sumEmpty = rows.reduce((s, r) => s + (r.scale_empty_kg ?? 0), 0);
  const sumGrade1Total = rows.reduce((s, r) => s + (r.grade1_total ?? 0), 0);
  const sumGrade2Total = rows.reduce((s, r) => s + (r.grade2_total ?? 0), 0);
  const sumNetTotal = rows.reduce((s, r) => s + (r.net_total ?? 0), 0);
  const secondRatioTotal =
    sumTotalKg > 0 ? (sumGrade2 / sumTotalKg) * 100 : null;
  const avgPrice = sumTotalKg > 0 ? sumNetTotal / sumTotalKg : null;

  const scaleDiffValues = rows
    .map((r) => toNumber(r.scale_diff))
    .filter((n): n is number => n !== null);
  const sumScaleDiff =
    scaleDiffValues.length > 0 ? scaleDiffValues.reduce((a, b) => a + b, 0) : null;

  const scaleGapValues = rows
    .map((r) => toNumber(r.scale_gap))
    .filter((n): n is number => n !== null);
  const sumScaleGap =
    scaleGapValues.length > 0 ? scaleGapValues.reduce((a, b) => a + b, 0) : null;

  const rowsWithKantarFarkPct = rows.filter(
    (r) =>
      toNumber(r.scale_diff) != null &&
      (r.scale_diff ?? 0) > 0 &&
      toNumber(r.scale_gap) != null
  );
  const sumAbsScaleGap = rowsWithKantarFarkPct.reduce(
    (s, r) => s + Math.abs(r.scale_gap ?? 0),
    0
  );
  const sumScaleDiffForPct = rowsWithKantarFarkPct.reduce(
    (s, r) => s + (r.scale_diff ?? 0),
    0
  );
  const scale_diff_pct_total =
    sumScaleDiffForPct > 0 ? (sumAbsScaleGap / sumScaleDiffForPct) * 100 : null;

  return {
    sum_grade1: sumGrade1,
    sum_grade2: sumGrade2,
    sum_total_kg: sumTotalKg,
    sum_full: sumFull,
    sum_empty: sumEmpty,
    sum_scale_diff: sumScaleDiff,
    second_ratio_total: secondRatioTotal,
    sum_scale_gap: sumScaleGap,
    avg_price: avgPrice,
    sum_grade1_total: sumGrade1Total,
    sum_grade2_total: sumGrade2Total,
    sum_net_total: sumNetTotal,
    scale_diff_pct_total,
  };
}

const MODAL_YEAR_MIN = 2026;
const MODAL_YEAR_MAX = 2030;

function getModalYearOptions(): number[] {
  return Array.from(
    { length: MODAL_YEAR_MAX - MODAL_YEAR_MIN + 1 },
    (_, i) => MODAL_YEAR_MIN + i
  );
}

function getModalDefaultYear(initialYear?: number): number {
  const current = initialYear ?? new Date().getFullYear();
  if (current >= MODAL_YEAR_MIN && current <= MODAL_YEAR_MAX) return current;
  if (current < MODAL_YEAR_MIN) return MODAL_YEAR_MIN;
  return MODAL_YEAR_MAX;
}

interface HarvestSummaryModalProps {
  open: boolean;
  onClose: () => void;
  rows: HarvestSummaryRow[];
  totals: HarvestSummaryTotals;
  onView?: (id: string) => void;
  /** Initial year for filter (e.g. from parent's summary filters). Defaults to current year. */
  initialYear?: number;
  /** When user changes year in modal, parent should refetch with this year. */
  onYearChange?: (year: number) => void;
}

export function HarvestSummaryModal({
  open,
  onClose,
  rows,
  totals: _totals,
  onView,
  initialYear,
  onYearChange,
}: HarvestSummaryModalProps) {
  const navigate = useNavigate();
  const defaultYear = getModalDefaultYear(initialYear);
  const [filters, setFilters] = useState({
    campus: "all",
    garden: "all",
    trader: "all",
    year: String(defaultYear),
  });

  const yearOptions = useMemo(() => getModalYearOptions(), []);

  useEffect(() => {
    if (open && initialYear != null) {
      setFilters((prev) => ({ ...prev, year: String(initialYear) }));
    }
  }, [open, initialYear]);

  const filterOptions = useMemo(() => {
    const campuses = Array.from(
      new Set(rows.map((r) => r.campus_name || "").filter(Boolean))
    ).sort();
    const gardensByCampus =
      filters.campus === "all"
        ? Array.from(new Set(rows.map((r) => r.garden_name || "").filter(Boolean))).sort()
        : Array.from(
            new Set(
              rows
                .filter((r) => (r.campus_name || "") === filters.campus)
                .map((r) => r.garden_name || "")
                .filter(Boolean)
            )
          ).sort();
    const traders = Array.from(
      new Set(rows.map((r) => r.trader_name || "").filter(Boolean))
    ).sort();
    return { campuses, gardensByCampus, traders };
  }, [rows, filters.campus]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filters.campus !== "all" && (r.campus_name || "") !== filters.campus)
        return false;
      if (filters.garden !== "all" && (r.garden_name || "") !== filters.garden)
        return false;
      if (filters.trader !== "all" && (r.trader_name || "") !== filters.trader)
        return false;
      if (
        filters.year !== "all" &&
        String(getYearFromDate(r.harvest_date)) !== filters.year
      )
        return false;
      return true;
    });
  }, [rows, filters]);

  const totals = useMemo(() => calcTotals(filteredRows), [filteredRows]);

  const handleView = (id: string) => {
    onClose();
    if (onView) {
      onView(id);
    } else {
      navigate(`/hasat/${id}`);
    }
  };

  const handleCsvExport = () => {
    const dataRows = filteredRows ?? [];
    const lines: string[] = [];
    lines.push("sep=;");
    lines.push("HASAT ICMALI DETAY");
    lines.push("");

    const headerRow = toCsvRow([
      "Kesim Tarihi",
      "Tuccar",
      "Kampus",
      "Bahce",
      "1. Kalite (kg)",
      "2. Kalite (kg)",
      "Toplam (kg)",
      "Kantar Dolu (kg)",
      "Kantar Bos (kg)",
      "Kantar Farki (kg)",
      "Ikinci Oran (%)",
      "Kantar Farki (%)",
      "Fiyat (TL/kg)",
      "1. Kalite Tutar (TL)",
      "2. Kalite Tutar (TL)",
      "Toplam Tutar (TL)",
    ]);
    lines.push(headerRow);

    dataRows.forEach((r) => {
      const secondRatio =
        r.second_ratio != null ? format1dpComma(r.second_ratio) : "";
      const scaleDiffPct =
        r.scale_diff_pct != null ? format1dpComma(r.scale_diff_pct) : "";
      lines.push(
        toCsvRow([
          formatDateOnlyCsv(r.harvest_date),
          trToAscii(String(r.trader_name ?? "")),
          trToAscii(String(r.campus_name ?? "")),
          trToAscii(String(r.garden_name ?? "")),
          r.grade1_kg ?? "",
          r.grade2_kg ?? "",
          r.total_kg ?? "",
          r.scale_full_kg ?? "",
          r.scale_empty_kg ?? "",
          r.scale_diff ?? "",
          secondRatio,
          scaleDiffPct,
          r.sale_price ?? "",
          r.grade1_total ?? "",
          r.grade2_total ?? "",
          r.net_total ?? "",
        ])
      );
    });

    const totalRow = toCsvRow([
      "TOTAL",
      "",
      "",
      "",
      format0dpCsv(totals.sum_grade1),
      format0dpCsv(totals.sum_grade2),
      format0dpCsv(totals.sum_total_kg),
      format0dpCsv(totals.sum_full),
      format0dpCsv(totals.sum_empty),
      format0dpCsv(totals.sum_scale_diff),
      format1dpComma(totals.second_ratio_total),
      format1dpComma(totals.scale_diff_pct_total),
      "",
      format0dpCsv(totals.sum_grade1_total),
      format0dpCsv(totals.sum_grade2_total),
      format0dpCsv(totals.sum_net_total),
    ]);
    lines.push(totalRow);

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const fileName =
      "hasat-icmali-detay-" +
      now.toISOString().slice(0, 16).replace("T", "-") +
      ".csv";
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const cellPad = "py-1.5 px-2";
  const thPad = "py-1.5 px-2";
  const stickyDateCell = "sticky left-0 z-20 w-[100px] min-w-[100px] border-r border-border shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] bg-card";
  const stickyDateHeader = "sticky left-0 z-30 w-[100px] min-w-[100px] bg-card border-r border-border shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden [&>button.absolute]:hidden">
        <DialogHeader className="shrink-0 p-4 pb-2 border-b flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-base font-semibold">Hasat İcmali (Detay)</DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCsvExport}
              title="CSV Export"
              disabled={filteredRows.length === 0}
              className="h-9 w-9"
            >
              <Download className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-full"
              aria-label="Kapat"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* Filtreler */}
        <div className="shrink-0 p-3 border-b border-border">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select
              value={filters.campus}
              onValueChange={(v) =>
                setFilters((prev) => ({
                  ...prev,
                  campus: v,
                  garden: "all",
                }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Kampüs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {filterOptions.campuses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.garden}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, garden: v }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Bahçe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {filterOptions.gardensByCampus.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.trader}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, trader: v }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Tüccar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {filterOptions.traders.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.year}
              onValueChange={(v) => {
                const y = Number(v);
                onYearChange?.(y);
                setFilters((prev) => ({ ...prev, year: v }));
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Yıl" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tablo: horizontal scroll; only first column (Kesim Tarihi) sticky */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="mt-0 rounded-b-xl border border-t-0 border-border bg-card overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
              <thead>
                <tr className="sticky top-0 z-20 bg-card shadow-sm border-b border-border">
                  <th className={cn("text-left font-medium text-foreground truncate", thPad, stickyDateHeader)}>Kesim Tarihi</th>
                  <th className={cn("text-left font-medium text-foreground truncate bg-card", thPad)}>Kampüs</th>
                  <th className={cn("text-left font-medium text-foreground truncate bg-card", thPad)}>Bahçe</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>1.kalite(kg)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>2.kalite(kg)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>toplam(kg)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>dolu(kg)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>boş(kg)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>fark(kg)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>2.oran(%)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>kantar fark(kg)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>kantar fark(%)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>fiyat(TL)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>1.toplam(TL)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>2.toplam(TL)</th>
                  <th className={cn("text-right font-medium text-foreground truncate bg-card", thPad)}>kdv hariç(TL)</th>
                  <th className={cn("py-1.5 px-1 bg-card", thPad)} aria-label="İnceleme" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors",
                      getRowClassName(r)
                    )}
                  >
                    <td className={cn("text-muted-foreground truncate", cellPad, stickyDateCell)} title={formatDateDisplay(r.harvest_date)}>
                      {formatDateDisplay(r.harvest_date)}
                    </td>
                    <td className={cn("text-muted-foreground truncate", cellPad)} title={r.campus_name || undefined}>
                      {formatCampusShort(r.campus_name)}
                    </td>
                    <td className={cn("text-muted-foreground truncate", cellPad)} title={r.garden_name || undefined}>
                      {r.garden_name || "—"}
                    </td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.grade1_kg, 0)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.grade2_kg, 0)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.total_kg, 0)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.scale_full_kg, 0)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.scale_empty_kg, 0)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.scale_diff, 0)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{r.second_ratio != null ? formatPct(r.second_ratio) : "—"}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.scale_gap, 0)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{r.scale_diff_pct != null ? formatPct(r.scale_diff_pct) : "—"}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.sale_price)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.grade1_total)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{formatNum(r.grade2_total)}</td>
                    <td className={cn("text-right tabular-nums whitespace-nowrap", cellPad)}>{r.total_amount != null && r.sale_price > 0 ? formatNum(r.net_total) : "—"}</td>
                    <td className="py-1.5 px-2">
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
                <tr className="sticky bottom-0 z-20 border-t-2 border-border bg-card font-medium shadow-[0_-1px_0_rgba(0,0,0,0.08)]">
                  <td className={cn("text-foreground", cellPad, stickyDateHeader)} colSpan={1}>Toplam</td>
                  <td className={cn("text-foreground bg-card", cellPad)} colSpan={1} />
                  <td className={cn("text-foreground bg-card", cellPad)} colSpan={1}>{filteredRows.length} kayıt</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_grade1)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_grade2)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_total_kg)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_full)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_empty)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_scale_diff)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{totals.second_ratio_total != null ? formatPct(totals.second_ratio_total) : "—"}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_scale_gap)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{totals.scale_diff_pct_total != null ? formatPct(totals.scale_diff_pct_total) : "—"}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{totals.avg_price != null ? formatNum(totals.avg_price) : "—"}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_grade1_total)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_grade2_total)}</td>
                  <td className={cn("text-right tabular-nums bg-card whitespace-nowrap", cellPad)}>{formatNum(totals.sum_net_total)}</td>
                  <td className="py-1.5 px-2 bg-card" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
