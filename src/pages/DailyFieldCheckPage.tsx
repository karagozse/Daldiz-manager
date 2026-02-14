/**
 * Günlük Saha Kontrolü - tam ekran sayfa. Veri backend API ile (getOrCreate, Kaydet, Gönder, Sil).
 * Route: /bahce/:id/saha-kontrol
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import HeaderWithBack from "@/components/HeaderWithBack";
import { DailyFieldCheckFormBody } from "@/components/DailyFieldCheckFormBody";
import {
  getDailyFieldCheck,
  createDailyFieldCheck,
  updateDailyFieldCheck,
  submitDailyFieldCheck,
  deleteDailyFieldCheck,
  type BackendDailyFieldCheck,
} from "@/lib/dailyFieldCheckApi";
import {
  setDailyFieldCheckDraft,
  setDailyFieldCheckSubmitted,
  clearDailyFieldCheckDraft,
} from "@/lib/dailyFieldCheckStorage";
import {
  type DailyFieldCheckFormState,
  type FieldCheckAnswer,
  type YesNo,
  initialFormState,
  formToSerializable,
  formFromSerializable,
  getFormValidationErrors,
  hasAnyAnswer,
  isFormComplete,
} from "@/lib/dailyFieldCheckForm";
import { formatDateDisplay } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { Save, Send, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DailyFieldCheckPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { gardens } = useApp();
  const gardenId = parseInt(id || "0", 10);
  const garden = gardens.find((g) => g.id === gardenId);

  const [form, setForm] = useState<DailyFieldCheckFormState>(initialFormState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [record, setRecord] = useState<BackendDailyFieldCheck | null>(null);
  const initialFormRef = useRef<DailyFieldCheckFormState>(initialFormState());
  const { toast } = useToast();
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateLabel = formatDateDisplay(todayStr);
  const isSubmitted = record?.status === "SUBMITTED";

  const hasUnsavedChanges = useMemo(
    () =>
      JSON.stringify(formToSerializable(form)) !==
      JSON.stringify(formToSerializable(initialFormRef.current)),
    [form]
  );
  const hasAnyChange = hasAnyAnswer(form);
  const canSave = hasUnsavedChanges || (hasAnyChange && !record?.id);
  const canSubmit = isFormComplete(form);

  useEffect(() => {
    if (!gardenId) return;
    let cancelled = false;
    setIsLoadingRecord(true);
    setRecord(null);
    getDailyFieldCheck(gardenId, todayStr)
      .then((data) => {
        if (cancelled) return;
        setRecord(data.record);
        if (data.exists && data.record?.answers && typeof data.record.answers === "object") {
          const loaded = formFromSerializable(data.record.answers as Record<string, unknown>);
          setForm(loaded);
          initialFormRef.current = loaded;
        } else {
          const empty = initialFormState();
          setForm(empty);
          initialFormRef.current = empty;
        }
        setErrors({});
      })
      .catch((err) => {
        if (cancelled) return;
        toast({
          title: "Yüklenemedi",
          description: err?.message || "Günlük saha kontrolü yüklenirken hata oluştu.",
          variant: "destructive",
        });
        setRecord(null);
        const empty = initialFormState();
        setForm(empty);
        initialFormRef.current = empty;
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecord(false);
      });
    return () => { cancelled = true; };
  }, [gardenId, todayStr, toast]);

  const setAnswer = (key: string, value: YesNo) => {
    if (key in form && typeof form[key] === "object") {
      setForm((f) => ({ ...f, [key]: { ...(f[key] as FieldCheckAnswer), value } }));
    }
  };

  const setNote = (key: string, note: string) => {
    if (key in form && typeof form[key] === "object") {
      setForm((f) => ({ ...f, [key]: { ...(f[key] as FieldCheckAnswer), note } }));
    }
  };

  const setPhoto = (key: string, file: File | null, preview: string | null) => {
    if (key in form && typeof form[key] === "object") {
      setForm((f) => ({ ...f, [key]: { ...(f[key] as FieldCheckAnswer), photoFile: file ?? undefined, photoPreview: preview ?? undefined } }));
    }
  };

  const validate = (): boolean => {
    const err = getFormValidationErrors(form);
    setErrors(err);
    if (Object.keys(err).length > 0) {
      sectionRefs.current[Object.keys(err)[0]]?.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!canSave || isSubmitted) return;
    setIsSavingDraft(true);
    try {
      const payload = formToSerializable(form);
      let currentRecord = record;
      if (!currentRecord?.id) {
        const created = await createDailyFieldCheck(gardenId, todayStr, payload);
        setRecord(created);
        currentRecord = created;
      } else {
        await updateDailyFieldCheck(currentRecord.id, payload);
      }
      initialFormRef.current = form;
      setDailyFieldCheckDraft(gardenId, payload);
      toast({ title: "Kaydedildi" });
      navigate(`/bahce/${gardenId}`);
    } catch (err: unknown) {
      toast({
        title: "Kaydedilemedi",
        description: (err as Error)?.message || "Taslak kaydedilirken hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const submitForm = async () => {
    if (!canSubmit || isSubmitted) return;
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = formToSerializable(form);
      let currentRecord = record;
      if (!currentRecord?.id) {
        const created = await createDailyFieldCheck(gardenId, todayStr, payload);
        setRecord(created);
        currentRecord = created;
      } else {
        await updateDailyFieldCheck(currentRecord.id, payload);
      }
      await submitDailyFieldCheck(currentRecord!.id);
      setDailyFieldCheckSubmitted(gardenId, payload);
      toast({ title: "Günlük saha kontrolü gönderildi" });
      navigate(`/bahce/${gardenId}`);
    } catch (err: unknown) {
      toast({
        title: "Gönderilemedi",
        description: (err as Error)?.message || "Gönderilirken hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) setIsExitDialogOpen(true);
    else navigate(`/bahce/${gardenId}`);
  };

  const handleConfirmExit = () => {
    setIsExitDialogOpen(false);
    navigate(`/bahce/${gardenId}`);
  };

  const handleConfirmDelete = async () => {
    if (!record?.id) {
      setIsDeleteDialogOpen(false);
      return;
    }
    try {
      setIsDeleting(true);
      await deleteDailyFieldCheck(record.id);
      clearDailyFieldCheckDraft(gardenId);
      setRecord(null);
      const empty = initialFormState();
      setForm(empty);
      initialFormRef.current = empty;
      setErrors({});
      setIsDeleteDialogOpen(false);
      toast({ title: "Taslak silindi" });
      navigate(`/bahce/${gardenId}`);
    } catch (err: unknown) {
      toast({
        title: "Silinemedi",
        description: (err as Error)?.message || "Taslak silinirken hata oluştu.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(key, file, URL.createObjectURL(file));
    e.target.value = "";
  };

  if (!garden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Bahçe bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <HeaderWithBack
        title="Günlük Saha Kontrolü"
        subtitle={`${garden.name} · ${dateLabel}`}
        onBack={handleBack}
      />
      <main className="flex-1 overflow-y-auto">
        {isLoadingRecord ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Yükleniyor...</div>
        ) : (
          <DailyFieldCheckFormBody
            form={form}
            setForm={setForm}
            errors={errors}
            sectionRefs={sectionRefs}
            setAnswer={setAnswer}
            setNote={setNote}
            setPhoto={setPhoto}
            handleFileChange={handleFileChange}
          />
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shrink-0">
        <div className="max-w-lg mx-auto">
          {isSubmitted ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-destructive/30 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={18} />
                <span>{isDeleting ? "Siliniyor..." : "Sil"}</span>
              </button>
              <p className="flex-1 text-center text-sm text-muted-foreground py-2">Bu günlük saha kontrolü gönderildi.</p>
            </div>
          ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!record?.id || isLoadingRecord || isSavingDraft || isSubmitting || isDeleting}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-destructive/30 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              <span>Sil</span>
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={!canSave || isLoadingRecord || isSavingDraft || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSavingDraft ? "Kaydediliyor..." : "Kaydet"}</span>
            </button>
            <button
              type="button"
              onClick={submitForm}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              <span>{isSubmitting ? "Gönderiliyor..." : "Gönder"}</span>
            </button>
          </div>
          )}
        </div>
      </div>

      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Kaydedilmemiş değişiklikler</DialogTitle>
            <DialogDescription>
              Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setIsExitDialogOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg font-medium text-foreground hover:bg-muted">
              Vazgeç
            </button>
            <button onClick={handleConfirmExit} className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90">
              Çık
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Taslak silinsin mi?</DialogTitle>
            <DialogDescription>Taslak silinecek. Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg font-medium text-foreground hover:bg-muted">
              Vazgeç
            </button>
            <button onClick={handleConfirmDelete} className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90">
              Sil
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyFieldCheckPage;
