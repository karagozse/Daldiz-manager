/**
 * CriticalWarningCard - Single Source of Truth for Critical Warning Display
 * 
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  THIS IS THE ONLY CRITICAL WARNING CARD COMPONENT                          ║
 * ║  Use this everywhere: Analysis, GlobalWarningsModal, CriticalWarningsModal ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - Clickable garden link that navigates to garden detail
 * - Consistent styling for open/closed warnings
 * - Shows topic, dates, and duration info
 */

import { useNavigate } from "react-router-dom";
import { INSPECTION_TOPICS } from "@/contexts/AppContext";

interface CriticalWarningCardProps {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "CLOSED";
  topicId: number;
  openedDate: string;
  closedDate?: string;
  closureNote?: string;
  gardenId?: number;
  gardenName?: string;
  campusName?: string;
  openDays?: number;
  onNavigateToGarden?: () => void;
  mode?: "default" | "evaluation";
  onClose?: () => void;
  showActions?: boolean;
}

const CriticalWarningCard = ({
  title,
  description,
  status,
  topicId,
  openedDate,
  closedDate,
  closureNote,
  gardenId,
  gardenName,
  campusName,
  openDays,
  onNavigateToGarden,
  mode = "default",
  onClose,
  showActions = true,
}: CriticalWarningCardProps) => {
  const navigate = useNavigate();

  const handleGardenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToGarden) {
      onNavigateToGarden();
    } else if (gardenId) {
      navigate(`/bahce/${gardenId}`);
    }
  };

  const topicName = INSPECTION_TOPICS.find(t => t.id === topicId)?.name || "Bilinmeyen";

  const calculatedOpenDays = openDays ?? Math.floor(
    (Date.now() - new Date(openedDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div 
      className={`p-3 rounded-xl border ${
        status === "OPEN" 
          ? "border-destructive/30 bg-destructive/5" 
          : "border-success/30 bg-success/5"
      }`}
    >
      {/* Header with title and status badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-foreground break-words">{title}</p>
        {mode === "default" && (
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            status === "OPEN"
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success"
          }`}>
            {status === "OPEN" ? "Açık" : "Kapalı"}
          </span>
        )}
        {mode === "evaluation" && status === "OPEN" && onClose && showActions && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-xs font-medium text-destructive bg-destructive/10 rounded-full px-3 py-1 hover:bg-destructive/15 flex-shrink-0 transition-colors"
          >
            Kapat
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground break-words mb-3">{description}</p>

      {/* Info Box */}
      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
        {/* Garden Link */}
        {mode === "default" && gardenName && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Bahçe</span>
            <button
              onClick={handleGardenClick}
              className="font-medium text-primary hover:underline"
              aria-label={`${gardenName} bahçesine git`}
            >
              {gardenName}
            </button>
          </div>
        )}
        
        {/* Topic */}
        {mode === "default" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Konu</span>
            <span className="font-medium">{topicName}</span>
          </div>
        )}

        {/* Open Duration - only for open warnings */}
        {status === "OPEN" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Açık Süre</span>
            <span className="font-medium text-destructive">{calculatedOpenDays} gün</span>
          </div>
        )}

        {/* Open Date */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Açılış Tarihi</span>
          <span className="font-medium">{new Date(openedDate).toLocaleDateString('tr-TR')}</span>
        </div>

        {/* Close Date - only for closed warnings */}
        {status === "CLOSED" && closedDate && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kapanış Tarihi</span>
            <span className="font-medium">{new Date(closedDate).toLocaleDateString('tr-TR')}</span>
          </div>
        )}

        {/* Closure Note - only for closed warnings */}
        {status === "CLOSED" && closureNote && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Kapanış Notu:</span> <span className="text-foreground">{closureNote}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CriticalWarningCard;
