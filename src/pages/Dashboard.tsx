import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ScoreCircle from "@/components/ScoreCircle";
import ScoreChart from "@/components/ScoreChart";
import CampusCard from "@/components/CampusCard";
import GlobalWarningsModal from "@/components/GlobalWarningsModal";
import { useApp, calculateCampusScore, calculateGeneralScore, CAMPUS_WEIGHTS } from "@/contexts/AppContext";
import { formatDateDisplay } from "@/lib/date";
import {
  computeCampusMonthlyAverage,
  computeForecastYieldTonPerDaGeneral,
  type ScoredEntry,
} from "@/lib/forecastYield";

const getScoreInterpretation = (score: number) => {
  if (score < 40) return { text: "Kriz Durumu – Acil Müdahale Gerekiyor", className: "text-destructive" };
  if (score < 60) return { text: "Kötü – Acil Müdahale Gerekiyor", className: "text-destructive" };
  if (score < 75) return { text: "Orta – Müdahale Gerekiyor", className: "text-warning-foreground" };
  if (score < 90) return { text: "İyi – Takip Edilmesi Gereken Konular Var", className: "text-success" };
  return { text: "Çok İyi – Daha da İyileştirilebilir", className: "text-success" };
};

const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { gardens, inspections, getLatestBackendScoreForGarden, activeRole } = useApp();
  
  // State for campus-level critical warnings modal
  const [isCampusWarningsOpen, setIsCampusWarningsOpen] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  
  // Calculate campus-level data using new scoring functions
  const campusData = [
    { id: "belek", name: "Belek Kampüsü", weight: CAMPUS_WEIGHTS.belek },
    { id: "candir", name: "Çandır Kampüsü", weight: CAMPUS_WEIGHTS.candir },
    { id: "manavgat", name: "Manavgat Kampüsü", weight: CAMPUS_WEIGHTS.manavgat },
  ];
  
  // Helper: Backend'den bahçe için en son SUBMITTED inspection tarihini al
  const getLatestEvaluationDateForGarden = (gardenId: number): string | null => {
    const gardenInspections = inspections
      .filter(i => i.gardenId === gardenId && i.status === "SUBMITTED" && typeof i.score === "number")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return gardenInspections.length > 0 ? gardenInspections[0].createdAt : null;
  };

  const campuses = campusData.map(campus => {
    const campusGardens = gardens.filter(g => g.campusId === campus.id);
    let totalWarnings = 0;
    let latestDate: string | null = null;
    
    campusGardens.forEach(garden => {
      // Backend'den en son evaluation tarihini al
      const gardenLatestDate = getLatestEvaluationDateForGarden(garden.id);
      if (gardenLatestDate) {
        if (!latestDate || new Date(gardenLatestDate) > new Date(latestDate)) {
          latestDate = gardenLatestDate;
        }
      }
      // Use openCriticalWarningCount from garden instead of getOpenCriticalWarningsCount
      totalWarnings += garden.openCriticalWarningCount ?? 0;
    });
    
    // Use the new calculateCampusScore function (average of garden scores)
    // Sadece backend SUBMITTED inspections kullanılır
    // KRİTİK: Değerlendirilmemiş bahçeler ortalamaya dahil edilmez
    const campusScore = calculateCampusScore(campus.id, gardens, getLatestBackendScoreForGarden);
    
    // UI için display skoru (hesapta null kullanılır ama görselde 0 gösterilir)
    const campusScoreDisplay = campusScore ?? 0;
    
    // Son değerlendirme tarihini formatla
    let lastEvaluationText: string | null = null;
    if (latestDate) {
      lastEvaluationText = formatDateDisplay(latestDate);
    } else if (campusScore !== null) {
      lastEvaluationText = "Son değerlendirme mevcut";
    }
    
    return {
      id: campus.id,
      name: campus.name,
      gardenCount: campusGardens.length,
      criticalWarnings: totalWarnings,
      score: campusScoreDisplay, // UI için 0 gösterilebilir
      scoreRaw: campusScore, // Hesap için null olabilir
      lastEvaluation: lastEvaluationText,
    };
  });
  
  // Use new calculateGeneralScore function (weighted campus scores: Belek 60%, Çandır 20%, Manavgat 20%)
  // Sadece backend SUBMITTED inspections kullanılır
  // KRİTİK: Değerlendirilmemiş kampüsler ortalamaya dahil edilmez
  const overallScoreRaw = calculateGeneralScore(gardens, getLatestBackendScoreForGarden);
  
  // UI için display skoru (hesapta null kullanılır ama görselde 0 gösterilir)
  const overallScore = overallScoreRaw ?? 0;
  
  const interpretation = getScoreInterpretation(overallScore);

  // Tüm SUBMITTED inspections (scoreHistory için)
  const scoredInspections: ScoredEntry[] = inspections
    .filter(i => i.status === "SUBMITTED" && typeof i.score === "number")
    .map(i => {
      const garden = gardens.find(g => g.id === i.gardenId);
      return {
        createdAt: new Date(i.createdAt),
        score: i.score as number,
        campusId: garden?.campusId,
      };
    });

  const now = new Date();

  // Son 3 ay: grafik için aylık genel skorlar
  const scoreHistory = (() => {
    const months: { label: string; year: number; index: number }[] = [];
    for (let offset = 2; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({ label: monthNames[d.getMonth()], year: d.getFullYear(), index: d.getMonth() });
    }
    return months.map((m) => {
      const belekScore = computeCampusMonthlyAverage(scoredInspections, "belek", m.year, m.index);
      const candirScore = computeCampusMonthlyAverage(scoredInspections, "candir", m.year, m.index);
      const manavgatScore = computeCampusMonthlyAverage(scoredInspections, "manavgat", m.year, m.index);
      let weightedSum = 0, weightTotal = 0;
      if (belekScore !== null) { weightedSum += belekScore * 3; weightTotal += 3; }
      if (candirScore !== null) { weightedSum += candirScore * 1; weightTotal += 1; }
      if (manavgatScore !== null) { weightedSum += manavgatScore * 1; weightTotal += 1; }
      const genelScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : null;
      return { month: m.label, score: genelScore };
    });
  })();

  // Öngörülen verim: ortak util (son 12 ay, 3/1/1 kampüs ağırlığı, ay ağırlıkları, ton/da)
  const forecastTonPerDa = computeForecastYieldTonPerDaGeneral({ inspections, gardens });
  const forecastYieldText =
    forecastTonPerDa !== null ? forecastTonPerDa.toFixed(1).replace(".", ",") : null;

  const handleCampusCriticalClick = (campusId: string) => {
    setSelectedCampusId(campusId);
    setIsCampusWarningsOpen(true);
  };

  return (
    <div
      className="min-h-0 bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - var(--bottom-tab-height, 80px) - env(safe-area-inset-bottom, 0px))" }}
    >
      <Header title="Genel Bakış" showNotification showProfile />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Hero Score Card */}
        <div className="card-elevated p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-5">
            <ScoreCircle score={overallScore} size="lg" showMax />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Ortalama Performans
              </h2>
              <p className={`text-sm font-medium ${interpretation.className}`}>
                {interpretation.text}
              </p>
              {activeRole !== "CONSULTANT" && forecastYieldText !== null && (
                <p className="text-xs font-semibold text-muted-foreground mt-1">
                  Öngörülen Verim: {forecastYieldText} ton/da
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Score History Chart */}
        <div className="card-elevated p-3 pb-2">
          <p className="text-[10px] text-muted-foreground ml-1 mb-1">Son 3 aylık Ortalama</p>
          <ScoreChart data={scoreHistory} height={120} />
        </div>
        
        {/* Campus Cards */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">
            Kampüsler
          </h3>
          <div className="space-y-3">
            {campuses.map((campus) => (
              <CampusCard
                key={campus.id}
                name={campus.name}
                gardenCount={campus.gardenCount}
                criticalWarnings={campus.criticalWarnings}
                score={campus.score}
                lastEvaluation={campus.lastEvaluation}
                onClick={() => navigate(`/bahceler?kampus=${campus.id}`)}
                onWarningsClick={
                  campus.criticalWarnings > 0
                    ? () => handleCampusCriticalClick(campus.id)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </main>
      
      {/* Campus-level critical warnings modal */}
      <GlobalWarningsModal
        isOpen={isCampusWarningsOpen}
        onClose={() => {
          setIsCampusWarningsOpen(false);
          setSelectedCampusId(null);
        }}
        initialCampusId={selectedCampusId ?? undefined}
      />
      
      <BottomNav />
    </div>
  );
};

export default Dashboard;
