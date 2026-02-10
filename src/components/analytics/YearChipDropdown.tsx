import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Filtre chip’leri (Genel/Belek/Çandır/Manavgat) ile birebir aynı görünen yıl seçici: Button + Dropdown. */
const YEAR_CHIP_BUTTON_CLASS =
  "h-8 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1 bg-muted text-muted-foreground hover:bg-muted/80";

interface YearChipDropdownProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  id?: string;
  "aria-label"?: string;
}

export function YearChipDropdown({ years, value, onChange, id, "aria-label": ariaLabel }: YearChipDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          id={id}
          className={YEAR_CHIP_BUTTON_CLASS}
          aria-label={ariaLabel ?? "Yıl"}
          aria-haspopup="listbox"
        >
          <span>{value}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[4rem]" role="listbox">
        {years.map((y) => (
          <DropdownMenuItem
            key={y}
            role="option"
            className="text-xs"
            onClick={() => onChange(y)}
          >
            {y}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
