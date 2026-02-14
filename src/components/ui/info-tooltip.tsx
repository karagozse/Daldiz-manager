import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring align-middle"
            aria-label="Bilgi"
          >
            <Info size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm" side="top">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
