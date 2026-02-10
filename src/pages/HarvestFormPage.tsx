import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import HeaderWithBack from "@/components/HeaderWithBack";
import {
  getHarvest,
  createHarvest,
  updateHarvest,
  submitHarvest,
  deleteHarvest,
  deleteHarvestPhoto,
  uploadHarvestPhotos,
  searchHarvestTraders,
  harvestTotalKg,
  harvestSecondRatio,
  isSecondRatioHigh,
  harvestRevenue,
  type HarvestEntry,
  type HarvestPhoto,
  type TraderSuggestion,
} from "@/lib/harvest";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { getPhotoUrl } from "@/lib/photoUtils";
import { compressImageToJpeg } from "@/lib/imageUtils";
import {
  type FormPhotoItem,
  normalizeExistingPhotos,
  formPhotoFromFile,
} from "@/lib/harvestFormPhotos";
import { Save, Send, Trash2, Info, Camera, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const HarvestFormPage = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const revizeFromId = searchParams.get("revizeFromId")?.trim() || null;
  const id = rawId ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { gardens, activeRole } = useApp();
  const isRevizeMode = !!revizeFromId;
  const isNew = (id === "yeni" || id === "" || id === "undefined" || id === "null") && !isRevizeMode;
  const isAdmin = activeRole === "ADMIN" || activeRole === "SUPER_ADMIN";

  const [entry, setEntry] = useState<HarvestEntry | null>(null);
  const [loading, setLoading] = useState(!isNew || isRevizeMode);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingTraderSlipUpload, setPendingTraderSlipUpload] = useState(false);
  const [pendingGeneralUpload, setPendingGeneralUpload] = useState(false);

  const defaultDate = formatDateInput(new Date());
  const [date, setDate] = useState(defaultDate);
  const [gardenId, setGardenId] = useState<number | "">("");
  const [traderName, setTraderName] = useState("");
  const [traderSuggestions, setTraderSuggestions] = useState<TraderSuggestion[]>([]);
  const [traderSuggestionsOpen, setTraderSuggestionsOpen] = useState(false);
  const [pricePerKg, setPricePerKg] = useState<string>("");
  const [grade1Kg, setGrade1Kg] = useState<string>("");
  const [grade2Kg, setGrade2Kg] = useState<string>("");
  const [thirdLabel, setThirdLabel] = useState("");
  const [thirdKg, setThirdKg] = useState<string>("");
  const [thirdPricePerKg, setThirdPricePerKg] = useState<string>("");
  const [independentScaleFullKg, setIndependentScaleFullKg] = useState<string>("");
  const [independentScaleEmptyKg, setIndependentScaleEmptyKg] = useState<string>("");
  const [traderScaleFullKg, setTraderScaleFullKg] = useState<string>("");
  const [traderScaleEmptyKg, setTraderScaleEmptyKg] = useState<string>("");

  /** Revize modunda foto state (existing + new + deleted). Create modda entry.photos kullanılır. */
  const [traderSlipFormPhotos, setTraderSlipFormPhotos] = useState<FormPhotoItem[]>([]);
  const [generalFormPhotos, setGeneralFormPhotos] = useState<FormPhotoItem[]>([]);

  const generalInputRef = useRef<HTMLInputElement>(null);
  const traderSlipInputRef = useRef<HTMLInputElement>(null);
  const traderSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Revize modu: revizeFromId ile hasat yükle ve formu doldur
  useEffect(() => {
    if (!revizeFromId) return;
    if (!isAdmin) {
      navigate("/hasat", { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getHarvest(revizeFromId);
        if (cancelled) return;
        if (data.status !== "submitted") {
          toast({ title: "Hata", description: "Sadece kapanmış hasat revize edilebilir.", variant: "destructive" });
          navigate("/hasat");
          return;
        }
        setEntry(data);
        setDate(formatDateInput(new Date(data.date)));
        setGardenId(data.gardenId);
        setTraderName(data.traderName ?? "");
        setPricePerKg(data.pricePerKg != null ? String(data.pricePerKg) : "");
        setGrade1Kg(data.grade1Kg != null ? String(data.grade1Kg) : "");
        setGrade2Kg(data.grade2Kg != null ? String(data.grade2Kg) : "");
        setThirdLabel(data.thirdLabel ?? "");
        setThirdKg(data.thirdKg != null ? String(data.thirdKg) : "");
        setThirdPricePerKg(data.thirdPricePerKg != null ? String(data.thirdPricePerKg) : "");
        setIndependentScaleFullKg(data.independentScaleFullKg != null ? String(data.independentScaleFullKg) : "");
        setIndependentScaleEmptyKg(data.independentScaleEmptyKg != null ? String(data.independentScaleEmptyKg) : "");
        setTraderScaleFullKg(data.traderScaleFullKg != null ? String(data.traderScaleFullKg) : "");
        setTraderScaleEmptyKg(data.traderScaleEmptyKg != null ? String(data.traderScaleEmptyKg) : "");
        const photos = data.photos ?? [];
        const resolveUrl = (url: string) => getPhotoUrl(url) ?? url;
        setTraderSlipFormPhotos(
          normalizeExistingPhotos(
            photos.filter((p: { category: string }) => p.category === "TRADER_SLIP"),
            resolveUrl
          )
        );
        setGeneralFormPhotos(
          normalizeExistingPhotos(
            photos.filter((p: { category: string }) => p.category === "GENERAL"),
            resolveUrl
          )
        );
      } catch (e) {
        if (!cancelled) {
          toast({ title: "Hata", description: "Hasat yüklenemedi.", variant: "destructive" });
          navigate("/hasat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [revizeFromId, isAdmin, navigate, toast]);

  // Taslak / mevcut hasat düzenleme: id ile yükle (revize modu değilse)
  useEffect(() => {
    if (isNew || !id || isRevizeMode) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getHarvest(id);
        if (!cancelled) {
          setEntry(data);
          setDate(formatDateInput(new Date(data.date)));
          setGardenId(data.gardenId);
          setTraderName(data.traderName ?? "");
          setPricePerKg(data.pricePerKg != null ? String(data.pricePerKg) : "");
          setGrade1Kg(data.grade1Kg != null ? String(data.grade1Kg) : "");
          setGrade2Kg(data.grade2Kg != null ? String(data.grade2Kg) : "");
          setThirdLabel(data.thirdLabel ?? "");
          setThirdKg(data.thirdKg != null ? String(data.thirdKg) : "");
          setThirdPricePerKg(data.thirdPricePerKg != null ? String(data.thirdPricePerKg) : "");
          setIndependentScaleFullKg(data.independentScaleFullKg != null ? String(data.independentScaleFullKg) : "");
          setIndependentScaleEmptyKg(data.independentScaleEmptyKg != null ? String(data.independentScaleEmptyKg) : "");
          setTraderScaleFullKg(data.traderScaleFullKg != null ? String(data.traderScaleFullKg) : "");
          setTraderScaleEmptyKg(data.traderScaleEmptyKg != null ? String(data.traderScaleEmptyKg) : "");
        }
      } catch (e) {
        if (!cancelled) {
          toast({ title: "Hata", description: "Hasat yüklenemedi.", variant: "destructive" });
          navigate("/hasat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isNew, isRevizeMode, navigate, toast]);

  // Revize modunda oluşturulan object URL'leri unmount'ta revoke et
  const formPhotosRef = useRef<FormPhotoItem[]>([]);
  formPhotosRef.current = [...traderSlipFormPhotos, ...generalFormPhotos];
  useEffect(() => {
    return () => {
      formPhotosRef.current
        .filter((p) => p.status === "new" && p.previewUrl)
        .forEach((p) => {
          try {
            URL.revokeObjectURL(p.previewUrl);
          } catch (_) {}
        });
    };
  }, []);

  useEffect(() => {
    if (entry && pendingTraderSlipUpload) {
      setPendingTraderSlipUpload(false);
      setTimeout(() => traderSlipInputRef.current?.click(), 150);
    }
  }, [entry, pendingTraderSlipUpload]);

  useEffect(() => {
    if (entry && pendingGeneralUpload) {
      setPendingGeneralUpload(false);
      setTimeout(() => generalInputRef.current?.click(), 150);
    }
  }, [entry, pendingGeneralUpload]);

  const photos = entry?.photos ?? [];
  const generalPhotos = photos.filter((p) => p.category === "GENERAL");
  const traderSlipPhotos = photos.filter((p) => p.category === "TRADER_SLIP");

  const visibleTraderSlipPhotos = isRevizeMode
    ? traderSlipFormPhotos.filter((p) => p.status !== "deleted")
    : traderSlipPhotos;
  const visibleGeneralPhotos = isRevizeMode
    ? generalFormPhotos.filter((p) => p.status !== "deleted")
    : generalPhotos;
  const hasTraderSlipPhoto = visibleTraderSlipPhotos.length >= 1;

  const num = (s: string) => (s === "" ? null : parseFloat(s));
  const hasGarden = gardenId !== "";
  const hasDate = date !== "";
  const hasTrader = traderName.trim() !== "";
  const priceOk = num(pricePerKg) != null && (num(pricePerKg) ?? 0) > 0;
  const grade1Ok = num(grade1Kg) != null && (num(grade1Kg) ?? 0) > 0;
  const grade2Ok = num(grade2Kg) != null && (num(grade2Kg) ?? 0) >= 0;
  const section1Complete = hasDate && hasGarden && hasTrader && priceOk;
  const section2Complete = grade1Ok && grade2Ok && hasTraderSlipPhoto;
  // Default date alone does not make form dirty (Kaydet pasif when only date is filled)
  const formDirty =
    (hasDate && date !== defaultDate) ||
    hasGarden ||
    hasTrader ||
    pricePerKg !== "" ||
    grade1Kg !== "" ||
    grade2Kg !== "" ||
    independentScaleFullKg !== "" ||
    independentScaleEmptyKg !== "" ||
    thirdLabel !== "" ||
    thirdKg !== "" ||
    thirdPricePerKg !== "" ||
    traderScaleFullKg !== "" ||
    traderScaleEmptyKg !== "" ||
    (entry?.photos?.length ?? 0) > 0;
  const canSaveDraft = !isNew ? true : formDirty;
  const canSubmit =
    section1Complete &&
    section2Complete &&
    hasTraderSlipPhoto &&
    entry?.status === "draft";
  const canRevizeSubmit =
    isRevizeMode &&
    !!entry &&
    section1Complete &&
    section2Complete &&
    hasTraderSlipPhoto;
  const hasDraft = !isNew && entry?.status === "draft";

  const handleTraderInputChange = (value: string) => {
    setTraderName(value);
    setTraderSuggestionsOpen(false);
    if (traderSearchTimeoutRef.current) clearTimeout(traderSearchTimeoutRef.current);
    if (value.trim().length < 2) {
      setTraderSuggestions([]);
      return;
    }
    traderSearchTimeoutRef.current = setTimeout(() => {
      searchHarvestTraders(value)
        .then((items) => {
          setTraderSuggestions(items);
          setTraderSuggestionsOpen(items.length > 0);
        })
        .catch(() => setTraderSuggestions([]));
    }, 200);
  };

  const handleTraderSelect = (t: TraderSuggestion) => {
    setTraderName(t.name);
    setTraderSuggestions([]);
    setTraderSuggestionsOpen(false);
  };

  const handleDeleteHarvest = async () => {
    if (!entry || entry.status !== "draft" || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteHarvest(entry.id);
      toast({ title: "Taslak silindi" });
      setIsDeleteDialogOpen(false);
      navigate("/hasat");
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Taslak silinemedi.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!canSaveDraft) return;
    const gid = gardenId === "" ? undefined : Number(gardenId);
    if (isNew) {
      if (!hasDate || !hasGarden) {
        toast({ title: "Tarih ve bahçe gerekli", description: "Taslak kaydetmek için tarih ve bahçe seçin.", variant: "destructive" });
        return;
      }
      if (gid == null) return;
      setSaving(true);
      try {
        const created = await createHarvest({
          date,
          gardenId: gid,
          traderName: (traderName && traderName.trim()) || "—",
          pricePerKg: num(pricePerKg) ?? 0,
          grade1Kg: num(grade1Kg) ?? undefined,
          grade2Kg: num(grade2Kg) ?? undefined,
          thirdLabel: thirdLabel || undefined,
          thirdKg: num(thirdKg) ?? undefined,
          thirdPricePerKg: num(thirdPricePerKg) ?? undefined,
          independentScaleFullKg: num(independentScaleFullKg) ?? undefined,
          independentScaleEmptyKg: num(independentScaleEmptyKg) ?? undefined,
          traderScaleFullKg: num(traderScaleFullKg) ?? undefined,
          traderScaleEmptyKg: num(traderScaleEmptyKg) ?? undefined,
        });
        toast({ title: "Taslak kaydedildi", description: created.name });
        navigate(`/hasat/${created.id}`, { replace: true });
      } catch (e: any) {
        toast({ title: "Hata", description: e?.message ?? "Taslak kaydedilemedi.", variant: "destructive" });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!entry) return;
    setSaving(true);
    try {
      const updated = await updateHarvest(entry.id, {
        date,
        gardenId: gid,
        traderName: traderName.trim() || undefined,
        pricePerKg: num(pricePerKg) ?? undefined,
        grade1Kg: num(grade1Kg) ?? undefined,
        grade2Kg: num(grade2Kg) ?? undefined,
        thirdLabel: thirdLabel || undefined,
        thirdKg: num(thirdKg) ?? undefined,
        thirdPricePerKg: num(thirdPricePerKg) ?? undefined,
        independentScaleFullKg: num(independentScaleFullKg) ?? undefined,
        independentScaleEmptyKg: num(independentScaleEmptyKg) ?? undefined,
        traderScaleFullKg: num(traderScaleFullKg) ?? undefined,
        traderScaleEmptyKg: num(traderScaleEmptyKg) ?? undefined,
      });
      setEntry(updated);
      toast({ title: "Taslak güncellendi" });
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Güncellenemedi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !entry) return;
    const gid = gardenId === "" ? undefined : Number(gardenId);
    setSubmitting(true);
    try {
      // Submit validates from DB: sync form to backend first
      await updateHarvest(entry.id, {
        date,
        gardenId: gid ?? entry.gardenId,
        traderName: traderName.trim() || undefined,
        pricePerKg: num(pricePerKg) ?? undefined,
        grade1Kg: num(grade1Kg) ?? undefined,
        grade2Kg: num(grade2Kg) ?? undefined,
        thirdLabel: thirdLabel || undefined,
        thirdKg: num(thirdKg) ?? undefined,
        thirdPricePerKg: num(thirdPricePerKg) ?? undefined,
        independentScaleFullKg: num(independentScaleFullKg) ?? undefined,
        independentScaleEmptyKg: num(independentScaleEmptyKg) ?? undefined,
        traderScaleFullKg: num(traderScaleFullKg) ?? undefined,
        traderScaleEmptyKg: num(traderScaleEmptyKg) ?? undefined,
      });
      await submitHarvest(entry.id);
      toast({ title: "Hasat kapatıldı", description: "Gönderim tamamlandı." });
      navigate("/hasat");
    } catch (e: any) {
      const msg = e?.message ?? e?.response?.data?.message ?? "Gönderilemedi.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevizeSubmit = async () => {
    if (!canRevizeSubmit || !revizeFromId) return;
    const gid = gardenId === "" ? undefined : Number(gardenId);
    if (gid == null) {
      toast({ title: "Bahçe seçin", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const deletedIds = [
        ...traderSlipFormPhotos.filter((p) => p.status === "deleted" && p.id),
        ...generalFormPhotos.filter((p) => p.status === "deleted" && p.id),
      ].map((p) => p.id!);
      const newTraderFiles = traderSlipFormPhotos
        .filter((p) => p.status === "new" && p.file)
        .map((p) => p.file!);
      const newGeneralFiles = generalFormPhotos
        .filter((p) => p.status === "new" && p.file)
        .map((p) => p.file!);

      for (const photoId of deletedIds) {
        await deleteHarvestPhoto(revizeFromId, photoId);
      }
      if (newTraderFiles.length > 0) {
        await uploadHarvestPhotos(revizeFromId, "TRADER_SLIP", newTraderFiles);
      }
      if (newGeneralFiles.length > 0) {
        await uploadHarvestPhotos(revizeFromId, "GENERAL", newGeneralFiles);
      }

      await updateHarvest(revizeFromId, {
        date,
        gardenId: gid,
        traderName: traderName.trim() || undefined,
        pricePerKg: num(pricePerKg) ?? undefined,
        grade1Kg: num(grade1Kg) ?? undefined,
        grade2Kg: num(grade2Kg) ?? undefined,
        thirdLabel: thirdLabel || undefined,
        thirdKg: num(thirdKg) ?? undefined,
        thirdPricePerKg: num(thirdPricePerKg) ?? undefined,
        independentScaleFullKg: num(independentScaleFullKg) ?? undefined,
        independentScaleEmptyKg: num(independentScaleEmptyKg) ?? undefined,
        traderScaleFullKg: num(traderScaleFullKg) ?? undefined,
        traderScaleEmptyKg: num(traderScaleEmptyKg) ?? undefined,
      });
      toast({ title: "Hasat revize edildi" });
      navigate("/hasat");
    } catch (e: any) {
      const msg = e?.message ?? e?.response?.data?.message ?? "Revize kaydedilemedi.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (category: "GENERAL" | "TRADER_SLIP", files: FileList | null) => {
    if (!files?.length || !entry) return;
    const harvestId = entry.id;
    setUploading(category);
    try {
      const compressed = await Promise.all(
        Array.from(files).map((f) =>
          compressImageToJpeg(f, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 })
        )
      );
      const res = await uploadHarvestPhotos(harvestId, category, compressed);
      setEntry((prev) =>
        prev
          ? { ...prev, photos: [...prev.photos, ...res.photos] }
          : null
      );
      toast({ title: "Fotoğraflar yüklendi", description: `${res.photos.length} adet` });
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Yüklenemedi.", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveGeneralPhoto = async (photo: HarvestPhoto) => {
    if (!entry || isClosed) return;
    try {
      await deleteHarvestPhoto(entry.id, photo.id);
      setEntry((prev) =>
        prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photo.id) } : null
      );
      toast({ title: "Fotoğraf silindi" });
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Silinemedi.", variant: "destructive" });
    }
  };

  const handleRemoveTraderSlipPhoto = async (photo: HarvestPhoto) => {
    if (!entry || isClosed) return;
    try {
      await deleteHarvestPhoto(entry.id, photo.id);
      setEntry((prev) =>
        prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photo.id) } : null
      );
      toast({ title: "Fotoğraf silindi" });
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Silinemedi.", variant: "destructive" });
    }
  };

  const handleRemoveRevizePhoto = (category: "TRADER_SLIP" | "GENERAL", item: FormPhotoItem) => {
    if (item.status === "new") {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch (_) {}
      if (category === "TRADER_SLIP") {
        setTraderSlipFormPhotos((prev) => prev.filter((p) => p.previewUrl !== item.previewUrl));
      } else {
        setGeneralFormPhotos((prev) => prev.filter((p) => p.previewUrl !== item.previewUrl));
      }
      return;
    }
    if (item.status === "existing" && item.id) {
      if (category === "TRADER_SLIP") {
        setTraderSlipFormPhotos((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "deleted" as const } : p))
        );
      } else {
        setGeneralFormPhotos((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "deleted" as const } : p))
        );
      }
    }
  };

  const handleRevizePhotoSelect = async (
    category: "TRADER_SLIP" | "GENERAL",
    files: FileList | null
  ) => {
    if (!files?.length) return;
    setUploading(category);
    try {
      const compressed = await Promise.all(
        Array.from(files).map((f) =>
          compressImageToJpeg(f, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 })
        )
      );
      const newItems = compressed.map((f) => formPhotoFromFile(f));
      if (category === "TRADER_SLIP") {
        setTraderSlipFormPhotos((prev) => [...prev, ...newItems]);
      } else {
        setGeneralFormPhotos((prev) => [...prev, ...newItems]);
      }
      toast({ title: "Fotoğraf eklendi", description: `${newItems.length} adet` });
    } finally {
      setUploading(null);
    }
  };

  const ensureDraftThenOpenTraderSlip = async () => {
    if (uploading || isClosed) return;
    if (entry) {
      traderSlipInputRef.current?.click();
      return;
    }
    const gid = gardenId === "" ? undefined : Number(gardenId);
    if (gid == null || !hasDate) {
      toast({ title: "Tarih ve bahçe gerekli", description: "Fotoğraf yüklemek için önce tarih ve bahçe seçin.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await createHarvest({
        date,
        gardenId: gid,
        traderName: (traderName && traderName.trim()) || "—",
        pricePerKg: num(pricePerKg) ?? 0,
        grade1Kg: num(grade1Kg) ?? undefined,
        grade2Kg: num(grade2Kg) ?? undefined,
        thirdLabel: thirdLabel || undefined,
        thirdKg: num(thirdKg) ?? undefined,
        thirdPricePerKg: num(thirdPricePerKg) ?? undefined,
        independentScaleFullKg: num(independentScaleFullKg) ?? undefined,
        independentScaleEmptyKg: num(independentScaleEmptyKg) ?? undefined,
        traderScaleFullKg: num(traderScaleFullKg) ?? undefined,
        traderScaleEmptyKg: num(traderScaleEmptyKg) ?? undefined,
      });
      setEntry(created);
      navigate(`/hasat/${created.id}`, { replace: true });
      setPendingTraderSlipUpload(true);
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Taslak oluşturulamadı.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const ensureDraftThenOpenGeneral = async () => {
    if (uploading || isClosed) return;
    if (entry) {
      generalInputRef.current?.click();
      return;
    }
    const gid = gardenId === "" ? undefined : Number(gardenId);
    if (gid == null || !hasDate) {
      toast({ title: "Tarih ve bahçe gerekli", description: "Fotoğraf yüklemek için önce tarih ve bahçe seçin.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await createHarvest({
        date,
        gardenId: gid,
        traderName: (traderName && traderName.trim()) || "—",
        pricePerKg: num(pricePerKg) ?? 0,
        grade1Kg: num(grade1Kg) ?? undefined,
        grade2Kg: num(grade2Kg) ?? undefined,
        thirdLabel: thirdLabel || undefined,
        thirdKg: num(thirdKg) ?? undefined,
        thirdPricePerKg: num(thirdPricePerKg) ?? undefined,
        independentScaleFullKg: num(independentScaleFullKg) ?? undefined,
        independentScaleEmptyKg: num(independentScaleEmptyKg) ?? undefined,
        traderScaleFullKg: num(traderScaleFullKg) ?? undefined,
        traderScaleEmptyKg: num(traderScaleEmptyKg) ?? undefined,
      });
      setEntry(created);
      navigate(`/hasat/${created.id}`, { replace: true });
      setPendingGeneralUpload(true);
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Taslak oluşturulamadı.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const isClosed = entry?.status === "submitted" && !isRevizeMode;
  const displayEntry: HarvestEntry | null = entry
    ? {
        ...entry,
        date,
        gardenId: typeof gardenId === "number" ? gardenId : entry.gardenId,
        pricePerKg: num(pricePerKg) ?? entry.pricePerKg,
        grade1Kg: num(grade1Kg) ?? entry.grade1Kg,
        grade2Kg: num(grade2Kg) ?? entry.grade2Kg,
        thirdKg: num(thirdKg) ?? entry.thirdKg,
        thirdPricePerKg: num(thirdPricePerKg) ?? entry.thirdPricePerKg,
      }
    : null;
  const totalKg = displayEntry ? harvestTotalKg(displayEntry) : null;
  const secondRatio = displayEntry ? harvestSecondRatio(displayEntry) : null;
  const ratioHigh = secondRatio != null && secondRatio > 5;
  const revenue = displayEntry ? harvestRevenue(displayEntry) : null;
  const scaleFull = num(independentScaleFullKg) ?? entry?.independentScaleFullKg ?? null;
  const scaleEmpty = num(independentScaleEmptyKg) ?? entry?.independentScaleEmptyKg ?? null;
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
  const kantarFarkHigh = kantarFarkYuzde != null && kantarFarkYuzde > 5;
  const showOzet =
    totalKg != null ||
    revenue != null ||
    secondRatio != null ||
    netKantarKg != null ||
    kantarFarkKg != null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <HeaderWithBack
        title={isRevizeMode ? "Hasat Revize" : isNew ? "Yeni Hasat" : entry?.name ?? "Hasat"}
        onBack={() => navigate("/hasat")}
      />
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {isRevizeMode && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            Bu hasat kapalı. Admin revize modu.
          </div>
        )}
        {isClosed && !isRevizeMode && (
          <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-foreground">
            Hasat kapanmıştır. Düzenleme yapılamaz.
          </div>
        )}

        {/* Özet - en üstte */}
        {showOzet && (
          <div className="border rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">Özet</p>
            <table className="w-full text-sm">
              <tbody>
                {num(grade1Kg) != null && (
                  <tr><td className="text-muted-foreground py-0.5">1. kalite</td><td className="text-right">{num(grade1Kg)} kg</td></tr>
                )}
                {num(grade2Kg) != null && (
                  <tr><td className="text-muted-foreground py-0.5">2. kalite</td><td className="text-right">{num(grade2Kg)} kg</td></tr>
                )}
                {num(thirdKg) != null && thirdKg !== "" && (
                  <tr><td className="text-muted-foreground py-0.5">{thirdLabel || "3. sınıf"}</td><td className="text-right">{num(thirdKg)} kg</td></tr>
                )}
                {totalKg != null && (
                  <tr><td className="font-medium py-0.5">Toplam</td><td className="text-right">{totalKg} kg</td></tr>
                )}
                {secondRatio != null && (
                  <tr>
                    <td className="text-muted-foreground py-0.5">2. oran</td>
                    <td className="text-right">
                      %{secondRatio.toFixed(1)}
                      {ratioHigh && <span className="ml-1 text-warning-foreground">(yüksek)</span>}
                    </td>
                  </tr>
                )}
                {(kantarFarkKg != null || netKantarKg != null) && (
                  <tr>
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
                          {kantarFarkHigh && (
                            <span className="ml-1 text-destructive">(yüksek)</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                )}
                {revenue != null && (
                  <tr><td className="font-medium py-0.5">Tahmini gelir</td><td className="text-right">{revenue.toFixed(2)} ₺</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 1: Hasat Bilgileri (zorunlu) */}
        <div className="card-elevated p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Hasat Bilgileri (zorunlu)</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="p-1 rounded-full text-muted-foreground hover:text-foreground focus:outline-none" aria-label="Bilgi">
                    <Info size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[260px]">
                  Tarih, bahçe, tüccar ve satış fiyatı (TL/kg) alanlarını doldurun. Taslak kaydetmek ve göndermek için bu bölüm zorunludur.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-foreground mb-1 block">Tarih</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isClosed}
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Bahçe</label>
              <select
                value={gardenId === "" ? "" : String(gardenId)}
                onChange={(e) => setGardenId(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={isClosed}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm"
              >
                <option value="">Seçin</option>
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-sm text-foreground mb-1 block">Tüccar</label>
              <Input
                value={traderName}
                onChange={(e) => handleTraderInputChange(e.target.value)}
                onBlur={() => setTimeout(() => setTraderSuggestionsOpen(false), 150)}
                onFocus={() => traderSuggestions.length > 0 && setTraderSuggestionsOpen(true)}
                placeholder="Ad yazın veya seçin"
                disabled={isClosed}
              />
              {traderSuggestionsOpen && traderSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-md max-h-40 overflow-auto">
                  {traderSuggestions.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => handleTraderSelect(t)}
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">Satış fiyatı (TL/kg)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                disabled={isClosed}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Tüccar Fişi (zorunlu) */}
        <div className="card-elevated p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Tüccar Fişi (zorunlu)</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="p-1 rounded-full text-muted-foreground hover:text-foreground focus:outline-none" aria-label="Bilgi">
                    <Info size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[260px]">
                  1. ve 2. kalite kg değerlerini girin. Göndermeden önce tüccar fişi fotoğrafı yüklenmiş olmalıdır.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">1. kalite (kg)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={grade1Kg}
                onChange={(e) => setGrade1Kg(e.target.value)}
                disabled={isClosed}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">2. kalite (kg)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={grade2Kg}
                onChange={(e) => setGrade2Kg(e.target.value)}
                disabled={isClosed}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Tüccar fişi fotoğrafı</label>
            <input
              ref={traderSlipInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                if (isRevizeMode) {
                  handleRevizePhotoSelect("TRADER_SLIP", e.target.files);
                  e.target.value = "";
                } else {
                  handlePhotoUpload("TRADER_SLIP", e.target.files);
                }
              }}
              disabled={!!uploading || isClosed}
            />
            <button
              type="button"
              onClick={isRevizeMode ? () => traderSlipInputRef.current?.click() : ensureDraftThenOpenTraderSlip}
              disabled={!!uploading || isClosed}
              className={cn(
                "w-full h-28 md:h-32 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/50 hover:border-primary/50 hover:bg-muted transition-colors flex flex-col items-center justify-center gap-2",
                "disabled:opacity-50"
              )}
              aria-label="Tüccar fişi fotoğrafı ekle"
            >
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {uploading === "TRADER_SLIP" ? "Yükleniyor..." : "Fotoğraf ekle"}
              </span>
            </button>
            {visibleTraderSlipPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {isRevizeMode
                  ? visibleTraderSlipPhotos.map((item) => (
                      <div key={item.id ?? item.previewUrl} className="relative group">
                        <a
                          href={item.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary/50 transition-shadow"
                        >
                          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveRevizePhoto("TRADER_SLIP", item)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow border border-border hover:bg-destructive/90"
                          aria-label="Fotoğrafı kaldır"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  : traderSlipPhotos.map((p) => (
                      <div key={p.id} className="relative group">
                        <a
                          href={getPhotoUrl(p.url) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary/50 transition-shadow"
                        >
                          <img src={getPhotoUrl(p.url) ?? ""} alt="" className="h-full w-full object-cover" />
                        </a>
                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTraderSlipPhoto(p)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow border border-border hover:bg-destructive/90"
                            aria-label="Fotoğrafı kaldır"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Kantar ve Diğer Bilgiler (zorunlu) */}
        <div className="card-elevated p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Kantar ve Diğer Bilgiler (opsiyonel)</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="p-1 rounded-full text-muted-foreground hover:text-foreground focus:outline-none" aria-label="Bilgi">
                    <Info size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[260px]">
                  Bağımsız kantar dolu ve boş değerleri (kg) girin. İsteğe bağlı: kamyon ön/arka, fiş fotoğrafları, bağımsız tartı fişleri.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bağımsız kantar dolu (kg)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="kg"
                value={independentScaleFullKg}
                onChange={(e) => setIndependentScaleFullKg(e.target.value)}
                disabled={isClosed}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bağımsız kantar boş (kg)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="kg"
                value={independentScaleEmptyKg}
                onChange={(e) => setIndependentScaleEmptyKg(e.target.value)}
                disabled={isClosed}
              />
            </div>
          </div>
          <div>
              <label className="block text-xs text-muted-foreground mb-2">Fotoğraflar</label>
              <input
                ref={generalInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (isRevizeMode) {
                    handleRevizePhotoSelect("GENERAL", e.target.files);
                    e.target.value = "";
                  } else {
                    handlePhotoUpload("GENERAL", e.target.files);
                  }
                }}
                disabled={!!uploading || isClosed}
              />
              <button
                type="button"
                onClick={isRevizeMode ? () => generalInputRef.current?.click() : ensureDraftThenOpenGeneral}
                disabled={!!uploading || isClosed}
                className={cn(
                  "w-full h-28 md:h-32 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/50 hover:border-primary/50 hover:bg-muted transition-colors flex flex-col items-center justify-center gap-2",
                  "disabled:opacity-50"
                )}
                aria-label="Fotoğraf ekle"
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {uploading === "GENERAL" ? "Yükleniyor..." : "Fotoğraf ekle"}
                </span>
              </button>
              {visibleGeneralPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {isRevizeMode
                    ? visibleGeneralPhotos.map((item) => (
                        <div key={item.id ?? item.previewUrl} className="relative group">
                          <a
                            href={item.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary/50 transition-shadow"
                          >
                            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveRevizePhoto("GENERAL", item)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow border border-border hover:bg-destructive/90"
                            aria-label="Fotoğrafı kaldır"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    : generalPhotos.map((p) => (
                        <div key={p.id} className="relative group">
                          <a
                            href={getPhotoUrl(p.url) ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary/50 transition-shadow"
                          >
                            <img src={getPhotoUrl(p.url) ?? ""} alt="" className="h-full w-full object-cover" />
                          </a>
                          {!isClosed && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGeneralPhoto(p)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow border border-border hover:bg-destructive/90"
                              aria-label="Fotoğrafı kaldır"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                </div>
              )}
            </div>
        </div>

        {/* Bottom Actions - hidden when harvest is closed (read-only). Revize modunda sadece Gönder. */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="flex gap-3">
              {!isRevizeMode && (
                <button
                  onClick={() => hasDraft && setIsDeleteDialogOpen(true)}
                  disabled={!hasDraft || isDeleting || saving || submitting}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-destructive/30 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={18} />
                  <span>{isDeleting ? "Siliniyor..." : "Sil"}</span>
                </button>
              )}
              {!isRevizeMode && (
                <button
                  onClick={handleSaveDraft}
                  disabled={!canSaveDraft || saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  <span>{saving ? "Kaydediliyor..." : "Kaydet"}</span>
                </button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={isRevizeMode ? "flex-1 flex min-w-0" : "flex-1 flex min-w-0"}>
                      <button
                        onClick={isRevizeMode ? handleRevizeSubmit : handleSubmit}
                        disabled={isRevizeMode ? !canRevizeSubmit || submitting : !canSubmit || submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={18} />
                        <span>{submitting ? "Gönderiliyor..." : "Gönder"}</span>
                      </button>
                    </span>
                  </TooltipTrigger>
                  {!isRevizeMode && !canSubmit && (
                    <TooltipContent side="top" className="max-w-[260px]">
                      Gönder için tüccar fişi ve zorunlu alanlar gerekli.
                    </TooltipContent>
                  )}
                  {isRevizeMode && !canRevizeSubmit && (
                    <TooltipContent side="top" className="max-w-[260px]">
                      Revize için tüccar fişi ve zorunlu alanlar gerekli.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}

      {/* Delete draft confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Taslağı sil</DialogTitle>
            <DialogDescription>
              Bu hasat taslağını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
            >
              İptal
            </button>
            <button
              onClick={handleDeleteHarvest}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
};

export default HarvestFormPage;
