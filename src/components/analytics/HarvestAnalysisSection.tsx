import { useState, useMemo, useEffect } from "react";
import { ChevronDown, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { formatOneDecimalTR } from "@/lib/format";
import { CAMPUS_AREAS, GARDEN_AREAS, CAMPUS_LABELS } from "@/constants/area";
import { fetchHarvestSummary, type HarvestSummaryRow } from "@/lib/harvest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANALYSIS_FILTER_ROW_CLASS,
  ANALYSIS_CHART_CONTAINER_CLASS,
  ANALYSIS_TICK_STYLE,
  ANALYSIS_TOOLTIP_STYLE,
  ANALYSIS_XAXIS_PADDING,
} from "@/components/analytics/AnalysisChartFrame";
import { YearChipDropdown } from "@/components/analytics/YearChipDropdown";

function getCampusKey(row: HarvestSummaryRow): "belek" | "candir" | "manavgat" {
  const campus = (row.campus_name || "").toLowerCase();
  const garden = (row.garden_name || "").trim();
  if (campus.includes("belek") || garden.startsWith("Belek") || garden.toLowerCase().startsWith("belek")) return "belek";
  if (campus.includes("candir") || campus.includes("çandır") || garden.startsWith("Candir") || garden.toLowerCase().startsWith("candir")) return "candir";
  if (campus.includes("manavgat") || garden.startsWith("Manavgat") || garden.toLowerCase().startsWith("manavgat")) return "manavgat";
  return "belek";
}

const HARVEST_YEARS = [2026, 2027, 2028, 2029, 2030];

export function HarvestAnalysisSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [harvestYear, setHarvestYear] = useState(() => {
    const y = new Date().getFullYear();
    if (y >= 2026 && y <= 2030) return y;
    return y < 2026 ? 2026 : 2030;
  });
  const [selectedCampus, setSelectedCampus] = useState<"all" | "belek" | "candir" | "manavgat">("all");
  const [rows, setRows] = useState<HarvestSummaryRow[] | null>(null);
  const [selectedBar, setSelectedBar] = useState<{ name: string; tonPerDekar: number } | null>(null);

  const campusFilterOptions = [
    { value: "all", label: "Tum Kampusler" },
    { value: "belek", label: "Belek" },
    { value: "candir", label: "Candir" },
    { value: "manavgat", label: "Manavgat" },
  ] as const;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchHarvestSummary({ year: harvestYear })
      .then((res) => {
        if (!cancelled) setRows(res.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, harvestYear]);

  const campusData = useMemo(() => {
    const list = rows ?? [];
    const byCampus: Record<string, number> = { belek: 0, candir: 0, manavgat: 0 };
    list.forEach((r) => {
      const key = getCampusKey(r);
      byCampus[key] += r.total_kg ?? 0;
    });
    return (["belek", "candir", "manavgat"] as const).map((key) => {
      const ton = byCampus[key] / 1000;
      const dekar = CAMPUS_AREAS[key] ?? 1;
      const tonPerDekar = dekar > 0 ? ton / dekar : 0;
      return {
        name: CAMPUS_LABELS[key],
        key,
        tonPerDekar: Math.round(tonPerDekar * 10) / 10,
        label: formatOneDecimalTR(tonPerDekar),
      };
    });
  }, [rows]);

  const gardenData = useMemo(() => {
    if (selectedCampus === "all" || !rows?.length) return [];
    const list = rows.filter((r) => getCampusKey(r) === selectedCampus);
    const byGarden: Record<string, number> = {};
    list.forEach((r) => {
      const g = (r.garden_name || "").trim() || "—";
      byGarden[g] = (byGarden[g] ?? 0) + (r.total_kg ?? 0);
    });
    const areas = GARDEN_AREAS[selectedCampus] ?? {};
    return Object.entries(byGarden)
      .map(([gardenName, totalKg]) => {
        const ton = totalKg / 1000;
        const dekar = areas[gardenName] ?? 1;
        const tonPerDekar = dekar > 0 ? ton / dekar : 0;
        return {
          name: gardenName,
          tonPerDekar: Math.round(tonPerDekar * 10) / 10,
          label: formatOneDecimalTR(tonPerDekar),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, selectedCampus]);

  const chartData = selectedCampus === "all" ? campusData : gardenData;
  const isEmpty = chartData.length === 0;
  const isGardenView = selectedCampus !== "all";

  return (
    <section className="card-elevated overflow-visible">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-left min-h-[44px]"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-primary flex-shrink-0" />
          <span className="text-base font-semibold text-foreground">Hasat Analizi</span>
        </div>
        <ChevronDown
          size={20}
          className={cn("text-muted-foreground flex-shrink-0 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {isOpen && (
        <div className="px-2 pt-2 pb-1 border-t border-border/50">
          <div className={ANALYSIS_FILTER_ROW_CLASS}>
            <Select value={selectedCampus} onValueChange={(v) => setSelectedCampus(v as typeof selectedCampus)}>
              <SelectTrigger id="harvest-campus" className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Kampus" />
              </SelectTrigger>
              <SelectContent>
                {campusFilterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex-shrink-0">
              <YearChipDropdown
                years={HARVEST_YEARS}
                value={harvestYear}
                onChange={setHarvestYear}
                id="harvest-analysis-year"
                aria-label="Yil"
              />
            </div>
          </div>
          {isEmpty ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Bu yil icin hasat verisi yok.
            </p>
          ) : (
            <>
              {selectedBar && (
                <p className="text-xs text-muted-foreground mb-2 py-1.5 px-2 rounded bg-muted/50">
                  {selectedBar.name}: {formatOneDecimalTR(selectedBar.tonPerDekar)} ton/da
                </p>
              )}
              <div className={ANALYSIS_CHART_CONTAINER_CLASS}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 6, right: 16, left: 8, bottom: 24 }}
                    barCategoryGap="25%"
                    barGap={2}
                    barSize={isGardenView ? 14 : 24}
                  >
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={selectedCampus ? -35 : -25}
                      textAnchor="end"
                      height={24}
                      tick={ANALYSIS_TICK_STYLE}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={true}
                      padding={ANALYSIS_XAXIS_PADDING}
                      tickMargin={10}
                    />
                    <YAxis
                      domain={[0, 7]}
                      allowDecimals={false}
                      tickCount={8}
                      width={40}
                      tick={ANALYSIS_TICK_STYLE}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={true}
                      tickMargin={10}
                      label={{ value: "ton/da", angle: -90, position: "outsideLeft", offset: 30 }}
                    />
                    <Tooltip
                      contentStyle={ANALYSIS_TOOLTIP_STYLE}
                      formatter={(value: number) => [formatOneDecimalTR(value) + " ton/dekar", ""]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar
                      dataKey="tonPerDekar"
                      name="ton/dekar"
                      radius={[2, 2, 0, 0]}
                      fill="hsl(var(--primary))"
                      onClick={(data: { name: string; tonPerDekar: number }) => {
                        setSelectedBar({ name: data.name, tonPerDekar: data.tonPerDekar });
                      }}
                      label={{ position: "top", formatter: (v: number) => formatOneDecimalTR(v), fontSize: 10 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
