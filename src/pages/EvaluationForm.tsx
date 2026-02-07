/**
 * EvaluationForm - Lead Auditor Evaluation Form
 * 
 * UNIFIED DESIGN SYSTEM:
 * - Topic cards start collapsed with progress indicator at top
 * - Scoring: 0, 25, 50, 75, 100 (single click buttons, NO slider)
 * - Previous score shown as reference text
 * - Open critical warnings shown, closable via centered modal
 * - NO top-level calculated score displayed
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useApp, INSPECTION_TOPICS, calculateGardenScore, CriticalWarning, TopicStatus, InspectionState, InspectionCycle, BackendInspection } from "@/contexts/AppContext";
import { mapBackendRoleToSemantic, can } from "@/lib/permissions";
import HeaderWithBack from "@/components/HeaderWithBack";
import BottomNav from "@/components/BottomNav";
import TopicScoreCircle from "@/components/TopicScoreCircle";
import CriticalWarningCard from "@/components/CriticalWarningCard";
import ExpandableNote from "@/components/ExpandableNote";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";
import { getPhotoUrl } from "@/lib/photoUtils";
import { CheckCircle2, ChevronRight, ChevronDown, Plus, Camera, Circle, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createCriticalWarning, updateCriticalWarning, fetchCriticalWarningsForGarden } from "@/lib/criticalWarnings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const getStatusLabel = (status: TopicStatus) => {
  switch (status) {
    case "uygun":
      return { label: "Uygun", className: "bg-success/10 text-success" };
    case "kismen_uygun":
      return { label: "Kısmen Uygun", className: "bg-warning/20 text-warning-foreground" };
    case "uygun_degil":
      return { label: "Uygun Değil", className: "bg-destructive/10 text-destructive" };
    default:
      return { label: "Bekliyor", className: "bg-muted text-muted-foreground" };
  }
};

// Score options: 0, 25, 50, 75, 100 (per spec)
const SCORE_OPTIONS = [0, 25, 50, 75, 100];

const EvaluationForm = () => {
  const { id: gardenIdParam, inspectionId } = useParams<{ id: string; inspectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    activeRole,
    gardens, 
    setInspectionCycles,
    getCompletedCyclesForGarden,
    getPendingEvaluationForGarden,
    inspections,
    updateInspection,
    loadInspectionsForGarden,
    loadInitialDataFromApi
  } = useApp();
  
  const gardenId = parseInt(gardenIdParam || "1");
  const garden = gardens.find(g => g.id === gardenId);
  const completedCycles = getCompletedCyclesForGarden(gardenId);
  
  // Simple back handler - always navigate to garden detail
  const handleBack = useCallback(() => {
    if (gardenId) {
      navigate(`/bahce/${gardenId}`);
    } else {
      // Fallback: go to gardens list
      navigate("/bahceler");
    }
  }, [gardenId, navigate]);
  
  // Track the evaluation ID we last initialized scores for
  // This prevents re-initializing scores when the same evaluation is re-fetched
  const lastInitializedEvaluationId = useRef<string | number | null>(null);
  
  // Initialize scores: use pending evaluation's existing scores if they exist,
  // otherwise leave as null (no default score)
  // Note: mockPendingEvaluation will be computed later in useMemo, so we initialize with empty scores
  const [scores, setScores] = useState<Record<number, number | null>>(() => {
    return INSPECTION_TOPICS.reduce((acc, t) => {
      return { ...acc, [t.id]: null };
    }, {} as Record<number, number | null>);
  });
  
  // Track which topics have been explicitly scored
  const [scoredTopics, setScoredTopics] = useState<Set<number>>(() => {
    return new Set<number>();
  });
  
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  
  // Initialize warnings - will be updated by useEffect
  const [warnings, setWarnings] = useState<CriticalWarning[]>([]);
  
  // Warning dialog
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [warningTopicId, setWarningTopicId] = useState<number | null>(null);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningDescription, setWarningDescription] = useState("");
  
  // Close warning dialog
  const [selectedWarning, setSelectedWarning] = useState<CriticalWarning | null>(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [closureNote, setClosureNote] = useState("");
  
  // Warnings modal for viewing topic warnings
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const [viewingTopicId, setViewingTopicId] = useState<number | null>(null);
  
  // Photo viewer state
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  
  // Validation modal for incomplete scoring
  // Prevent double submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Backend'den inspections yükle
  useEffect(() => {
    if (gardenId) {
      loadInspectionsForGarden(gardenId);
    }
  }, [gardenId, loadInspectionsForGarden]);

  // Load open critical warnings from backend on mount
  useEffect(() => {
    const loadOpenWarnings = async () => {
      if (!gardenId) return;

      try {
        const backendWarnings = await fetchCriticalWarningsForGarden(gardenId, "OPEN");
        
        // Merge backend warnings into state, avoiding duplicates by id
        setWarnings((prevWarnings) => {
          const existingById = new Map(prevWarnings.map((w) => [w.id, w]));
          
          backendWarnings.forEach((w) => {
            if (w.id && !existingById.has(w.id)) {
              existingById.set(w.id, w);
            }
          });
          
          return Array.from(existingById.values());
        });
      } catch (error) {
        console.error("Failed to load open critical warnings for garden", error);
      }
    };

    loadOpenWarnings();
  }, [gardenId]);
  
  // Single-layer flow: no SUBMITTED/REVIEW - redirect to garden
  const pendingInspection = null;
  
  // Keep backendPending for backward compatibility with existing code
  const backendPending = pendingInspection;
  
  // Mock pending evaluation (topics, warnings için gerekli)
  // Eğer backend'de SUBMITTED inspection varsa ama mockPendingEvaluation yoksa,
  // backend'den topics verilerini kullanarak mockPendingEvaluation oluştur
  const mockPendingEvaluationRaw = getPendingEvaluationForGarden(gardenId);
  
  // Backend'den topics varsa onu kullanarak InspectionCycle oluştur
  const mockPendingEvaluation = useMemo(() => {
    if (mockPendingEvaluationRaw) {
      return mockPendingEvaluationRaw;
    }
    
    // Backend'de SUBMITTED inspection varsa ama mockPendingEvaluation yoksa,
    // backend'den topics verilerini kullanarak oluştur
    // Topics boş olsa bile form açılmalı (boş topics ile başlar)
    if (backendPending) {
      return {
        id: backendPending.id,
        gardenId: backendPending.gardenId,
        state: "SUBMITTED_FOR_REVIEW" as InspectionState,
        consultantSubmissionDate: backendPending.createdAt,
        topics: backendPending.topics && backendPending.topics.length > 0
          ? backendPending.topics.map(t => ({
              topicId: t.topicId,
              topicName: t.topicName,
              status: t.status,
              note: t.note || "",
              photoUrl: t.photoUrl || undefined,
              score: t.score || undefined,
            }))
          : INSPECTION_TOPICS.map(t => ({
              topicId: t.id,
              topicName: t.name,
              status: "not_started" as TopicStatus,
              note: "",
            })),
        criticalWarnings: [],
      };
    }
    
    return null;
  }, [mockPendingEvaluationRaw, backendPending]);
  
  // Pending değerlendirme değiştiğinde skorları ilk defa yükle
  useEffect(() => {
    if (!mockPendingEvaluation) {
      // Evaluation yoksa tüm local state'i temizle
      lastInitializedEvaluationId.current = null;
      setScores({});
      setScoredTopics(new Set<number>());
      setWarnings([]);
      return;
    }

    const currentEvaluationId = mockPendingEvaluation.id;
    if (!currentEvaluationId) {
      return;
    }

    // Aynı evaluation için tekrar initialize etme
    if (lastInitializedEvaluationId.current === currentEvaluationId) {
      return;
    }

    const initialScores: Record<number, number | null> = {};
    const initialScoredTopics = new Set<number>();

    (mockPendingEvaluation.topics || []).forEach((topic) => {
      if (typeof topic.score === "number") {
        initialScores[topic.topicId] = topic.score;
        initialScoredTopics.add(topic.topicId);
      } else {
        initialScores[topic.topicId] = null;
      }
    });

    setScores(initialScores);
    setScoredTopics(initialScoredTopics);

    // Bu evaluation için gelen kritik uyarıları da başlangıç durumu olarak yükle
    const currentWarnings = mockPendingEvaluation.criticalWarnings || [];
    setWarnings(currentWarnings);

    lastInitializedEvaluationId.current = currentEvaluationId;
  }, [mockPendingEvaluation?.id, mockPendingEvaluation]);
  
  const hasPendingEvaluation = !!backendPending || !!mockPendingEvaluation;

  useEffect(() => {
    if (!hasPendingEvaluation && gardenId) {
      navigate(`/bahce/${gardenId}`);
    }
  }, [hasPendingEvaluation, gardenId, navigate]);

  if (!hasPendingEvaluation && gardenId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yönlendiriliyor...</p>
      </div>
    );
  }

  // Get previous scores from last completed cycle for REFERENCE only
  const previousCycle = completedCycles[0];
  const getPreviousScore = (topicId: number): number | null => {
    if (!previousCycle) return null;
    const prevTopic = previousCycle.topics.find(t => t.topicId === topicId);
    return prevTopic?.score ?? null;
  };
  
  // No automatic navigation - component only renders when route is accessed

  const role = mapBackendRoleToSemantic(activeRole ?? "");
  const canStartEvaluation = can.openPendingAudit(role);

  if (!canStartEvaluation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-muted-foreground text-center">
          Bu sayfaya erişim yetkiniz yok. Değerlendirme yapmak için denetçi veya root olarak giriş yapmalısınız.
        </p>
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <HeaderWithBack 
          title="Hata" 
          subtitle="Bahçe bulunamadı"
          onBack={handleBack}
        />
        <main className="px-4 py-4 max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="card-elevated p-6 text-center space-y-4">
            <p className="text-muted-foreground">Bahçe bulunamadı</p>
            <button
              onClick={() => navigate("/bahceler")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              Bahçelere Dön
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleScoreChange = (topicId: number, score: number) => {
    setScores(prev => ({ ...prev, [topicId]: score }));
    setScoredTopics(prev => new Set(prev).add(topicId));
  };

  const handleAddWarning = async () => {
    if (!warningTitle || !warningDescription || !warningTopicId) {
      toast({
        title: "Eksik bilgi",
        description: "Başlık ve açıklama zorunludur.",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }

    if (!pendingInspection) {
      toast({
        title: "Hata",
        description: "Değerlendirme bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update: create temporary warning with local ID
    const tempId = `warning-${Date.now()}`;
    const optimisticWarning: CriticalWarning = {
      id: tempId,
      topicId: warningTopicId,
      title: warningTitle,
      description: warningDescription,
      status: "OPEN",
      openedDate: new Date().toISOString(),
    };

    // Add to state immediately for responsive UI
    setWarnings(prev => [...prev, optimisticWarning]);
    setIsWarningDialogOpen(false);
    const savedTitle = warningTitle;
    const savedDescription = warningDescription;
    const savedTopicId = warningTopicId;
    setWarningTitle("");
    setWarningDescription("");
    setWarningTopicId(null);

    try {
      // Create warning via API
      const createdWarning = await createCriticalWarning(pendingInspection.id, {
        topicId: savedTopicId,
        title: savedTitle,
        description: savedDescription,
        severity: "HIGH", // Default to HIGH for now
      });

      // Replace optimistic warning with server response
      setWarnings(prev => prev.map(w => 
        w.id === tempId ? createdWarning : w
      ));

      toast({
        title: "Kritik uyarı eklendi",
        duration: 2500,
      });
    } catch (error) {
      console.error("Failed to create critical warning:", error);
      // Remove optimistic update on error
      setWarnings(prev => prev.filter(w => w.id !== tempId));
      toast({
        title: "Hata",
        description: "Kritik uyarı oluşturulurken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    }
  };

  const handleCloseWarning = async () => {
    if (!closureNote || !selectedWarning) {
      toast({
        title: "Kapanış notu zorunlu",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }

    // Check if warning has a backend ID (not a temporary local ID)
    // Warnings with IDs starting with "warning-" are local-only and haven't been created yet
    if (selectedWarning.id.startsWith("warning-")) {
      toast({
        title: "Hata",
        description: "Bu uyarı henüz kaydedilmedi. Lütfen bekleyin.",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }

    // Optimistic update: update warning status immediately
    const savedWarning = selectedWarning;
    setWarnings(prev => prev.map(w => 
      w.id === selectedWarning.id
        ? { ...w, status: "CLOSED" as const, closedDate: new Date().toISOString(), closureNote }
        : w
    ));
    
    setIsCloseDialogOpen(false);
    const savedClosureNote = closureNote;
    setSelectedWarning(null);
    setClosureNote("");

    try {
      // Update warning via API
      const updatedWarning = await updateCriticalWarning(savedWarning.id, {
        status: "CLOSED",
        closureNote: savedClosureNote,
      });

      // Replace optimistic update with server response
      setWarnings(prev => prev.map(w => 
        w.id === savedWarning.id ? updatedWarning : w
      ));

      toast({
        title: "Kritik uyarı kapatıldı",
      });
    } catch (error) {
      console.error("Failed to close critical warning:", error);
      // Revert optimistic update on error
      setWarnings(prev => prev.map(w => 
        w.id === savedWarning.id ? savedWarning : w
      ));
      toast({
        title: "Hata",
        description: "Kritik uyarı kapatılırken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    }
  };

  const handleCompleteEvaluation = async () => {
    // Prevent double submission
    if (!pendingInspection || isSubmitting) return;
    
    // Strict guard: Check that ALL topics have explicit numeric scores (including 0)
    // A topic is considered "scored" ONLY if score is a number (including 0).
    const unscoredTopics = INSPECTION_TOPICS.filter(
      (topicDef) => typeof scores[topicDef.id] !== "number"
    );
    
    if (unscoredTopics.length > 0) {
      // Show user-friendly error and BLOCK completion
      toast({
        title: "Eksik puanlama",
        description:
          "Tüm denetim konuları için skor vermeden değerlendirmeyi tamamlayamazsınız.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Topic bazlı skorları hazırla - backend'den gelen topics verilerini kullan
      const backendTopics = pendingInspection.topics || [];
      const updatedTopicsWithScores = INSPECTION_TOPICS.map(topicDef => {
        // Backend'den mevcut topic verisini bul
        const backendTopic = backendTopics.find(bt => bt.topicId === topicDef.id);
        // Kullanıcının verdiği skoru al - must be a number at this point (guard ensures this)
        const topicScore = scores[topicDef.id];
        
        // Type guard: ensure score is a number (should never fail due to guard above, but be explicit)
        if (typeof topicScore !== "number") {
          throw new Error(`Topic ${topicDef.id} (${topicDef.name}) has invalid score: ${topicScore}`);
        }
        
        return {
          topicId: topicDef.id,
          topicName: topicDef.name,
          status: backendTopic?.status || "not_started",
          note: backendTopic?.note || null,
          photoUrl: backendTopic?.photoUrl || null,
          score: topicScore, // Only numbers allowed - guard ensures this
        };
      });
      
      // Toplam bahçe skorunu hesapla
      const gardenScore = calculateGardenScore(updatedTopicsWithScores);
      
      await updateInspection(pendingInspection.id, {
        status: "SUBMITTED",
        score: Math.round(gardenScore),
        topics: updatedTopicsWithScores,
      });
      
      // Reload inspections to get updated state
      await loadInspectionsForGarden(gardenId);
      
      // Refresh gardens and critical warnings data after scoring
      await loadInitialDataFromApi();
      
      toast({
        title: "Değerlendirme tamamlandı",
        description: "Bahçe skoru güncellendi.",
        duration: 2500,
      });
      
      // Navigate back to garden detail
      handleBack();
    } catch (e) {
      console.error("handleCompleteEvaluation backend error:", e);
      toast({
        title: "Hata",
        description: "Değerlendirme kaydedilirken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const getOpenTopicWarnings = (topicId: number) =>
    warnings.filter(w => w.topicId === topicId && w.status === "OPEN");

  const handleViewTopicWarnings = (topicId: number) => {
    setViewingTopicId(topicId);
    setWarningsModalOpen(true);
  };

  // Progress calculation - count topics with explicit numeric scores
  const totalCount = INSPECTION_TOPICS.length;
  const scoredCount = INSPECTION_TOPICS.filter(
    (topicDef) => typeof scores[topicDef.id] === "number"
  ).length;

  const viewingWarnings = viewingTopicId 
    ? getOpenTopicWarnings(viewingTopicId)
    : [];
  
  const viewingTopicName = viewingTopicId
    ? INSPECTION_TOPICS.find(t => t.id === viewingTopicId)?.name || ""
    : "";

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: hasPendingEvaluation ? '100px' : '80px' }}>
      <HeaderWithBack 
        title="Değerlendirme Formu" 
        subtitle={garden.name}
        onBack={handleBack}
      />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Progress Indicator */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {scoredCount} / {totalCount} tamamlandı
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round((scoredCount / Math.max(totalCount, 1)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${(scoredCount / Math.max(totalCount, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Topic Evaluations */}
        <div className="space-y-3">
          {INSPECTION_TOPICS.map((topicDef) => {
            // Önce backend'den topics verisini kontrol et, yoksa mock'tan al
            const backendTopicData = backendPending?.topics?.find(t => t.topicId === topicDef.id);
            const mockTopicData = mockPendingEvaluation?.topics.find(t => t.topicId === topicDef.id);
            // Backend verisi varsa onu kullan, yoksa mock'u kullan
            const topicData = backendTopicData || mockTopicData;
            const isExpanded = expandedTopic === topicDef.id;
            const openWarnings = getOpenTopicWarnings(topicDef.id);
            const statusInfo = getStatusLabel(topicData?.status || "not_started");
            const previousScore = getPreviousScore(topicDef.id);
            const hasPreviousScore = previousScore !== null;
            const currentScore = scores[topicDef.id];
            const hasScore = currentScore !== null && currentScore !== undefined;
            
            return (
              <div key={topicDef.id} className="card-elevated overflow-hidden">
                {/* Collapsed View */}
                <button
                  onClick={() => setExpandedTopic(isExpanded ? null : topicDef.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* LEFT: Vertical column with title and status row */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      {/* Title row with icon */}
                      <div className="flex items-center gap-2">
                        {hasScore ? (
                          <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                        ) : (
                          <Circle size={18} className="text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{topicDef.name}</h4>
                          {!hasPreviousScore && !hasScore && (
                            <span className="text-xs text-muted-foreground">
                              Önceki değerlendirme yok
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Status row: Status pill */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status badge */}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    
                    {/* RIGHT: Score circle + Expand icon */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Score circle */}
                      {hasScore && currentScore !== null && currentScore !== undefined ? (
                        <TopicScoreCircle score={currentScore} />
                      ) : null}
                      
                      {/* Expand/collapse icon */}
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                    {/* Consultant Data */}
                    <ExpandableNote text={topicData?.note} label="Ziraat Danışmanı Notu" />
                    
                    <PhotoThumbnail
                      photoPath={topicData?.photoUrl}
                      onView={() => setPhotoViewerUrl(topicData?.photoUrl ?? null)}
                      size="sm"
                    />
                    
                    {/* Score Selector - 0, 25, 50, 75, 100 buttons */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-3">Puan</p>
                      
                      <div className="flex gap-2 mb-2">
                        {SCORE_OPTIONS.map((scoreOption) => (
                          <button
                            key={scoreOption}
                            onClick={() => handleScoreChange(topicDef.id, scoreOption)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              currentScore === scoreOption
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            aria-pressed={currentScore === scoreOption}
                            aria-label={`Skor: ${scoreOption}`}
                          >
                            {scoreOption}
                          </button>
                        ))}
                      </div>
                      
                      {/* Previous score reference */}
                      {hasPreviousScore ? (
                        <p className="text-xs text-muted-foreground">
                          Önceki değerlendirme skoru: {previousScore} puan
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Önceki değerlendirme yok
                        </p>
                      )}
                    </div>
                    
                    {/* Warnings */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">Kritik Uyarılar</p>
                        <button
                          onClick={() => {
                            setWarningTopicId(topicDef.id);
                            setIsWarningDialogOpen(true);
                          }}
                          className="text-xs text-primary flex items-center gap-1"
                          aria-label={`${topicDef.name} konusu için kritik uyarı ekle`}
                        >
                          <Plus size={14} />
                          Ekle
                        </button>
                      </div>
                      
                      {openWarnings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Açık kritik uyarı yok</p>
                      ) : (
                        <div className="space-y-3">
                          {openWarnings.map(warning => (
                            <CriticalWarningCard
                              key={warning.id}
                              id={warning.id}
                              title={warning.title}
                              description={warning.description}
                              status={warning.status}
                              topicId={warning.topicId}
                              openedDate={warning.openedDate}
                              closedDate={warning.closedDate}
                              closureNote={warning.closureNote}
                              gardenId={gardenId}
                              gardenName={garden?.name}
                              campusName={garden?.campusName}
                              onNavigateToGarden={undefined}
                              mode="evaluation"
                              onClose={() => {
                                setSelectedWarning(warning);
                                setIsCloseDialogOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Action - Her zaman göster (hasPendingEvaluation varsa) */}
      {hasPendingEvaluation && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={handleCompleteEvaluation}
              disabled={scoredCount < totalCount || isSubmitting}
              className={`w-full py-3 rounded-xl font-medium transition-colors ${
                scoredCount < totalCount || isSubmitting
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isSubmitting ? "Kaydediliyor..." : "Değerlendirmeyi Tamamla"}
            </button>
          </div>
        </div>
      )}

      {/* Add Warning Dialog - Centered */}
      <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kritik Uyarı Ekle</DialogTitle>
            <DialogDescription className="sr-only">
              Yeni bir kritik uyarı eklemek için başlık ve açıklama girin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="warningTitle" className="text-sm font-medium text-foreground mb-2 block">
                Başlık *
              </label>
              <Input
                id="warningTitle"
                value={warningTitle}
                onChange={(e) => setWarningTitle(e.target.value)}
                placeholder="Uyarı başlığı"
              />
            </div>
            
            <div>
              <label htmlFor="warningDescription" className="text-sm font-medium text-foreground mb-2 block">
                Açıklama *
              </label>
              <Textarea
                id="warningDescription"
                value={warningDescription}
                onChange={(e) => setWarningDescription(e.target.value)}
                placeholder="Detaylı açıklama..."
                rows={3}
              />
            </div>
            
            <button
              onClick={handleAddWarning}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              Kaydet
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Warning Dialog - Centered */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kritik Uyarıyı Kapat</DialogTitle>
            <DialogDescription>
              Bu uyarıyı kapatmak için bir kapanış notu girin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {selectedWarning && (
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="font-medium text-foreground">{selectedWarning.title}</p>
                <p className="text-sm text-muted-foreground">{selectedWarning.description}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="closureNote" className="text-sm font-medium text-foreground mb-2 block">
                Kapanış Notu *
              </label>
              <Textarea
                id="closureNote"
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                placeholder="Nasıl çözüldüğünü açıklayın..."
                rows={3}
              />
            </div>
            
            <button
              onClick={handleCloseWarning}
              className="w-full py-3 bg-success text-success-foreground rounded-xl font-medium"
            >
              Kapat
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warnings View Modal - Centered */}
      <Dialog open={warningsModalOpen} onOpenChange={setWarningsModalOpen}>
        <DialogContent className="flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b flex-shrink-0">
            <DialogTitle>Açık Kritik Uyarılar</DialogTitle>
            <DialogDescription>
              {viewingTopicName ? `${viewingTopicName} konusu için açık kritik uyarılar` : "Açık kritik uyarılar listesi"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {viewingWarnings.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Açık kritik uyarı yok
              </p>
            ) : (
              viewingWarnings.map((warning) => (
                <button
                  key={warning.id}
                  onClick={() => {
                    setWarningsModalOpen(false);
                    setSelectedWarning(warning);
                    setIsCloseDialogOpen(true);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-destructive/30 bg-destructive/5"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-foreground break-words">{warning.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex-shrink-0">
                      Açık
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{warning.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Açılış: {new Date(warning.openedDate).toLocaleDateString('tr-TR')}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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

export default EvaluationForm;
