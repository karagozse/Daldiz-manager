import { ChevronRight } from "lucide-react";
import CriticalBadge from "./CriticalBadge";

interface PreviousInspectionCardProps {
  date: string;
  score: number;
  onClick: () => void;
  criticalWarningCount?: number;
  onCriticalClick?: () => void;
}

const PreviousInspectionCard = ({ date, score, onClick, criticalWarningCount = 0, onCriticalClick }: PreviousInspectionCardProps) => {
  return (
    <button 
      onClick={onClick}
      className="w-full card-elevated p-4 flex items-center justify-between hover:shadow-md transition-shadow text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground mb-0.5">Önceki Denetim</p>
        <p className="font-medium text-foreground">
          {date}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground">
            Skor: {score}
          </p>
          {criticalWarningCount > 0 && (
            <CriticalBadge 
              count={criticalWarningCount} 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onCriticalClick?.();
              }}
            />
          )}
        </div>
      </div>
      <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
    </button>
  );
};

export default PreviousInspectionCard;
