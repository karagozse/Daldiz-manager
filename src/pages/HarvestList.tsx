import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {
  listHarvest,
  fetchHarvestSummary,
  getDefaultHarvestYear,
  type HarvestEntry,
  type HarvestSummaryFilters as HarvestSummaryFiltersType,
  type HarvestSummaryTotals,
  type HarvestSummaryRow,
} from "@/lib/harvest";
import { useToast } from "@/hooks/use-toast";
import { Plus, Maximize2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateDisplay, formatDateWithTime } from "@/lib/date";
import { HarvestSummaryFilters } from "@/components/HarvestSummaryFilters";
import { HarvestSummaryTableCompact } from "@/components/HarvestSummaryTableCompact";
import { HarvestSummaryModal } from "@/components/HarvestSummaryModal";
import { HarvestDetailModal } from "@/components/HarvestDetailModal";

/** Taslaklar listesi: en az 3 kart scroll yapmadan görünsün. */
const DRAFTS_BOX_MAX_H = "20rem";

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

function formatDateOnly(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    if (val.length >= 10 && val.includes("T")) return val.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  }
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return String(val);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const s = val.trim();
    if (!s || s === "—" || s === "-") return null;
    const cleaned = s.replace("%", "").trim();
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function format1dp(val: unknown): string {
  const n = toNumber(val);
  if (n === null) return "";
  return n.toFixed(1);
}

function format0dp(val: unknown): string {
  const n = toNumber(val);
  if (n === null) return "";
  return String(Math.round(n));
}

function format1dpComma(val: unknown): string {
  const n = toNumber(val);
  if (n === null) return "";
  return n.toFixed(1).replace(".", ",");
}

function HarvestIcmaliOzet({
  totals,
  rows,
}: {
  totals: HarvestSummaryTotals | null | undefined;
  rows: HarvestSummaryRow[] | null | undefined;
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const t = totals ?? null;
  const totalKg = t?.sum_total_kg ?? 0;
  const totalRevenue = t?.sum_net_total ?? 0;
  const avgPrice = totalKg > 0 ? totalRevenue / totalKg : null;
  const scaleRows = safeRows.filter(
    (r) => r?.scale_diff != null && r.scale_diff > 0
  );
  const sumScaleDiff = scaleRows.reduce((s, r) => s + (r.scale_diff ?? 0), 0);
  const sumScaleGap = scaleRows.reduce((s, r) => s + (r.scale_gap ?? 0), 0);
  const kantarFarkPct =
    scaleRows.length > 0 && sumScaleDiff > 0 && sumScaleGap != null
      ? (Math.abs(sumScaleGap) / sumScaleDiff) * 100
      : null;
  const kantarLabel =
    scaleRows.length === 0 ? "Yok" : kantarFarkPct != null ? `%${kantarFarkPct.toFixed(1)}` : "–";
  return (
    <table className="w-full text-sm leading-none">
      <tbody>
        <tr className="leading-tight">
          <td className="text-xs text-muted-foreground py-0.5 align-baseline">Toplam kg</td>
          <td className="text-right text-sm font-semibold py-0.5 align-baseline">{t?.sum_total_kg != null ? `${t.sum_total_kg} kg` : "–"}</td>
        </tr>
        <tr className="leading-tight">
          <td className="text-xs text-muted-foreground py-0.5 align-baseline">Ortalama fiyat (TL/kg)</td>
          <td className="text-right text-sm font-semibold py-0.5 align-baseline">{avgPrice != null ? avgPrice.toFixed(2) : "–"}</td>
        </tr>
        <tr className="leading-tight">
          <td className="text-xs text-muted-foreground py-0.5 align-baseline">2. oran (%)</td>
          <td className="text-right text-sm font-semibold py-0.5 align-baseline">
            {t?.second_ratio_total != null ? `%${t.second_ratio_total.toFixed(1)}` : "–"}
          </td>
        </tr>
        <tr className="leading-tight">
          <td className="text-xs text-muted-foreground py-0.5 align-baseline">Kantar farkı (%)</td>
          <td className="text-right text-sm font-semibold py-0.5 align-baseline">{kantarLabel}</td>
        </tr>
        <tr className="leading-tight">
          <td className="text-xs text-muted-foreground py-0.5 align-baseline">Toplam gelir (TL)</td>
          <td className="text-right text-sm font-semibold py-0.5 align-baseline">
            {t?.sum_net_total != null ? `${t.sum_net_total.toLocaleString("tr-TR")} TL` : "–"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const HarvestList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryFilters, setSummaryFilters] = useState<HarvestSummaryFiltersType>(() => ({
    year: getDefaultHarvestYear(),
  }));
  const [summaryData, setSummaryData] = useState<{
    rows: Awaited<ReturnType<typeof fetchHarvestSummary>>["rows"];
    totals: Awaited<ReturnType<typeof fetchHarvestSummary>>["totals"];
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [detailModalId, setDetailModalId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await listHarvest();
      setEntries(data?.items ?? []);
    } catch (e) {
      toast({
        title: "Hata",
        description: "Hasat listesi yüklenemedi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetchHarvestSummary(summaryFilters);
      setSummaryData({ rows: res.rows, totals: res.totals });
    } catch (e) {
      toast({
        title: "Hata",
        description: "Hasat icmal verisi yüklenemedi.",
        variant: "destructive",
      });
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryFilters, toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchList();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchList]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchSummary();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSummary]);

  const drafts = entries.filter((e) => e.status === "draft");

  const handleCsvExport = () => {
    const rows = summaryData?.rows ?? [];
    if (rows.length === 0) return;
    const t = summaryData?.totals ?? null;
    const totalKg = t?.sum_total_kg ?? 0;
    const totalIncome = t?.sum_net_total ?? 0;
    const avgPrice = totalKg > 0 && totalIncome != null ? totalIncome / totalKg : null;
    const secondQualityRate =
      t?.second_ratio_total != null ? t.second_ratio_total : null;
    const scaleRows = rows.filter(
      (r) => r?.scale_diff != null && r.scale_diff > 0
    );
    const sumScaleDiff = scaleRows.reduce((s, r) => s + (r.scale_diff ?? 0), 0);
    const sumScaleGap = scaleRows.reduce((s, r) => s + (r.scale_gap ?? 0), 0);
    const kantarRate =
      scaleRows.length > 0 && sumScaleDiff > 0 && sumScaleGap != null
        ? (Math.abs(sumScaleGap) / sumScaleDiff) * 100
        : null;

    const lines: string[] = [];
    lines.push("sep=;");
    lines.push("HASAT_ICMALI");
    lines.push("");
    lines.push(
      toCsvRow([
        "Tarih",
        "Tuccar",
        "Toplam_kg",
        "Fiyat_TL_kg",
        "Toplam_Tutar_TL",
      ])
    );
    rows.forEach((r) => {
      lines.push(
        toCsvRow([
          formatDateOnly(r.harvest_date),
          trToAscii(String(r.trader_name ?? "")),
          r.total_kg ?? "",
          r.sale_price ?? "",
          r.total_amount ?? "",
        ])
      );
    });
    lines.push("");
    lines.push("OZET");
    lines.push("");
    lines.push(toCsvRow(["Toplam_kg", format0dp(totalKg)]));
    lines.push(toCsvRow(["Toplam_gelir_TL", format0dp(totalIncome)]));
    lines.push(toCsvRow(["Ortalama_fiyat_TL_kg", format1dpComma(avgPrice)]));
    lines.push(toCsvRow(["Ikinci_oran_yuzde", format1dpComma(secondQualityRate)]));
    lines.push(toCsvRow(["Kantar_farki_yuzde", format1dpComma(kantarRate)]));

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const fileName =
      "hasat-icmali-" +
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

  return (
    <div
      className="min-h-0 bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - var(--bottom-tab-height, 80px) - env(safe-area-inset-bottom, 0px))" }}
    >
      <Header title="Hasat" />
      <main className="px-4 py-4 max-w-6xl mx-auto flex flex-col gap-4 w-full">
        <button
          type="button"
          onClick={() => navigate("/hasat/yeni")}
          className="w-full card-elevated p-4 flex items-center justify-center gap-2 text-primary font-medium hover:bg-primary/5 transition-colors shrink-0"
          aria-label="Yeni Hasat Gir"
        >
          <Plus size={20} />
          <span>Yeni Hasat Gir</span>
        </button>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Yükleniyor...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Taslaklar - tek kart, kritik uyarı ile aynı padding */}
            {drafts.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden p-0 shrink-0">
                <div className="px-4 py-3 border-b border-border bg-muted/20">
                  <p className="text-sm font-semibold text-foreground">Taslaklar</p>
                </div>
                <div
                  className="overflow-y-auto p-3 space-y-2"
                  style={{ maxHeight: DRAFTS_BOX_MAX_H }}
                >
                  {drafts.map((entry) => {
                    const gardenName = entry.garden?.name ?? `Bahçe #${entry.gardenId}`;
                    const arabaSuffix = entry.name.split(" - ").pop() ?? "";
                    const draftTitle = `${gardenName} - ${arabaSuffix}`;
                    const traderPart = (entry.traderName?.trim() ?? "") ? ` • ${entry.traderName.trim()}` : "";
                    const subtitle = `${formatDateWithTime(entry.date, entry.createdAt)}${traderPart}`;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => navigate(`/hasat/${entry.id}`)}
                        className="w-full text-left p-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground truncate min-w-0 text-sm">{draftTitle}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
                            Taslak
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-tight truncate">
                          {subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hasat İcmali - table and summary scroll together with page; same bottom gap as Dashboard (main py-4) */}
            <div className="rounded-xl border border-border bg-card overflow-hidden p-0">
              {/* A) Başlık + filtre */}
              <div className="flex-none">
                <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Hasat İcmali</p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCsvExport}
                      title="Excel'e Aktar"
                      disabled={!summaryData?.rows?.length}
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSummaryModalOpen(true)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Genişlet"
                      title="Detay tablosunu aç"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-card pt-1 pb-0">
                  <HarvestSummaryFilters
                    filters={summaryFilters}
                    onChange={setSummaryFilters}
                    defaultYear={getDefaultHarvestYear()}
                  />
                </div>
              </div>
              {/* B) Table + summary in flow (no inner scroll; page scrolls) */}
              {summaryLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Yükleniyor...
                </p>
              ) : summaryData ? (
                <>
                  <div className="overflow-x-hidden w-full">
                    <HarvestSummaryTableCompact
                      rows={summaryData.rows ?? []}
                      onView={(id) => setDetailModalId(id)}
                    />
                  </div>
                  <div className="bg-card border-t border-border/40 pt-1.5 pb-1.5 px-3">
                    <HarvestIcmaliOzet
                      totals={summaryData.totals ?? null}
                      rows={summaryData.rows ?? []}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Hasat icmal verisi yok.
                </p>
              )}
            </div>

            {summaryModalOpen && summaryData && (
              <HarvestSummaryModal
                open={summaryModalOpen}
                onClose={() => setSummaryModalOpen(false)}
                rows={summaryData.rows ?? []}
                totals={summaryData.totals}
                initialYear={summaryFilters.year ?? getDefaultHarvestYear()}
                onYearChange={(y) => setSummaryFilters((prev) => ({ ...prev, year: y }))}
                onView={(id) => {
                  setSummaryModalOpen(false);
                  setDetailModalId(id);
                }}
              />
            )}
            <HarvestDetailModal
              harvestId={detailModalId}
              open={detailModalId != null}
              onClose={() => setDetailModalId(null)}
              onRevised={() => {
                fetchList();
                fetchSummary();
              }}
            />

            {drafts.length === 0 && !summaryData?.rows?.length && (
              <p className="text-sm text-muted-foreground text-center py-8 shrink-0">
                Henüz hasat kaydı yok.
              </p>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default HarvestList;
