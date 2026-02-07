/**
 * InspectionSummary Page
 * 
 * Design MUST match Garden Detail page exactly:
 * - Score card layout (no chart - only score circle)
 * - TopicCard components (same as GardenDetail)
 * - CriticalWarningsModal (same centered modal)
 * - Only OPEN warnings shown (closed warnings hidden)
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useApp, INSPECTION_TOPICS, TopicInspection } from "@/contexts/AppContext";
import HeaderWithBack from "@/components/HeaderWithBack";
import BottomNav from "@/components/BottomNav";
import ScoreCircle from "@/components/ScoreCircle";
import TopicCard from "@/components/TopicCard";
import CriticalWarningsModal from "@/components/CriticalWarningsModal";
import { formatDateDisplay } from "@/lib/date";

const InspectionSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    gardens, 
    inspections,
    viewingInspectionId,
    setViewingInspectionId,
    loadInspectionsForGarden
  } = useApp();
  
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const [warningsModalTitle, setWarningsModalTitle] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>(undefined);
  
  const gardenId = parseInt(id || "1");
  const garden = gardens.find(g => g.id === gardenId);
  const from = location.state?.from;
  
  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Load inspections for this garden if not already loaded
  useEffect(() => {
    if (gardenId && viewingInspectionId) {
      loadInspectionsForGarden(gardenId);
    }
  }, [gardenId, viewingInspectionId, loadInspectionsForGarden]);
  
  // Find inspection from backend by viewingInspectionId
  const backendInspection = inspections.find(i => i.id === viewingInspectionId);
  
  // Convert backend inspection to the format expected by UI
  const inspection = backendInspection ? {
    id: backendInspection.id,
    gardenId: backendInspection.gardenId,
    state: backendInspection.status === "SUBMITTED" ? "SUBMITTED" as const : "DRAFT" as const,
    topics: (backendInspection.topics as TopicInspection[]) || [],
    gardenScore: backendInspection.score || undefined,
    evaluationDate: backendInspection.createdAt, // Use createdAt as evaluation date
    criticalWarnings: [] as CriticalWarning[], // Critical warnings not yet in backend
  } : null;

  // Smart back navigation based on where we came from
  const handleBack = () => {
    setViewingInspectionId(null);
    
    if (from === "inspection_form") {
      // Go back to the form but ensure it knows the entry source
      navigate(`/bahce/${gardenId}/denetim`, {
        replace: true,
        state: { entry: "from_summary" },
      });
    } else if (from === "evaluation_form") {
      // Evaluation form handles its own logic - use replace to avoid duplicate entries
      navigate(`/bahce/${gardenId}/degerlendirme`, { replace: true });
    } else {
      // All other cases (including from garden_detail): navigate to garden detail and replace history
      // This prevents duplicate garden detail entries in history stack
      navigate(`/bahce/${gardenId}`, { replace: true });
    }
  };

  if (!garden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Bahçe bulunamadı</p>
      </div>
    );
  }

  if (!inspection || !viewingInspectionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Denetim bulunamadı</p>
      </div>
    );
  }

  // Get warning count for a specific topic - now fetched from backend API
  // For now, return 0 - badge count comes from backend openCriticalWarningCount at garden level
  // Topic-level counts would require additional backend support
  const getTopicWarningCount = (topicId: number): number => {
    // Topic-level warning counts would need backend support
    // For now, badge shows 0 - modal will fetch and filter by topicId when opened
    return 0;
  };

  // Handle clicking on a topic's critical alert badge
  const handleTopicWarningClick = (topicId: number, topicName: string) => {
    setSelectedTopicId(topicId);
    setWarningsModalTitle(topicName);
    setWarningsModalOpen(true);
  };

  // Calculate evaluation date for display
  const evaluationDate = inspection.evaluationDate 
    ? new Date(inspection.evaluationDate)
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <HeaderWithBack 
        title="Denetim Özeti" 
        subtitle={garden.name}
        onBack={handleBack}
      />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Score Card - SAME layout as GardenDetail (but no chart) */}
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Denetim Skoru
              </h3>
              {evaluationDate && (
                <p className="text-sm text-muted-foreground">
                  Son Değerlendirme: {formatDateDisplay(evaluationDate)}
                </p>
              )}
            </div>
            <ScoreCircle score={inspection.gardenScore || 0} size="md" />
          </div>
        </div>

        {/* Inspection Topics - SAME TopicCard as GardenDetail */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">Denetim Konuları</h3>
          <div className="space-y-3">
            {INSPECTION_TOPICS.map((topicDef) => {
              const topicData = inspection.topics.find(t => t.topicId === topicDef.id);
              const topicWarningCount = getTopicWarningCount(topicDef.id);
              
              return (
                <TopicCard
                  key={topicDef.id}
                  name={topicDef.name}
                  status={topicData?.status || "not_started"}
                  note={topicData?.note}
                  photoUrl={topicData?.photoUrl}
                  score={topicData?.score}
                  showScore={topicData?.score !== undefined}
                  warningCount={topicWarningCount}
                  onWarningClick={() => handleTopicWarningClick(topicDef.id, topicDef.name)}
                />
              );
            })}
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={handleBack}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
        >
          Tamam
        </button>
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
      
      <BottomNav />
    </div>
  );
};

export default InspectionSummary;
