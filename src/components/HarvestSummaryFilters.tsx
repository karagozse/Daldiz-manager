import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HarvestSummaryFilters as HarvestSummaryFiltersType } from "@/lib/harvest";
import { fetchAllHarvestTraders, type TraderSuggestion } from "@/lib/harvest";
import { useApp } from "@/contexts/AppContext";

const YEARS = [2026, 2027, 2028, 2029, 2030];

interface HarvestSummaryFiltersProps {
  filters: HarvestSummaryFiltersType;
  onChange: (f: HarvestSummaryFiltersType) => void;
  defaultYear?: number;
}

export function HarvestSummaryFilters({ filters, onChange, defaultYear }: HarvestSummaryFiltersProps) {
  const { gardens } = useApp();
  const [traders, setTraders] = useState<TraderSuggestion[]>([]);

  useEffect(() => {
    fetchAllHarvestTraders()
      .then(setTraders)
      .catch(() => setTraders([]));
  }, []);

  const campuses = (() => {
    const m = new Map<string, string>();
    gardens?.forEach((g) => {
      if (!m.has(g.campusId)) m.set(g.campusId, g.campusName ?? g.campusId);
    });
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  const gardensInCampus =
    filters.campusId != null && filters.campusId !== ""
      ? gardens?.filter((g) => g.campusId === filters.campusId) ?? []
      : gardens ?? [];

  const clearFilters = () => {
    onChange(defaultYear != null ? { year: defaultYear } : {});
  };

  const triggerClass =
    "h-8 w-full min-w-0 py-1.5 px-2 text-sm font-medium border-0 bg-muted/30 shadow-none text-center overflow-hidden whitespace-nowrap text-ellipsis [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:block [&>span]:text-center [&>svg]:w-3 [&>svg]:h-3";

  const itemClass = "whitespace-nowrap overflow-hidden text-ellipsis text-sm";

  return (
    <div className="grid grid-cols-4 gap-2 w-full overflow-hidden px-2 py-1.5 mb-3 items-center min-w-0">
      <div className="min-w-0">
        <Select
          value={filters.year != null ? String(filters.year) : "all"}
          onValueChange={(v) =>
            onChange({ ...filters, year: v === "all" ? undefined : parseInt(v, 10) })
          }
        >
          <SelectTrigger className={triggerClass} style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
            <SelectValue placeholder="Yıl" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className={itemClass}>Yıl</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)} className={itemClass}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0">
        <Select
          value={filters.campusId ?? "all"}
          onValueChange={(v) => {
            onChange({
              ...filters,
              campusId: v === "all" ? undefined : v,
              gardenId: undefined,
            });
          }}
        >
          <SelectTrigger className={triggerClass} style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
            <SelectValue placeholder="Kampüs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className={itemClass}>Tüm Kampüs</SelectItem>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id} className={itemClass}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0">
        <Select
          value={filters.gardenId != null ? String(filters.gardenId) : "all"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              gardenId: v === "all" ? undefined : parseInt(v, 10),
            })
          }
        >
          <SelectTrigger className={triggerClass} style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
            <SelectValue placeholder="Bahçe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className={itemClass}>Tüm Bahçe</SelectItem>
            {gardensInCampus.map((g) => (
              <SelectItem key={g.id} value={String(g.id)} className={itemClass}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0">
        <Select
          value={filters.trader ?? "all"}
          onValueChange={(v) => onChange({ ...filters, trader: v === "all" ? undefined : v })}
        >
          <SelectTrigger className={triggerClass} style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
            <SelectValue placeholder="Tüccar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className={itemClass}>Tüm Tüccarlar</SelectItem>
            {traders.map((t) => (
              <SelectItem key={t.id} value={t.name} className={itemClass}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
