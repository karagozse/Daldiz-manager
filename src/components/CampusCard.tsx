/**
 * CampusCard - Campus summary card for Dashboard
 * 
 * Uses the same CriticalBadge component as GardenCard and TopicCard
 * for consistent critical warning display
 */

import ScoreCircle from "./ScoreCircle";
import CriticalBadge from "./CriticalBadge";
import { ChevronRight } from "lucide-react";

interface CampusCardProps {
  name: string;
  gardenCount: number;
  criticalWarnings: number;
  score: number;
  lastEvaluation: string;
  onClick?: () => void;
  onWarningsClick?: () => void;
}

const CampusCard = ({ 
  name, 
  gardenCount, 
  criticalWarnings, 
  score, 
  lastEvaluation,
  onClick,
  onWarningsClick
}: CampusCardProps) => {
  const hasWarnings = (criticalWarnings ?? 0) > 0;
  
  return (
    <div 
      className="card-elevated p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] min-h-[88px] flex items-stretch justify-between gap-3"
      onClick={onClick}
    >
      {/* Left block: Campus info (vertical stack, left-aligned) */}
      <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
        {/* Campus name */}
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{name}</h3>
          <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
        </div>
        
        {/* Garden count */}
        <p className="text-sm text-muted-foreground">{gardenCount} Bahçe</p>
        
        {/* Critical badge (only if >0) - width fit-content */}
        <div className="h-[20px] flex items-center">
          {hasWarnings && (
            <CriticalBadge 
              count={criticalWarnings}
              onClick={onWarningsClick}
              size="sm"
            />
          )}
        </div>
        
        {/* Last evaluation */}
        <span className="text-xs text-muted-foreground">
          Son Değerlendirme: {lastEvaluation}
        </span>
      </div>
      
      {/* Right block: Score circle (vertically centered) */}
      <div className="flex items-center flex-shrink-0">
        <ScoreCircle score={score} size="md" />
      </div>
    </div>
  );
};

export default CampusCard;
