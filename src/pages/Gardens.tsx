import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ScoreCircle from "@/components/ScoreCircle";
import ScoreChart from "@/components/ScoreChart";
import GardenCard from "@/components/GardenCard";
import CriticalWarningsModal from "@/components/CriticalWarningsModal";
import PrescriptionFormModal from "@/components/PrescriptionFormModal";
import PrescriptionViewModal from "@/components/PrescriptionViewModal";
import PrescriptionReviewModal from "@/components/PrescriptionReviewModal";
import { listPrescriptionsByCampus, getLatestPrescriptionByCampusAnyStatus, getPrescriptionEffectiveDate, type Prescription } from "@/lib/prescriptions";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { formatDateDisplay } from "@/lib/date";
import { computeForecastYieldTonPerDaForCampus } from "@/lib/forecastYield";
import { Play } from "lucide-react";
import { mapBackendRoleToSemantic, can } from "@/lib/permissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const Gardens = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("belek");
  
  // Set active tab from URL parameter on mount
  useEffect(() => {
    const kampus = searchParams.get("kampus");
    if (kampus && ["belek", "candir", "manavgat"].includes(kampus)) {
      setActiveTab(kampus);
    }
  }, [searchParams]);

  // Open prescription review modal when ?openPrescription= & ?kampus= (e.g. from Görev Merkezi)
  useEffect(() => {
    const kampus = searchParams.get("kampus");
    const openPrescription = searchParams.get("openPrescription");
    const id = openPrescription ? parseInt(openPrescription, 10) : NaN;
    if (kampus && ["belek", "candir", "manavgat"].includes(kampus) && !Number.isNaN(id)) {
      setActiveTab(kampus);
      setReviewingPrescriptionId(id);
      setPrescriptionReviewModalOpen(true);
    }
  }, [searchParams]);
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const [selectedGardenIdForModal, setSelectedGardenIdForModal] = useState<number | null>(null);
  const [warningsModalTitle, setWarningsModalTitle] = useState("");
  
  // Prescription modal states
  const [prescriptionFormModalOpen, setPrescriptionFormModalOpen] = useState(false);
  const [prescriptionViewModalOpen, setPrescriptionViewModalOpen] = useState(false);
  const [prescriptionReviewModalOpen, setPrescriptionReviewModalOpen] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<number | undefined>(undefined);
  const [reviewingPrescriptionId, setReviewingPrescriptionId] = useState<number | undefined>(undefined);
  
  // Veri yükleme artık AppContext'teki loadInitialDataFromApi üzerinden yapılıyor
  const {
    gardens,
    inspections,
    getLatestBackendScoreForGarden,
    setSelectedGardenId,
    activeRole,
    currentUser,
    prescriptions,
    listPrescriptionsByCampus: loadPrescriptionsByCampus,
    setPrescriptions,
    latestPrescriptionByCampus,
    pendingPrescriptionByCampus,
    loadLatestPrescriptionForCampus,
    loadPendingPrescriptionForCampus,
    loadPendingPrescriptions,
  } = useApp();
  
  const role = mapBackendRoleToSemantic(activeRole ?? "");

  // Get latest approved prescription from context
  const latestApprovedPrescription = latestPrescriptionByCampus?.[activeTab] ?? null;
  
  // Get pending prescription for current campus
  const pendingPrescriptionForCampus = pendingPrescriptionByCampus?.[activeTab] ?? null;
  
  // Get latest prescription (any status) for current campus
  const [latestPrescriptionForCampus, setLatestPrescriptionForCampus] = useState<Prescription | null>(null);
  
  const tabs = [
    { id: "belek", label: "Belek" },
    { id: "candir", label: "Çandır" },
    { id: "manavgat", label: "Manavgat" },
  ];
  
  const campusGardens = gardens.filter(g => g.campusId === activeTab);
  
  // Helper: Backend'den bahçe için en son SUBMITTED inspection tarihini al
  const getLatestEvaluationDateForGarden = (gardenId: number): string | null => {
    const gardenInspections = inspections
      .filter(i => i.gardenId === gardenId && i.status === "SUBMITTED" && typeof i.score === "number")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return gardenInspections.length > 0 ? gardenInspections[0].createdAt : null;
  };
  
  // Calculate campus score from backend SUBMITTED inspections
  // KRİTİK KURAL: Değerlendirilmemiş bahçeler ortalamaya dahil edilmez
  const gardenScores: number[] = [];
  let latestDate: string | null = null;
  
  // Collect all SUBMITTED evaluations from campus gardens for chart
  const allCampusEvaluations: { date: string; score: number }[] = [];
  
  campusGardens.forEach(g => {
    const latestScore = getLatestBackendScoreForGarden(g.id);
    
    // Sadece skoru olan bahçeleri hesaba kat
    if (latestScore !== null && typeof latestScore === "number") {
      gardenScores.push(latestScore);
      
      // En son evaluation tarihini bul
      const gardenLatestDate = getLatestEvaluationDateForGarden(g.id);
      if (gardenLatestDate) {
        if (!latestDate || new Date(gardenLatestDate) > new Date(latestDate)) {
          latestDate = gardenLatestDate;
        }
      }
    }
    
    // Chart için tüm SUBMITTED inspections'ları topla
    const gardenInspections = inspections
      .filter(i => i.gardenId === g.id && i.status === "SUBMITTED" && typeof i.score === "number")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    gardenInspections.forEach(inspection => {
      allCampusEvaluations.push({
        date: inspection.createdAt,
        score: inspection.score!
      });
    });
  });
  
  // Calculate average campus score - sadece skoru olan bahçeler dahil
  const campusScore: number | null = gardenScores.length > 0
    ? Math.round(gardenScores.reduce((a, b) => a + b, 0) / gardenScores.length)
    : null;
  
  // UI için display skoru (hesapta null kullanılır ama görselde 0 gösterilir)
  const campusScoreDisplay = campusScore ?? 0;
  
  const campusNames: Record<string, string> = {
    belek: "Belek Kampüsü",
    candir: "Çandır Kampüsü",
    manavgat: "Manavgat Kampüsü",
  };

  // Öngörülen verim (kampüs bazlı, son 12 ay) – CONSULTANT’ta gösterilmez
  const forecastTonPerDa = computeForecastYieldTonPerDaForCampus({
    inspections,
    gardens,
    campusId: activeTab,
  });
  const forecastText =
    forecastTonPerDa !== null ? forecastTonPerDa.toFixed(1).replace(".", ",") : null;
  
  // Son değerlendirme metni
  const lastEvaluationText = latestDate
    ? formatDateDisplay(latestDate)
    : (campusScore !== null ? "Son değerlendirme mevcut" : null);
  
  // Güncel Reçete için tarih label'ı - latestApprovedPrescription'dan al
  const latestApprovedDateLabel = getPrescriptionEffectiveDate(latestApprovedPrescription);
  
  // Aylık grafikler için Türkçe ay isimleri
  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  // Build chart data from monthly averages for this campus - always show last 3 months
  const scoreHistory = (() => {
    const now = new Date();
    
    // Always show last 3 months (M-2, M-1, M)
    const months: { label: string; year: number; index: number }[] = [];
    for (let offset = 2; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({
        label: monthNames[d.getMonth()],
        year: d.getFullYear(),
        index: d.getMonth(),
      });
    }

    // For each of the last 3 months, compute monthly average for this campus
    return months.map((m) => {
      const scoresForMonth = allCampusEvaluations
        .map(ev => ({ date: new Date(ev.date), score: ev.score }))
        .filter(ev => ev.date.getFullYear() === m.year && ev.date.getMonth() === m.index)
        .map(ev => ev.score);

      if (scoresForMonth.length === 0) {
        return { month: m.label, score: null };
      }

      const avg = Math.round(
        scoresForMonth.reduce((sum, s) => sum + s, 0) / scoresForMonth.length
      );

      return {
        month: m.label,
        score: avg,
      };
    });
  })();

  const hasCompletedEvaluations = scoreHistory.some(ev => ev.score !== null);

  const handleGardenClick = (gardenId: number) => {
    setSelectedGardenId(gardenId);
    navigate(`/bahce/${gardenId}`);
  };

  // Handle clicking garden card warning badge
  const handleGardenWarningClick = (gId: number, gName: string) => {
    setSelectedGardenIdForModal(gId);
    setWarningsModalTitle(gName);
    setWarningsModalOpen(true);
  };

  // Load latest prescription and pending prescriptions for current campus when tab changes
  useEffect(() => {
    if (activeTab) {
      loadLatestPrescriptionForCampus(activeTab);
      if (can.seePendingRecipes(role)) {
        loadPendingPrescriptionForCampus(activeTab);
        loadPendingPrescriptions();
      }
      const loadLatest = async () => {
        try {
          const latest = await getLatestPrescriptionByCampusAnyStatus(activeTab);
          setLatestPrescriptionForCampus(latest);
        } catch (error) {
          console.error("Failed to load latest prescription:", error);
          setLatestPrescriptionForCampus(null);
        }
      };
      loadLatest();
    }
  }, [activeTab, activeRole, role, loadLatestPrescriptionForCampus, loadPendingPrescriptionForCampus, loadPendingPrescriptions]);

  // Gardens sayfasında veya kampüs tab değiştiğinde: bu kampüsün güncel reçetesi yoksa (undefined) yeniden çek
  useEffect(() => {
    if (!currentUser) return;
    if (!activeTab) return;
    const current = latestPrescriptionByCampus?.[activeTab];
    if (current === undefined) {
      loadLatestPrescriptionForCampus(activeTab);
    }
  }, [currentUser, activeTab, latestPrescriptionByCampus, loadLatestPrescriptionForCampus]);
  
  // Reload latest prescription when prescriptions change
  useEffect(() => {
    if (activeTab) {
      const loadLatest = async () => {
        try {
          const latest = await getLatestPrescriptionByCampusAnyStatus(activeTab);
          setLatestPrescriptionForCampus(latest);
        } catch (error) {
          console.error("Failed to reload latest prescription:", error);
        }
      };
      loadLatest();
    }
  }, [activeTab, prescriptions]);

  const handlePrescriptionSaved = async () => {
    // Reload latest prescription and pending prescriptions after save/submit/delete
    if (activeTab) {
      await loadLatestPrescriptionForCampus(activeTab);
      await loadPendingPrescriptionForCampus(activeTab);
      // Reload latest prescription (any status)
      try {
        const latest = await getLatestPrescriptionByCampusAnyStatus(activeTab);
        setLatestPrescriptionForCampus(latest);
      } catch (error) {
        console.error("Failed to reload latest prescription:", error);
      }
      // Reload all prescriptions list for this campus
      await loadPrescriptionsByCampus(activeTab);
      if (can.seePendingRecipes(role)) {
        await loadPendingPrescriptions();
      }
    }
  };

  const handlePrescriptionReviewed = () => {
    handlePrescriptionSaved();
  };

  // Reçete Yaz / Onay Bekliyor: show row only for root, danisman, denetci (not yonetici)
  const showPrimaryPrescriptionRow =
    can.seeWriteRecipeBtn(role) || (can.seePendingRecipes(role) && !!pendingPrescriptionForCampus);

  const getTopButtonConfig = (): {
    text: string;
    disabled: boolean;
    onClick: () => void;
    canOpen?: boolean;
  } | null => {
    if (!showPrimaryPrescriptionRow) return null;
    if (can.seeWriteRecipeBtn(role) && !pendingPrescriptionForCampus) {
      return {
        text: "Reçete Yaz",
        disabled: false,
        onClick: () => {
          setEditingPrescriptionId(undefined);
          setPrescriptionFormModalOpen(true);
        },
      };
    }
    if (can.seePendingRecipes(role) && pendingPrescriptionForCampus) {
      const canOpen = can.openPendingRecipe(role);
      return {
        text: "Onay Bekliyor",
        disabled: !canOpen,
        onClick: canOpen
          ? () => {
              setReviewingPrescriptionId(pendingPrescriptionForCampus.id);
              setPrescriptionReviewModalOpen(true);
            }
          : () => {},
        canOpen,
      };
    }
    return null;
  };

  const topButtonConfig = getTopButtonConfig();

  return (
    <div
      className="min-h-0 bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - var(--bottom-tab-height, 80px) - env(safe-area-inset-bottom, 0px))" }}
    >
      <Header title="Bahçeler" showNotification showProfile />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Tab Navigation - Compact premium look */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button flex-1 ${
                activeTab === tab.id ? "tab-button-active" : "tab-button-inactive"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Campus Overview Card */}
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-0.5">
              <h3 className="text-lg font-semibold text-foreground">
                {campusNames[activeTab]}
              </h3>
              <p className="text-sm text-muted-foreground">
                {campusGardens.length} Bahçe
              </p>
              {lastEvaluationText && (
                <p className="text-xs text-muted-foreground">
                  Son Değerlendirme: {lastEvaluationText}
                </p>
              )}
              {campusScore === null && (
                <p className="text-xs text-muted-foreground">
                  Henüz değerlendirme yok
                </p>
              )}
            </div>
            <ScoreCircle score={campusScoreDisplay} size="md" />
          </div>
          
          {/* Chart or empty state */}
          {hasCompletedEvaluations ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Son 3 aylık Ortalama</span>
                {activeRole !== "CONSULTANT" && forecastText !== null && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Öngörülen Verim: {forecastText} ton/da
                  </span>
                )}
              </div>
              <ScoreChart data={scoreHistory} height={120} />
            </>
          ) : (
            <div className="h-[120px] flex items-center justify-center border border-dashed border-border/60 rounded-lg">
              <p className="text-sm text-muted-foreground">Henüz değerlendirme yok</p>
            </div>
          )}
          
          {/* Prescription Buttons - Güncel Reçete: all roles; Reçete Yaz/Onay: root, danisman, denetci per can */}
          <div className="flex flex-col gap-2 mt-4">
            {topButtonConfig && (
              topButtonConfig.disabled && topButtonConfig.canOpen === false ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <button
                        type="button"
                        disabled
                        className="w-full card-elevated p-4 flex items-center justify-center gap-2 text-muted-foreground font-medium opacity-50 cursor-not-allowed"
                        aria-label={topButtonConfig.text}
                      >
                        <span>{topButtonConfig.text}</span>
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Yetkiniz yok</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={topButtonConfig.onClick}
                  disabled={topButtonConfig.disabled}
                  className={topButtonConfig.disabled
                    ? "w-full card-elevated p-4 flex items-center justify-center gap-2 text-muted-foreground font-medium opacity-50 cursor-not-allowed"
                    : "w-full card-elevated p-4 flex items-center justify-center gap-2 text-primary font-medium hover:bg-primary/5 transition-colors"
                  }
                  aria-label={topButtonConfig.text}
                >
                  {!topButtonConfig.disabled && <Play size={20} />}
                  <span>{topButtonConfig.text}</span>
                </button>
              )
            )}
            {/* Güncel Reçete - all roles */}
            <Button
              variant={latestApprovedPrescription ? "default" : "outline"}
              onClick={() => {
                if (latestApprovedPrescription) {
                  setPrescriptionViewModalOpen(true);
                }
              }}
              disabled={!latestApprovedPrescription}
              className={`w-full ${
                latestApprovedPrescription 
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                  : ""
              }`}
              title={!latestApprovedPrescription ? "Henüz onaylanmış reçete yok." : undefined}
            >
              {latestApprovedDateLabel
                ? `Güncel Reçete - ${latestApprovedDateLabel}`
                : 'Güncel Reçete'}
            </Button>
          </div>
        </div>
        
        {/* Garden Cards */}
        <div className="space-y-3">
          {campusGardens.map((garden) => {
            // Backend'den skor al
            const latestScore = getLatestBackendScoreForGarden(garden.id);
            const warnings = garden.openCriticalWarningCount ?? 0;
            
            // Backend'den en son evaluation tarihini al
            const gardenLatestDate = getLatestEvaluationDateForGarden(garden.id);
            
            // UI için display skoru (hesapta null kullanılır ama görselde 0 gösterilir)
            const gardenScoreDisplay = latestScore ?? 0;
            
            return (
              <GardenCard
                key={garden.id}
                name={garden.name}
                criticalWarnings={warnings}
                lastEvaluation={gardenLatestDate ? formatDateDisplay(gardenLatestDate) : null}
                score={gardenScoreDisplay}
                onClick={() => handleGardenClick(garden.id)}
                onWarningsClick={() => handleGardenWarningClick(garden.id, garden.name)}
              />
            );
          })}
        </div>
      </main>
      
      {/* Garden Warnings Modal - fetches from API */}
      {selectedGardenIdForModal && (
        <CriticalWarningsModal
          isOpen={warningsModalOpen}
          onClose={() => {
            setWarningsModalOpen(false);
            setSelectedGardenIdForModal(null);
          }}
          title={warningsModalTitle}
          gardenId={selectedGardenIdForModal}
          status="OPEN"
        />
      )}

      {/* Prescription Form Modal */}
      <PrescriptionFormModal
        isOpen={prescriptionFormModalOpen}
        onClose={() => {
          setPrescriptionFormModalOpen(false);
          setEditingPrescriptionId(undefined);
        }}
        campusId={activeTab}
        campusName={campusNames[activeTab]}
        mode={editingPrescriptionId ? "edit" : "create"}
        prescriptionId={editingPrescriptionId}
        onSaved={handlePrescriptionSaved}
      />

      {/* Prescription View Modal */}
      <PrescriptionViewModal
        isOpen={prescriptionViewModalOpen}
        onClose={() => setPrescriptionViewModalOpen(false)}
        campusId={activeTab}
        campusName={campusNames[activeTab]}
        prescription={latestApprovedPrescription}
      />

      {/* Prescription Review Modal */}
      {reviewingPrescriptionId && (
        <PrescriptionReviewModal
          isOpen={prescriptionReviewModalOpen}
          onClose={() => {
            setPrescriptionReviewModalOpen(false);
            setReviewingPrescriptionId(undefined);
          }}
          prescriptionId={reviewingPrescriptionId}
          onReviewed={handlePrescriptionReviewed}
        />
      )}
      
      <BottomNav />
    </div>
  );
};

export default Gardens;
