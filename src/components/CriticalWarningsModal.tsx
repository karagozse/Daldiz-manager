/**
 * CriticalWarningsModal - Single Source of Truth for Critical Warnings Display
 * 
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  THIS IS THE ONLY CRITICAL WARNINGS MODAL COMPONENT                        ║
 * ║  Use this everywhere: Dashboard, Gardens, Garden Detail, Inspection        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * RULES:
 * - Always centered (horizontal + vertical)
 * - Fixed positioning
 * - Max height with internal scroll
 * - Responsive on mobile
 * - Uses CriticalWarningCard for consistent display
 * - Fetches data from backend API when opened
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { CriticalWarning, useApp } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CriticalWarningCard from "@/components/CriticalWarningCard";
import { fetchCriticalWarningsForGarden } from "@/lib/criticalWarnings";

interface CriticalWarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  gardenId: number; // Required - used to fetch warnings from API
  status?: "OPEN" | "CLOSED" | "all"; // Optional filter - defaults to "OPEN"
  topicId?: number; // Optional - filter by topic (filtered client-side after fetch)
}

const CriticalWarningsModal = ({ 
  isOpen, 
  onClose, 
  title,
  gardenId,
  status = "OPEN",
  topicId,
}: CriticalWarningsModalProps) => {
  const navigate = useNavigate();
  const { setSelectedGardenId, gardens } = useApp();
  const [warnings, setWarnings] = useState<CriticalWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Find garden info for display
  const garden = gardens.find(g => g.id === gardenId);

  // Fetch warnings when modal opens or filters change
  useEffect(() => {
    if (isOpen && gardenId) {
      setIsLoading(true);
      fetchCriticalWarningsForGarden(gardenId, status)
        .then((fetchedWarnings) => {
          // Filter by topicId if provided (client-side filtering)
          let filtered = fetchedWarnings;
          if (topicId !== undefined) {
            filtered = fetchedWarnings.filter(w => w.topicId === topicId);
          }
          setWarnings(filtered);
        })
        .catch((error) => {
          console.error("Error fetching critical warnings:", error);
          setWarnings([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setWarnings([]);
    }
  }, [isOpen, gardenId, status, topicId]);

  const handleNavigateToGarden = (gId: number) => {
    onClose();
    setSelectedGardenId(gId);
    navigate(`/bahce/${gId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bell size={20} className="text-destructive" />
            <span className="break-words">{title}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Bahçeye ait kritik uyarıların listesi.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Yükleniyor...</p>
            </div>
          ) : warnings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell size={32} className="mx-auto mb-2 opacity-50 text-destructive" />
              <p>Açık kritik uyarı bulunmuyor</p>
            </div>
          ) : (
            warnings.map((warning) => (
              <CriticalWarningCard
                key={warning.id}
                id={warning.id}
                title={warning.title}
                description={warning.description}
                status={warning.status}
                topicId={warning.topicId}
                openedDate={warning.openedDate}
                closedDate={warning.closedDate}
                gardenId={typeof warning.gardenId === "string" ? parseInt(warning.gardenId) : (warning.gardenId ?? gardenId)}
                gardenName={warning.gardenName ?? garden?.name}
                campusName={warning.campusName ?? garden?.campusName}
                onNavigateToGarden={() => handleNavigateToGarden(typeof warning.gardenId === "string" ? parseInt(warning.gardenId) : (warning.gardenId ?? gardenId))}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CriticalWarningsModal;