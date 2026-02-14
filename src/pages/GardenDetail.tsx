import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import HeaderWithBack from "@/components/HeaderWithBack";
import BottomNav from "@/components/BottomNav";
import ScoreCircle from "@/components/ScoreCircle";
import ScoreChart from "@/components/ScoreChart";
import PreviousInspectionModal from "@/components/PreviousInspectionModal";
import CriticalBadge from "@/components/CriticalBadge";
import CriticalWarningsModal from "@/components/CriticalWarningsModal";
import { getDailyFieldCheckStatus } from "@/lib/dailyFieldCheckStorage";
import { Play, ClipboardCheck } from "lucide-react";
import { formatDateDisplay } from "@/lib/date";
import { computeForecastYieldTonPerDaForGarden } from "@/lib/forecastYield";
import { mapBackendRoleToSemantic, can } from "@/lib/permissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const GardenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    gardens, 
    activeRole, 
    inspections,
    loadInspectionsForGarden
  } = useApp();
  
  // Denetim Raporu modal (same as Analysis - PreviousInspectionModal)
  const [inspectionReportModalOpen, setInspectionReportModalOpen] = useState(false);
  // Guard: open modal after fetch when user clicks before data loaded
  const [wantToOpenReportModal, setWantToOpenReportModal] = useState(false);
  const [justFetchedReport, setJustFetchedReport] = useState(false);
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const { toast } = useToast();
  
  const gardenId = parseInt(id || "1");
  const garden = gardens.find(g => g.id === gardenId);
  const role = mapBackendRoleToSemantic(activeRole ?? "");

  // Backend'den inspections yükle
  useEffect(() => {
    if (gardenId) {
      loadInspectionsForGarden(gardenId);
    }
  }, [gardenId, loadInspectionsForGarden]);

  // After fetching inspections for "Denetim Raporu", open modal or show toast
  useEffect(() => {
    if (!wantToOpenReportModal || !justFetchedReport || !gardenId) return;
    const gardenInspections = inspections.filter(i => i.gardenId === gardenId);
    const backendScored = gardenInspections
      .filter(i => i.status === "SUBMITTED" && typeof i.score === "number")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = backendScored[0] ?? null;
    if (latest) {
      setInspectionReportModalOpen(true);
    } else {
      toast({ title: "Henüz denetim raporu bulunamadı.", variant: "destructive" });
    }
    setWantToOpenReportModal(false);
    setJustFetchedReport(false);
  }, [wantToOpenReportModal, justFetchedReport, gardenId, inspections, toast]);
  
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
  
  // Single-layer flow: no separate pending evaluation
  const backendPending = null;
  
  // SUBMITTED inspections - tamamlanmış değerlendirmeler (createdAt DESC - newest first)
  const backendScored = gardenInspections
    .filter(i => i.status === "SUBMITTED" && typeof i.score === "number")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Latest and previous SUBMITTED inspections
  const latestScored = backendScored[0] || null;
  const previousScored = backendScored[1] || null;
  
  // DRAFT inspection - taslak denetim
  const backendDraft = gardenInspections.find(i => i.status === "DRAFT");
  
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
    if (backendDraft) {
      navigate(`/bahce/${gardenId}/denetim`);
    }
  };

  const handleEvaluate = () => {
    navigate(`/bahce/${gardenId}/denetim`);
  };

  const handleDenetimRaporuClick = async () => {
    if (latestScored) {
      setInspectionReportModalOpen(true);
      return;
    }
    setWantToOpenReportModal(true);
    await loadInspectionsForGarden(gardenId);
    setJustFetchedReport(true);
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
                Denetim
              </h3>
              <p className="text-sm text-muted-foreground">
                {evaluationDateText ? `Son Denetim: ${evaluationDateText}` : "Henüz değerlendirme yapılmadı"}
              </p>
              {/* Aynı tasarım: Bahçeler sayfasındaki "X Kritik" göstergesi - sadece count > 0 iken */}
              {(garden.openCriticalWarningCount ?? 0) > 0 && (
                <div className="h-[20px] flex items-center mt-3">
                  <CriticalBadge
                    count={garden.openCriticalWarningCount ?? 0}
                    onClick={() => setWarningsModalOpen(true)}
                    size="sm"
                  />
                </div>
              )}
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
          {/* Denetim Başlat + Denetim Raporu - alt alta, Reçete Yaz / Güncel Reçete ile aynı stil */}
          <div className="flex flex-col gap-2 mt-4">
            {can.seeStartAuditBtn(role) && !backendDraft && !backendPending && (
              <button
                type="button"
                onClick={handleStartInspection}
                className="w-full card-elevated p-4 flex items-center justify-center gap-2 text-primary font-medium hover:bg-primary/5 transition-colors"
                aria-label="Denetim başlat"
              >
                <Play size={20} />
                <span>Denetim Başlat</span>
              </button>
            )}
            <Button
              type="button"
              onClick={handleDenetimRaporuClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              Denetim Raporu
            </Button>
          </div>
        </div>

        {/* Günlük Saha Kontrolü - Denetim kartının altında */}
        {(() => {
          const fieldCheckStatus = getDailyFieldCheckStatus(gardenId);
          if (fieldCheckStatus === "SUBMITTED") {
            return (
              <div className="w-full card-elevated p-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <ClipboardCheck size={20} />
                <span>Bugün gönderildi</span>
              </div>
            );
          }
          return (
            <button
              type="button"
              onClick={() => navigate(`/bahce/${gardenId}/saha-kontrol`)}
              className="w-full card-elevated p-4 flex items-center justify-center gap-2 text-primary font-medium hover:bg-primary/5 transition-colors"
              aria-label={fieldCheckStatus === "DRAFT" ? "Günlük saha kontrolüne devam et" : "Günlük saha kontrolü başlat"}
            >
              <ClipboardCheck size={20} />
              <span>{fieldCheckStatus === "DRAFT" ? "Günlük Saha Kontrolü Devam Et" : "Günlük Saha Kontrolü Başlat"}</span>
            </button>
          );
        })()}

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

      </main>
      
      {/* Denetim Raporu: same modal as Analysis (PreviousInspectionModal) */}
      <PreviousInspectionModal
        open={inspectionReportModalOpen}
        onOpenChange={setInspectionReportModalOpen}
        inspection={latestScored}
        garden={garden}
        title="Denetim Raporu"
        showCriticalWarnings={false}
      />
      
      {/* Açık kritik uyarılar listesi - Bahçeler sayfasındaki ile aynı modal */}
      <CriticalWarningsModal
        isOpen={warningsModalOpen}
        onClose={() => setWarningsModalOpen(false)}
        title="Kritik Uyarılar"
        gardenId={gardenId}
        status="OPEN"
      />

      <BottomNav />
    </div>
  );
};

export default GardenDetail;
