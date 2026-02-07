/**
 * PreviousInspectionModal - Reusable modal for displaying previous inspection reports
 * 
 * Shows a compact read-only summary of an inspection in a modal dialog.
 * Used in GardenDetail, InspectionForm, and EvaluationForm instead of navigating to InspectionSummary page.
 */

import { useState, useEffect } from "react";
import { BackendInspection, Garden, INSPECTION_TOPICS, TopicInspection, CriticalWarning } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ScoreCircle from "@/components/ScoreCircle";
import TopicCard from "@/components/TopicCard";
import CriticalWarningsModal from "@/components/CriticalWarningsModal";
import { getPhotoUrl } from "@/lib/photoUtils";
import { Button } from "@/components/ui/button";
import { fetchCriticalWarningsForGarden } from "@/lib/criticalWarnings";
import { formatDateDisplay } from "@/lib/date";
import { X } from "lucide-react";

interface PreviousInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: BackendInspection | null;
  garden?: Garden | null;
  title?: string;
  showCriticalWarnings?: boolean;
}

const PreviousInspectionModal = ({
  open,
  onOpenChange,
  inspection,
  garden,
  title = "Önceki Denetim Raporu",
  showCriticalWarnings = true,
}: PreviousInspectionModalProps) => {
  // State for critical warnings for this inspection
  const [openWarnings, setOpenWarnings] = useState<CriticalWarning[]>([]);
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const [warningsModalTitle, setWarningsModalTitle] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>(undefined);
  
  // Photo viewer state
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);

  // Load open critical warnings for this inspection's garden when modal opens
  useEffect(() => {
    if (open && inspection && garden) {
      const loadWarnings = async () => {
        try {
          const warnings = await fetchCriticalWarningsForGarden(garden.id, "OPEN");
          setOpenWarnings(warnings);
        } catch (error) {
          console.error("Failed to load critical warnings for previous inspection", error);
          setOpenWarnings([]);
        }
      };
      loadWarnings();
    } else {
      setOpenWarnings([]);
    }
  }, [open, inspection, garden]);
  
  const handleTopicWarningClick = (topicId: number, topicName: string) => {
    setSelectedTopicId(topicId);
    setWarningsModalTitle(topicName);
    setWarningsModalOpen(true);
  };

  // If no inspection, show error message
  if (!inspection) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Gösterilecek denetim bulunamadı.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Convert backend inspection to the format expected by UI components
  const inspectionData = {
    id: inspection.id,
    gardenId: inspection.gardenId,
    state: inspection.status === "SUBMITTED" ? "SUBMITTED" as const : "DRAFT" as const,
    topics: (inspection.topics as TopicInspection[]) || [],
    gardenScore: inspection.score || undefined,
    evaluationDate: inspection.createdAt,
    criticalWarnings: [] as CriticalWarning[], // Not used - we use openWarnings state instead
  };

  // Get evaluation date for display (prefer scoredAt/updatedAt, fallback to createdAt)
  // Note: BackendInspection only has createdAt, so we use that
  const evaluationDate = inspection.createdAt || null;

  // Get OPEN warnings for a specific topic from loaded openWarnings
  const getTopicWarnings = (topicId: number): CriticalWarning[] => {
    return openWarnings.filter(
      w => w.topicId === topicId && w.status === "OPEN"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {garden?.name || "Denetim detayları"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Score Card */}
          <div className="card-elevated p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Denetim Skoru
                </h3>
                {evaluationDate && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Değerlendirme Tarihi:</span>{" "}
                    {formatDateDisplay(evaluationDate)}
                  </p>
                )}
              </div>
              <ScoreCircle score={inspectionData.gardenScore || 0} size="md" />
            </div>
          </div>

          {/* Inspection Topics */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Denetim Konuları</h3>
            <div className="space-y-3">
              {INSPECTION_TOPICS.map((topicDef) => {
                const topicData = inspectionData.topics.find(t => t.topicId === topicDef.id);
                const topicWarnings = getTopicWarnings(topicDef.id);
                
                return (
                  <TopicCard
                    key={topicDef.id}
                    name={topicDef.name}
                    status={topicData?.status || "not_started"}
                    note={topicData?.note}
                    photoUrl={topicData?.photoUrl}
                    score={topicData?.score}
                    showScore={topicData?.score !== undefined}
                    warningCount={showCriticalWarnings ? topicWarnings.length : 0}
                    onWarningClick={showCriticalWarnings ? () => handleTopicWarningClick(topicDef.id, topicDef.name) : undefined}
                    onPhotoClick={topicData?.photoUrl ? () => setPhotoViewerUrl(topicData.photoUrl || null) : undefined}
                    showCriticalWarnings={showCriticalWarnings}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Critical Warnings Modal */}
      {garden && showCriticalWarnings && (
        <CriticalWarningsModal
          isOpen={warningsModalOpen}
          onClose={() => {
            setWarningsModalOpen(false);
            setSelectedTopicId(undefined);
          }}
          title={warningsModalTitle}
          gardenId={garden.id}
          status="OPEN"
          topicId={selectedTopicId}
        />
      )}
      
      {/* Photo viewer modal */}
      {photoViewerUrl && (
        <Dialog
          open={!!photoViewerUrl}
          onOpenChange={(open) => {
            if (!open) {
              setPhotoViewerUrl(null);
            }
          }}
        >
          <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto h-auto border-none bg-transparent shadow-none p-0 flex items-center justify-center">
            <DialogTitle className="sr-only">Denetim fotoğrafı</DialogTitle>
            <DialogDescription className="sr-only">
              Denetim fotoğrafını büyük olarak görüntülüyorsunuz.
            </DialogDescription>
            <div className="relative max-w-[90vw] max-h-[90vh] w-auto h-auto flex items-center justify-center">
              {/* Close button */}
              <button
                type="button"
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md hover:bg-white transition-colors"
                onClick={() => setPhotoViewerUrl(null)}
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={getPhotoUrl(photoViewerUrl) ?? ""}
                alt="Denetim fotoğrafı"
                className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain rounded-xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default PreviousInspectionModal;
