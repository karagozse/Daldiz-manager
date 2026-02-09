import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {
  listHarvest,
  fetchHarvestSummary,
  harvestTotalKg,
  harvestSecondRatio,
  isSecondRatioHigh,
  getDefaultHarvestYear,
  type HarvestEntry,
  type HarvestSummaryFilters as HarvestSummaryFiltersType,
  type HarvestSummaryTotals,
  type HarvestSummaryRow,
} from "@/lib/harvest";
import { useToast } from "@/hooks/use-toast";
import { Plus, Maximize2 } from "lucide-react";
import { formatDateDisplay } from "@/lib/date";
import { HarvestSummaryFilters } from "@/components/HarvestSummaryFilters";
import { HarvestSummaryTableCompact } from "@/components/HarvestSummaryTableCompact";
import { HarvestSummaryModal } from "@/components/HarvestSummaryModal";
import { HarvestDetailModal } from "@/components/HarvestDetailModal";

const DRAFTS_BOX_MAX_H = "12rem";

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
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">Özet</p>
      <table className="w-full text-sm">
        <tbody>
          <tr>
            <td className="text-muted-foreground py-0.5">Toplam kg</td>
            <td className="text-right">{t?.sum_total_kg != null ? `${t.sum_total_kg} kg` : "–"}</td>
          </tr>
          <tr>
            <td className="text-muted-foreground py-0.5">Toplam gelir (TL)</td>
            <td className="text-right">
              {t?.sum_net_total != null
                ? `${t.sum_net_total.toLocaleString("tr-TR")} TL`
                : "–"}
            </td>
          </tr>
          <tr>
            <td className="text-muted-foreground py-0.5">Ortalama fiyat (TL/kg)</td>
            <td className="text-right">
              {avgPrice != null ? `${avgPrice.toFixed(2)}` : "–"}
            </td>
          </tr>
          <tr>
            <td className="text-muted-foreground py-0.5">2. oran (%)</td>
            <td className="text-right">
              {t?.second_ratio_total != null ? `%${t.second_ratio_total.toFixed(1)}` : "–"}
            </td>
          </tr>
          <tr>
            <td className="text-muted-foreground py-0.5">Kantar farkı (%)</td>
            <td className="text-right">{kantarLabel}</td>
          </tr>
        </tbody>
      </table>
    </div>
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

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-background">
      <Header title="Hasat" />
      <main className="px-4 py-4 max-w-6xl mx-auto flex flex-col gap-4 flex-1 min-h-0 w-full overflow-hidden pb-24">
        <button
          onClick={() => navigate("/hasat/yeni")}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium shrink-0"
        >
          <Plus size={20} />
          Yeni Hasat Gir
        </button>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Yükleniyor...</p>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 gap-4">
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
                    const totalKgE = harvestTotalKg(entry);
                    const secondRatio = harvestSecondRatio(entry);
                    const ratioHigh = isSecondRatioHigh(entry);
                    const gardenName = entry.garden?.name ?? `Bahçe #${entry.gardenId}`;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => navigate(`/hasat/${entry.id}`)}
                        className="w-full text-left p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground truncate">{entry.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
                            Taslak
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDateDisplay(entry.date)} · {gardenName}
                        </div>
                        {(entry.traderName?.trim() ?? "") && (
                          <div className="text-xs text-muted-foreground">{entry.traderName}</div>
                        )}
                        {(totalKgE != null || secondRatio != null) && (
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
                            {totalKgE != null && <span>Toplam: {totalKgE} kg</span>}
                            {secondRatio != null && (
                              <span>
                                2. oran: %{secondRatio.toFixed(1)}
                                {ratioHigh && (
                                  <span className="ml-1 text-warning-foreground">(yüksek)</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hasat İcmali - 3 parça: header (filtre+tablo başlığı) | body (sadece satırlar scroll) | footer (özet sticky) */}
            <div className="rounded-xl border border-border bg-card overflow-hidden p-0 flex flex-col flex-1 min-h-0">
              {/* A) Başlık + sticky filtre - flex: 0 0 auto */}
              <div className="flex-none">
                <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Hasat İcmali</p>
                  <button
                    type="button"
                    onClick={() => setSummaryModalOpen(true)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Genişlet"
                    title="Detay tablosunu aç"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="sticky top-0 z-[20] bg-card pt-3">
<HarvestSummaryFilters
                  filters={summaryFilters}
                  onChange={setSummaryFilters}
                  defaultYear={getDefaultHarvestYear()}
                />
                </div>
              </div>
              {/* B) Sadece satırlar scroll - flex: 1 1 auto; min-height: 0; overflow-y: auto */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-4">
                {summaryLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-6 flex-none">
                    Yükleniyor...
                  </p>
                ) : summaryData ? (
                  <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain -mx-4 px-4"
                    style={{ minHeight: 0 }}
                  >
                    <HarvestSummaryTableCompact
                      rows={summaryData.rows ?? []}
                      onView={(id) => setDetailModalId(id)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 flex-none">
                    Hasat icmal verisi yok.
                  </p>
                )}
              </div>
              {/* C) Özet - flex: 0 0 auto; sticky bottom; tab bar üstünde */}
              {summaryData && (
                <div className="sticky bottom-0 z-[20] flex-none bg-card border-t border-border pt-3 px-4 pb-4">
                  <HarvestIcmaliOzet
                    totals={summaryData.totals ?? null}
                    rows={summaryData.rows ?? []}
                  />
                </div>
              )}
            </div>

            {summaryModalOpen && summaryData && (
              <HarvestSummaryModal
                open={summaryModalOpen}
                onClose={() => setSummaryModalOpen(false)}
                rows={summaryData.rows ?? []}
                totals={summaryData.totals}
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
