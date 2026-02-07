/**
 * GardenCard - Garden list item card
 * 
 * MATCHES Dashboard CampusCard layout exactly (without garden count)
 */

import ScoreCircle from "./ScoreCircle";
import CriticalBadge from "./CriticalBadge";
import { ChevronRight } from "lucide-react";

interface GardenCardProps {
  name: string;
  criticalWarnings: number;
  lastEvaluation: string | null;
  score: number;
  onClick?: () => void;
  onWarningsClick?: () => void;
}

const GardenCard = ({ 
  name, 
  criticalWarnings, 
  lastEvaluation,
  score,
  onClick,
  onWarningsClick
}: GardenCardProps) => {
  const hasWarnings = (criticalWarnings ?? 0) > 0;
  
  return (
    <div 
      className="card-elevated p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] min-h-[88px] flex items-stretch justify-between gap-3"
      onClick={onClick}
    >
      {/* Left block: Garden info (vertical stack, left-aligned) */}
      <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
        {/* Garden name */}
        <h3 className="text-base font-semibold text-foreground truncate">{name}</h3>
        
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
        {lastEvaluation && (
          <span className="text-xs text-muted-foreground">
            Son Değerlendirme: {lastEvaluation}
          </span>
        )}
      </div>
      
      {/* Right block: Score circle + Chevron (vertically centered) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ScoreCircle score={score} size="sm" />
        <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
};

export default GardenCard;
