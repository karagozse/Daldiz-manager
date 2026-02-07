import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, INSPECTION_TOPICS, CriticalWarning, BackendInspection } from "@/contexts/AppContext";
import HeaderWithBack from "@/components/HeaderWithBack";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ScoreCircle from "@/components/ScoreCircle";
import ScoreChart from "@/components/ScoreChart";
import TopicCard from "@/components/TopicCard";
import PreviousInspectionCard from "@/components/PreviousInspectionCard";
import CriticalWarningsModal from "@/components/CriticalWarningsModal";
import PreviousInspectionModal from "@/components/PreviousInspectionModal";
import { getPhotoUrl } from "@/lib/photoUtils";
import { Play, X } from "lucide-react";
import { fetchCriticalWarningsForGarden } from "@/lib/criticalWarnings";
import { formatDateDisplay } from "@/lib/date";
import { computeForecastYieldTonPerDaForGarden } from "@/lib/forecastYield";
import { mapBackendRoleToSemantic, can } from "@/lib/permissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const GardenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    gardens, 
    activeRole, 
    getDraftForGarden,
    inspections,
    loadInspectionsForGarden
  } = useApp();
  
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const [warningsModalTitle, setWarningsModalTitle] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>(undefined);
  
  // Previous inspection modal state
  const [showPreviousInspectionModal, setShowPreviousInspectionModal] = useState(false);
  const [previousInspectionForModal, setPreviousInspectionForModal] = useState<BackendInspection | null>(null);
  
  // Open warnings state for topic-level counts
  const [openWarnings, setOpenWarnings] = useState<CriticalWarning[]>([]);
  
  // Photo viewer state
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  
  const gardenId = parseInt(id || "1");
  const garden = gardens.find(g => g.id === gardenId);
  const role = mapBackendRoleToSemantic(activeRole ?? "");

  // Backend'den inspections yükle
  useEffect(() => {
    if (gardenId) {
      loadInspectionsForGarden(gardenId);
    }
  }, [gardenId, loadInspectionsForGarden]);

  // Load open critical warnings for topic-level counts
  useEffect(() => {
    const loadWarnings = async () => {
      if (!garden) return;
      try {
        const warnings = await fetchCriticalWarningsForGarden(garden.id, 'OPEN');
        setOpenWarnings(warnings);
      } catch (error) {
        console.error('Failed to load garden open warnings', error);
      }
    };

    loadWarnings();
  }, [garden?.id]);
  
  // Custom back handler - navigate to gardens list
  const handleBack = () => {
    navigate("/bahceler");
  };
  
  if (!garden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Bahçe bulunamadı</p>
      </div>
    );
  }
  
  // Backend inspections'ları kullanarak draft/pending/completed belirle
  const gardenInspections = inspections.filter(i => i.gardenId === gardenId);
  
  // SUBMITTED/REVIEW inspection - bekleyen değerlendirme
  const backendPending = gardenInspections.find(i => i.status === "SUBMITTED" || i.status === "REVIEW");
  
  // SCORED inspections - tamamlanmış değerlendirmeler (createdAt DESC - newest first)
  const backendScored = gardenInspections
    .filter(i => i.status === "SCORED" && typeof i.score === "number")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Latest and previous SCORED inspections
  const latestScored = backendScored[0] || null;
  const previousScored = backendScored[1] || null;
  
  // DRAFT inspection - taslak denetim
  // Backend'de SUBMITTED/REVIEW inspection varsa DRAFT gösterme
  const backendDraft = backendPending 
    ? null 
    : gardenInspections.find(i => i.status === "DRAFT");
  
  // Bekleyen değerlendirme var mı kontrol et
  const hasPendingEvaluation = !!backendPending;
  
  // Format date for chart X-axis (e.g., "15 Şub")
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };
  
  
  // Score history for chart - chronological order (oldest first, newest last)
  const scoreHistory = backendScored
    .slice()
    .reverse() // Reverse to chronological (oldest first)
    .slice(-3) // Take last 3 (most recent)
    .map((inspection) => ({
      month: formatChartDate(inspection.createdAt),
      score: inspection.score!,
    }));
  
  // Latest score from latestScored
  const latestScore = latestScored?.score ?? null;

  // Öngörülen verim (bahçe bazlı, son 12 ay) – CONSULTANT’ta gösterilmez
  const forecastTonPerDa = computeForecastYieldTonPerDaForGarden({
    inspections,
    gardenId,
  });
  const forecastText =
    forecastTonPerDa !== null ? forecastTonPerDa.toFixed(1).replace(".", ",") : null;
  
  // Last evaluation date
  const lastEvaluationDate = latestScored?.createdAt 
    ? new Date(latestScored.createdAt)
    : null;
  
  const evaluationDateText = lastEvaluationDate 
    ? formatDateDisplay(latestScored.createdAt)
    : null;

  /**
   * Handle starting a new inspection.
   * IMPORTANT: This does NOT create a DRAFT in the database.
   * DRAFT is only created when user explicitly clicks "Kaydet" or "Gönder" in the inspection form.
   */
  const handleStartInspection = () => {
    // Navigate to inspection form
    // The form will start with empty topics, and no DRAFT will be created until user saves
    navigate(`/bahce/${gardenId}/denetim`);
  };

  const handleContinueDraft = () => {
    // Backend'de SUBMITTED/REVIEW inspection varsa draft'a gitme
    if (backendPending) {
      handleEvaluate();
      return;
    }
    
    // Backend draft'ı kullan
    if (backendDraft) {
      navigate(`/bahce/${gardenId}/denetim`);
    }
  };

  const handleEvaluate = () => {
    // Backend pending inspection'ı kullan
    if (backendPending) {
      // Navigate to evaluation form with inspectionId in route
      navigate(`/bahce/${gardenId}/degerlendirme/${backendPending.id}`);
    }
    // Eğer backendPending yoksa, hasPendingEvaluation false olacak ve kart görünmeyecek
  };

  const handleViewPreviousInspection = () => {
    // Latest SCORED inspection'ı göster in modal
    if (latestScored) {
      setPreviousInspectionForModal(latestScored);
      setShowPreviousInspectionModal(true);
    }
  };

  // Get warning count for a specific topic from loaded openWarnings
  const getTopicWarningCount = (topicId: number): number => {
    if (!openWarnings || openWarnings.length === 0) return 0;
    return openWarnings.filter(
      (w) => w.topicId === topicId && w.status === 'OPEN'
    ).length;
  };
  
  // Garden-level critical warning count
  const gardenCriticalCount = garden?.openCriticalWarningCount ?? 0;

  // Handle clicking on a topic's critical alert badge
  const handleTopicWarningClick = (topicId: number, topicName: string) => {
    setSelectedTopicId(topicId);
    setWarningsModalTitle(topicName);
    setWarningsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <HeaderWithBack 
        title={garden.name} 
        subtitle={garden.campusName}
        onBack={handleBack}
      />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Score Hero Card - SAME layout as Dashboard/Gardens */}
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Bahçe Skoru
              </h3>
              <p className="text-sm text-muted-foreground">
                {evaluationDateText ? `Son Değerlendirme: ${evaluationDateText}` : "Henüz değerlendirme yapılmadı"}
              </p>
            </div>
            <ScoreCircle score={latestScore ?? 0} size="md" />
          </div>
          
          {scoreHistory.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Son 3 denetim</span>
                {activeRole !== "CONSULTANT" && forecastText !== null && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Öngörülen Verim: {forecastText} ton/da
                  </span>
                )}
              </div>
              <ScoreChart data={scoreHistory} height={120} />
            </>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
              Henüz değerlendirme yapılmadı
            </div>
          )}
        </div>

        {/* Draft notice: root, danisman only */}
        {can.seeStartAuditBtn(role) && backendDraft && (
          <div className="card-elevated p-4 border-l-4 border-warning">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Taslak Denetimin Var</h4>
                <p className="text-sm text-muted-foreground">Kaldığın yerden devam et</p>
              </div>
              <button 
                onClick={handleContinueDraft}
                className="px-4 py-2 bg-warning text-warning-foreground rounded-xl font-medium text-sm"
              >
                Devam Et
              </button>
            </div>
          </div>
        )}

        {/* Pending evaluation: root, danisman, denetci see it; yonetici does not. Only root, denetci can open. */}
        {can.seePendingAudits(role) && hasPendingEvaluation && (
          <div className="card-elevated p-4 border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Bekleyen Değerlendirme</h4>
                <p className="text-sm text-muted-foreground">
                  Ziraat danışmanı denetimi gönderdi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {backendPending
                    ? new Date(backendPending.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : ''}
                </p>
              </div>
              {can.openPendingAudit(role) ? (
                <button 
                  onClick={handleEvaluate}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
                >
                  Değerlendir
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <button 
                        type="button"
                        disabled
                        className="px-4 py-2 rounded-xl font-medium text-sm bg-muted text-muted-foreground cursor-not-allowed"
                      >
                        Değerlendir
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Yetkiniz yok</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Denetim Başlat: root, danisman only; hide when draft or pending exists */}
        {can.seeStartAuditBtn(role) && !backendDraft && !backendPending && (
          <button 
            onClick={handleStartInspection}
            className="w-full card-elevated p-4 flex items-center justify-center gap-2 text-primary font-medium hover:bg-primary/5 transition-colors"
            aria-label="Yeni denetim başlat"
          >
            <Play size={20} />
            <span>Denetim Başlat</span>
          </button>
        )}

        {/* Inspection Topics */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">Denetim Konuları</h3>
          <div className="space-y-3">
            {INSPECTION_TOPICS.map((topic) => {
              // Öncelik: 1) Latest SCORED inspection topics, 2) SUBMITTED inspection topics
              let latestData = null;
              
              // 1. Latest SCORED inspection'dan topics verilerini al
              if (latestScored && latestScored.topics) {
                const backendTopic = latestScored.topics.find((t: any) => t.topicId === topic.id);
                if (backendTopic) {
                  latestData = {
                    status: backendTopic.status,
                    note: backendTopic.note || undefined,
                    photoUrl: backendTopic.photoUrl || undefined,
                    score: backendTopic.score || undefined,
                  };
                }
              }
              
              // 2. SCORED yoksa SUBMITTED inspection'dan al
              if (!latestData && backendPending && backendPending.topics) {
                const backendTopic = backendPending.topics.find((t: any) => t.topicId === topic.id);
                if (backendTopic) {
                  latestData = {
                    status: backendTopic.status,
                    note: backendTopic.note || undefined,
                    photoUrl: backendTopic.photoUrl || undefined,
                    score: backendTopic.score || undefined,
                  };
                }
              }
              
              // Get topic-level warning count from loaded openWarnings
              const topicWarningCount = getTopicWarningCount(topic.id);
              
              return (
                <TopicCard
                  key={topic.id}
                  name={topic.name}
                  status={latestData?.status || "not_started"}
                  note={latestData?.note}
                  photoUrl={latestData?.photoUrl}
                  score={latestData?.score}
                  showScore={latestData?.score !== undefined}
                  warningCount={topicWarningCount}
                  onWarningClick={() => handleTopicWarningClick(topic.id, topic.name)}
                  onPhotoClick={latestData?.photoUrl ? () => setPhotoViewerUrl(latestData.photoUrl || null) : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Previous Inspection - Sadece 2+ SCORED inspection varsa göster */}
        {previousScored && (() => {
          // Calculate open critical warnings for this previous inspection
          // Filter warnings that belong to this inspection's garden and are still open
          const previousInspectionWarningCount = openWarnings.filter(
            w => w.gardenId === gardenId && w.status === "OPEN"
          ).length;
          
          return (
            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">Önceki Denetim</h3>
              <PreviousInspectionCard
                date={new Date(previousScored.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
                score={previousScored.score ?? 0}
                criticalWarningCount={previousInspectionWarningCount}
                onClick={() => {
                  if (previousScored) {
                    setPreviousInspectionForModal(previousScored);
                    setShowPreviousInspectionModal(true);
                  }
                }}
              />
            </div>
          );
        })()}
      </main>
      
      {/* Critical Warnings Modal - fetches from API */}
      <CriticalWarningsModal
        isOpen={warningsModalOpen}
        onClose={() => {
          setWarningsModalOpen(false);
          setSelectedTopicId(undefined);
        }}
        title={warningsModalTitle}
        gardenId={gardenId}
        status="OPEN"
        topicId={selectedTopicId}
      />
      
      {/* Previous Inspection Modal */}
      <PreviousInspectionModal
        open={showPreviousInspectionModal}
        onOpenChange={setShowPreviousInspectionModal}
        inspection={previousInspectionForModal}
        garden={garden}
        title="Denetim Raporu"
        showCriticalWarnings={false}
      />
      
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
      
      <BottomNav />
    </div>
  );
};

export default GardenDetail;
