import { useState } from "react";
import { cn } from "@/lib/utils";

interface ExpandableNoteProps {
  text?: string | null;
  label?: string;
  placeholder?: string;
}

const ExpandableNote = ({ text, label = "Ziraat Danışmanı Notu", placeholder = "Not girilmedi" }: ExpandableNoteProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine if text is long enough to show expand/collapse (roughly 2-3 lines at ~40 chars/line)
  const isLongText = text && text.length > 120;
  
  return (
    <div className="space-y-1 w-full max-w-full">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative w-full max-w-full transition-all",
          isExpanded ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        {text ? (
          <p className="text-sm text-foreground whitespace-pre-wrap break-all leading-relaxed w-full max-w-full">
            {text}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic w-full max-w-full">{placeholder}</p>
        )}
        {!isExpanded && isLongText && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent"></div>
        )}
      </div>
      {isLongText && (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "Daha az göster" : "Daha fazla göster"}
        </button>
      )}
    </div>
  );
};

export default ExpandableNote;
