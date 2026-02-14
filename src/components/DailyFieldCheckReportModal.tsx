/**
 * Saha Kontrol Raporu - okuma modu modal (Denetim Raporu ile aynı format).
 * dailyFieldCheckQuestionSet kullanır; Evet = kırmızı badge, Hayır = yeşil; açıklama.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { DailyFieldCheckFormState, FieldCheckAnswer } from "@/lib/dailyFieldCheckForm";
import { formFromSerializable, dailyFieldCheckQuestionSet, SECTION_KEYS } from "@/lib/dailyFieldCheckForm";
/** Report from backend (answers) or storage (form). */
export interface DailyFieldCheckReportForModal {
  id: string;
  gardenId: number;
  date: string;
  submittedAt?: string | null;
  form?: Record<string, unknown>;
  answers?: Record<string, unknown>;
}

interface DailyFieldCheckReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DailyFieldCheckReportForModal | null;
  gardenName: string;
}

export function DailyFieldCheckReportModal({
  open,
  onOpenChange,
  report,
  gardenName,
}: DailyFieldCheckReportModalProps) {
  if (!report) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saha Kontrol Raporu</DialogTitle>
            <DialogDescription>Saha kontrol raporu bulunamadı.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const formData = (report.form ?? report.answers ?? {}) as Record<string, unknown>;
  const form = formFromSerializable(formData) as DailyFieldCheckFormState;
  const dateLabel = formatDateDisplay(report.date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saha Kontrol Raporu</DialogTitle>
          <DialogDescription>
            {dateLabel} · {gardenName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {dailyFieldCheckQuestionSet.map((section, sectionIndex) => {
            const sectionKey = SECTION_KEYS[sectionIndex] ?? String(sectionIndex);
            const title = `${sectionKey}) ${section.title}`;
            return (
              <div key={sectionKey} className="card-elevated p-4">
                <h3 className="font-semibold text-foreground mb-3">{title}</h3>
                <div className="space-y-3">
                  {section.questions.map((q) => {
                    if (q.type === "photoRequired") {
                      return (
                        <div key={q.id}>
                          <p className="text-sm font-medium text-foreground mb-1">{q.text}</p>
                          <p className="text-xs text-muted-foreground">Referans bitki fotoğrafı (zorunlu alan)</p>
                        </div>
                      );
                    }
                    const ans = form[q.id] as FieldCheckAnswer | undefined;
                    if (!ans || typeof ans !== "object" || !("value" in ans)) return null;
                    const val = ans.value;
                    if (val === "") return null;
                    const isYes = val === "yes";
                    return (
                      <div key={q.id}>
                        <p className="text-sm font-medium text-foreground mb-1">{q.text}</p>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                            isYes ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"
                          )}
                        >
                          {isYes ? "Evet" : "Hayır"}
                        </span>
                        {ans.note?.trim() && (
                          <p className="text-sm text-muted-foreground mt-2 pl-2 border-l-2 border-border">{ans.note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
