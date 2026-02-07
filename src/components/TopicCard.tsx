/**
 * TopicCard Component - Inspection Topic Card for Garden Detail
 * 
 * Layout Structure:
 * - TOP ROW: Topic name (left) + Status badge (right)
 * - SECOND ROW: Note preview (left) + Score circle (right)
 * - THIRD ROW: Photo thumbnail (left) + Critical alert badge if exists (right)
 * 
 * Uses CriticalBadge for consistent critical warning display
 */

import { Camera } from "lucide-react";
import ScoreCircle from "./ScoreCircle";
import CriticalBadge from "./CriticalBadge";
import ExpandableNote from "./ExpandableNote";
import { PhotoThumbnail } from "./PhotoThumbnail";
import { TopicStatus } from "@/contexts/AppContext";

interface TopicCardProps {
  name: string;
  status: TopicStatus;
  note?: string;
  photoUrl?: string;
  score?: number;
  showScore?: boolean;
  warningCount?: number;
  onWarningClick?: () => void;
  onClick?: () => void;
  onPhotoClick?: () => void;
  showCriticalWarnings?: boolean;
}

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

const TopicCard = ({ 
  name, 
  status, 
  note, 
  photoUrl,
  score,
  showScore = true,
  warningCount = 0,
  onWarningClick,
  onClick,
  onPhotoClick,
  showCriticalWarnings = true
}: TopicCardProps) => {
  const statusInfo = getStatusLabel(status);
  const hasWarning = warningCount > 0;

  return (
    <div 
      className="card-elevated p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] flex justify-between items-stretch min-h-[112px]"
      onClick={onClick}
    >
      {/* Left column: Topic content */}
      <div className="flex-1 min-w-0 pr-3">
        {/* TOP ROW: Topic name */}
        <div className="mb-3">
          <h4 className="font-semibold text-foreground flex-1 min-w-0 truncate">{name}</h4>
        </div>
        
        {/* SECOND ROW: Note preview */}
        <div className="mb-3">
          <ExpandableNote text={note} label="Ziraat Danışmanı Notu" />
        </div>
        
        {/* THIRD ROW: Photo thumbnail (only show if photo exists) */}
        {photoUrl && (
          <div className="flex items-center gap-3">
            <PhotoThumbnail
              photoPath={photoUrl}
              onView={(e) => {
                if (e) {
                  e.stopPropagation();
                }
                onPhotoClick?.();
              }}
              size="sm"
            />
          </div>
        )}
      </div>
      
      {/* Right column: Status badge (top), Score circle (middle), Critical badge (bottom) */}
      <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
        {/* Status badge - top right */}
        <div className="flex-shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
        
        {/* Score circle - middle right */}
        {showScore && score !== undefined && (
          <div className="flex-shrink-0">
            <ScoreCircle score={score} size="sm" />
          </div>
        )}
        
        {/* Critical alert badge - bottom right (reserve space even when not shown) */}
        <div className="flex-shrink-0 h-[24px] flex items-end">
          {showCriticalWarnings && hasWarning && (
            <CriticalBadge 
              count={warningCount}
              onClick={onWarningClick}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicCard;
