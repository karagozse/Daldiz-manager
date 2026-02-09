import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getHarvest, type HarvestEntry } from "@/lib/harvest";
import {
  harvestTotalKg,
  harvestSecondRatio,
  harvestScaleFull,
  harvestScaleEmpty,
  harvestRevenue,
} from "@/lib/harvest";
import { getPhotoUrl } from "@/lib/photoUtils";
import { formatDateDisplay } from "@/lib/date";
import { useApp } from "@/contexts/AppContext";

interface HarvestDetailModalProps {
  harvestId: string | null;
  open: boolean;
  onClose: () => void;
}

export function HarvestDetailModal({ harvestId, open, onClose }: HarvestDetailModalProps) {
  const { gardens } = useApp();
  const [entry, setEntry] = useState<HarvestEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !harvestId) {
      setEntry(null);
      return;
    }
    setLoading(true);
    getHarvest(harvestId)
      .then(setEntry)
      .catch(() => setEntry(null))
      .finally(() => setLoading(false));
  }, [open, harvestId]);

  if (!open) return null;

  const WARN_PCT = 5;
  const totalKg = entry ? harvestTotalKg(entry) : null;
  const secondRatio = entry ? harvestSecondRatio(entry) : null;
  const ratioHigh = secondRatio != null && secondRatio > WARN_PCT;
  const scaleFull = entry ? harvestScaleFull(entry) : null;
  const scaleEmpty = entry ? harvestScaleEmpty(entry) : null;
  const netKantarKg =
    scaleFull != null && scaleEmpty != null ? scaleFull - scaleEmpty : null;
  const kantarFarkKg =
    netKantarKg != null && totalKg != null ? netKantarKg - totalKg : null;
  const kantarFarkYuzde =
    netKantarKg != null &&
    netKantarKg > 0 &&
    kantarFarkKg != null
      ? (Math.abs(kantarFarkKg) / netKantarKg) * 100
      : null;
  const kantarFarkHigh = kantarFarkYuzde != null && kantarFarkYuzde > WARN_PCT;
  const revenue = entry ? harvestRevenue(entry) : null;
  const gardenName =
    gardens?.find((g) => g.id === entry?.gardenId)?.name ??
    entry?.garden?.name ??
    (entry ? `#${entry.gardenId}` : "");

  const traderSlipPhotos = entry?.photos?.filter((p) => p.category === "TRADER_SLIP") ?? [];
  const generalPhotos = entry?.photos?.filter((p) => p.category === "GENERAL") ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 p-4 pb-2 border-b flex flex-row items-center justify-between gap-2 bg-card">
          <DialogTitle className="text-base font-semibold">Hasat Detayı</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full"
            aria-label="Kapat"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : !entry ? (
          <div className="p-8 text-center text-muted-foreground">Hasat bulunamadı.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {/* Kapanmış bilgisi */}
            <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-foreground">
              Hasat kapanmıştır. Düzenleme yapılamaz.
            </div>

            {/* Özet - EN ÜSTTE (form ile aynı) */}
            <div className="border rounded-xl p-4 space-y-2 bg-card">
              <p className="text-sm font-semibold text-foreground">Özet</p>
              <table className="w-full text-sm">
                <tbody>
                  {entry.grade1Kg != null && (
                    <tr>
                      <td className="text-muted-foreground py-0.5">1. kalite</td>
                      <td className="text-right">{entry.grade1Kg} kg</td>
                    </tr>
                  )}
                  {entry.grade2Kg != null && (
                    <tr>
                      <td className="text-muted-foreground py-0.5">2. kalite</td>
                      <td className="text-right">{entry.grade2Kg} kg</td>
                    </tr>
                  )}
                  {totalKg != null && (
                    <tr>
                      <td className="font-medium py-0.5">Toplam</td>
                      <td className="text-right">{totalKg} kg</td>
                    </tr>
                  )}
                  {secondRatio != null && (
                    <tr className={ratioHigh ? "bg-warning/10" : undefined}>
                      <td className="text-muted-foreground py-0.5">2. oran</td>
                      <td className="text-right">%{secondRatio.toFixed(1)}</td>
                    </tr>
                  )}
                  {(kantarFarkKg != null || netKantarKg != null) && (
                    <tr className={kantarFarkHigh ? "bg-destructive/10" : undefined}>
                      <td className="text-muted-foreground py-0.5">Kantar farkı</td>
                      <td className="text-right">
                        {kantarFarkKg != null && (
                          <>
                            {kantarFarkKg >= 0 ? "+" : "−"}
                            {Math.abs(kantarFarkKg).toFixed(1)} kg
                          </>
                        )}
                        {kantarFarkYuzde != null && (
                          <span className="ml-1 text-muted-foreground">
                            (%{kantarFarkYuzde.toFixed(1)})
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                  {revenue != null && (
                    <tr>
                      <td className="font-medium py-0.5">Tahmini gelir</td>
                      <td className="text-right">{revenue.toFixed(2)} ₺</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Hasat Bilgileri - form ile aynı kart */}
            <div className="rounded-xl border border-border p-4 space-y-4 bg-card">
              <p className="text-sm font-semibold text-foreground">Hasat Bilgileri (zorunlu)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Tarih</label>
                  <p className="text-sm font-medium">{formatDateDisplay(entry.date)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Bahçe</label>
                  <p className="text-sm font-medium">{gardenName}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Tüccar</label>
                  <p className="text-sm font-medium">{entry.traderName ?? "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Satış fiyatı (TL/kg)</label>
                  <p className="text-sm font-medium">
                    {entry.pricePerKg != null ? String(entry.pricePerKg) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tüccar Fişi - form ile aynı kart */}
            <div className="rounded-xl border border-border p-4 space-y-4 bg-card">
              <p className="text-sm font-semibold text-foreground">Tüccar Fişi (zorunlu)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">1. kalite (kg)</label>
                  <p className="text-sm font-medium">
                    {entry.grade1Kg != null ? String(entry.grade1Kg) : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">2. kalite (kg)</label>
                  <p className="text-sm font-medium">
                    {entry.grade2Kg != null ? String(entry.grade2Kg) : "—"}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Tüccar fişi fotoğrafı</label>
                {traderSlipPhotos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {traderSlipPhotos.map((p) => (
                      <a
                        key={p.id}
                        href={getPhotoUrl(p.url) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary/50"
                      >
                        <img
                          src={getPhotoUrl(p.url) ?? ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {/* Kantar ve Diğer Bilgiler - form ile aynı kart */}
            <div className="rounded-xl border border-border p-4 space-y-4 bg-card">
              <p className="text-sm font-semibold text-foreground">Kantar ve Diğer Bilgiler (opsiyonel)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Bağımsız kantar dolu (kg)</label>
                  <p className="text-sm font-medium">
                    {entry.independentScaleFullKg != null
                      ? String(entry.independentScaleFullKg)
                      : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Bağımsız kantar boş (kg)</label>
                  <p className="text-sm font-medium">
                    {entry.independentScaleEmptyKg != null
                      ? String(entry.independentScaleEmptyKg)
                      : "—"}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Fotoğraflar</label>
                {generalPhotos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {generalPhotos.map((p) => (
                      <a
                        key={p.id}
                        href={getPhotoUrl(p.url) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary/50"
                      >
                        <img
                          src={getPhotoUrl(p.url) ?? ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
