/**
 * Günlük Saha Kontrolü form gövdesi (ilerleme + bölümler). dailyFieldCheckQuestionSet'ten render edilir.
 */

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyFieldCheckFormState, FieldCheckAnswer } from "@/lib/dailyFieldCheckForm";
import { dailyFieldCheckQuestionSet, SECTION_KEYS } from "@/lib/dailyFieldCheckForm";

/** Soru metni + sonunda i ikonu; tıklanınca açıklama açılır/kapanır (mobil uyumlu collapsible) */
function QuestionLabelWithInfo({ text, info }: { text: string; info?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-foreground leading-snug inline-flex items-baseline gap-1 flex-wrap">
        <span>{text}</span>
        {info && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground shrink-0"
            aria-expanded={open}
            aria-label="Bilgi"
          >
            <Info size={14} className="shrink-0" />
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </p>
      {info && open && (
        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">{info}</p>
      )}
    </div>
  );
}

export interface DailyFieldCheckFormBodyProps {
  form: DailyFieldCheckFormState;
  setForm: React.Dispatch<React.SetStateAction<DailyFieldCheckFormState>>;
  errors: Record<string, string>;
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  setAnswer: (key: string, value: "yes" | "no") => void;
  setNote: (key: string, value: string) => void;
  setPhoto: (key: string, file: File | null, preview: string | null) => void;
  handleFileChange: (key: string, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DailyFieldCheckFormBody({
  form,
  setForm,
  errors,
  sectionRefs,
  setAnswer,
  setNote,
  setPhoto,
  handleFileChange,
}: DailyFieldCheckFormBodyProps) {
  const yesNoButtonClass = (selected: boolean, isYes: boolean) =>
    cn(
      "flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-colors",
      selected
        ? isYes
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success"
        : "border-border text-muted-foreground hover:border-foreground/30"
    );

  const completedSections = SECTION_KEYS.filter((sk, sectionIndex) => {
    const section = dailyFieldCheckQuestionSet[sectionIndex];
    if (!section) return false;
    return section.questions.every((q) => {
      const a = form[q.id];
      if (q.type === "photoRequired") return true; // Foto opsiyonel - bloklamaz
      return (a?.value ?? "") !== "";
    });
  }).length;

  const totalSections = dailyFieldCheckQuestionSet.length;

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">İlerleme</span>
          <span className="text-sm text-muted-foreground">{completedSections}/{totalSections}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(completedSections / totalSections) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {dailyFieldCheckQuestionSet.map((section, sectionIndex) => {
          const sectionKey = SECTION_KEYS[sectionIndex] ?? String(sectionIndex);
          const sectionError = errors[sectionKey];
          return (
            <div
              key={sectionKey}
              ref={(el) => { sectionRefs.current[sectionKey] = el; }}
              className={cn("card-elevated p-4", sectionError && "ring-2 ring-destructive/50")}
            >
              <h3 className="font-semibold text-foreground mb-3">{sectionKey}) {section.title}</h3>
              {sectionError && <p className="text-xs text-destructive mb-2">{sectionError}</p>}
              <div className="space-y-4">
                {section.questions.map((q) => {
                  const a: FieldCheckAnswer = form[q.id] ?? { value: "", note: "", photoFile: null, photoPreview: null };
                  const val = a.value;
                  const hasPhoto = !!(a.photoFile || a.photoPreview);

                  if (q.type === "photoRequired") {
                    return (
                      <div key={q.id}>
                        <QuestionLabelWithInfo text={q.text} info={q.info} />
                        <div className="mt-2">
                          <label className="block text-xs text-muted-foreground mb-2">Referans foto (opsiyonel)</label>
                          <input type="file" accept="image/*" className="hidden" id={`photo-${q.id}`} onChange={(e) => handleFileChange(q.id, e)} />
                          {hasPhoto ? (
                            <div className="flex items-center gap-4">
                              <img src={a.photoPreview!} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                              <div className="flex gap-2">
                                <label htmlFor={`photo-${q.id}`} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted cursor-pointer">Değiştir</label>
                                <button type="button" onClick={() => setPhoto(q.id, null, null)} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-destructive/30 bg-destructive/10 text-destructive">Sil</button>
                              </div>
                            </div>
                          ) : (
                            <label htmlFor={`photo-${q.id}`} className="flex w-full h-28 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/50 hover:border-primary/50 hover:bg-muted flex-col items-center justify-center gap-2 cursor-pointer">
                              <Camera className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">Fotoğraf ekle</span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={q.id}>
                      <QuestionLabelWithInfo text={q.text} info={q.info} />
                      <div className="flex gap-2" role="radiogroup">
                        <button type="button" onClick={() => setAnswer(q.id, "yes")} className={yesNoButtonClass(val === "yes", true)}>Evet</button>
                        <button type="button" onClick={() => setAnswer(q.id, "no")} className={yesNoButtonClass(val === "no", false)}>Hayır</button>
                      </div>
                      {val === "yes" && (
                        <>
                          <div className="mt-2">
                            <label className="text-sm font-medium text-foreground mb-2 block">Açıklama <span className="text-xs text-muted-foreground font-normal">(zorunlu)</span></label>
                            <Textarea value={a.note ?? ""} onChange={(e) => setNote(q.id, e.target.value)} placeholder="Açıklama girin..." rows={4} />
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs text-muted-foreground mb-2">Fotoğraf (opsiyonel)</label>
                            <input type="file" accept="image/*" className="hidden" id={`photo-${q.id}`} onChange={(e) => handleFileChange(q.id, e)} />
                            {hasPhoto ? (
                              <div className="flex items-center gap-4">
                                <img src={a.photoPreview!} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                                <div className="flex gap-2">
                                  <label htmlFor={`photo-${q.id}`} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted cursor-pointer">Değiştir</label>
                                  <button type="button" onClick={() => setPhoto(q.id, null, null)} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-destructive/30 bg-destructive/10 text-destructive">Sil</button>
                                </div>
                              </div>
                            ) : (
                              <label htmlFor={`photo-${q.id}`} className="flex w-full h-28 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/50 hover:border-primary/50 hover:bg-muted flex-col items-center justify-center gap-2 cursor-pointer">
                                <Camera className="h-8 w-8 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Fotoğraf ekle</span>
                              </label>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
