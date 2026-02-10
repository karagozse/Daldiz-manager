import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useApp, BackendInspection } from "@/contexts/AppContext";
import { ChevronRight, ChevronDown, TrendingUp, FileText, BarChart3, CalendarDays } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceArea } from "recharts";
import { fetchHarvestSummary, getDefaultHarvestYear, type HarvestSummaryRow } from "@/lib/harvest";
import { GARDEN_AREAS } from "@/constants/area";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PreviousInspectionModal from "@/components/PreviousInspectionModal";
import { HarvestAnalysisSection } from "@/components/analytics/HarvestAnalysisSection";
import {
  ANALYSIS_CHART_MARGIN,
  ANALYSIS_FILTER_ROW_CLASS,
  ANALYSIS_CHART_CONTAINER_CLASS,
  ANALYSIS_TICK_STYLE,
  ANALYSIS_TOOLTIP_STYLE,
  ANALYSIS_XAXIS_PADDING,
  ANALYSIS_XAXIS_TICK_MARGIN,
} from "@/components/analytics/AnalysisChartFrame";
import { YearChipDropdown } from "@/components/analytics/YearChipDropdown";
import { formatDateDisplay } from "@/lib/date";
import { formatOneDecimalTR } from "@/lib/format";

const Analysis = () => {
  const navigate = useNavigate();
  const {
    gardens,
    isInitialDataLoading,
    inspections,
  } = useApp();

  // State for performance chart filter
  const [chartFilter, setChartFilter] = useState<string>("all");
  const years = [2026, 2027, 2028, 2029, 2030];
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const y = new Date().getFullYear();
    return y >= 2026 && y <= 2030 ? y : 2026;
  });
  
  // State for inspection reports section
  const [selectedGardenFilter, setSelectedGardenFilter] = useState<string>("all");
  const [selectedInspection, setSelectedInspection] = useState<BackendInspection | null>(null);

  // Collapsible sections (default closed)
  const [isPerfOpen, setIsPerfOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isTraderOpen, setIsTraderOpen] = useState(false);

  // Tuccar Analizi: year 2026-2030 default current, harvest rows, active point for click
  const [traderYear, setTraderYear] = useState<number>(() => {
    const y = new Date().getFullYear();
    return y >= 2026 && y <= 2030 ? y : 2026;
  });
  const [traderHarvestRows, setTraderHarvestRows] = useState<HarvestSummaryRow[] | null>(null);
  const [activeTraderPoint, setActiveTraderPoint] = useState<{ trader: string; ikinciOran: number; kantarFarkiYuzde: number } | null>(null);

  // Hasat Dönemi Analizi: campus / garden / year, monthly ton/da line chart
  const [isHarvestPeriodOpen, setIsHarvestPeriodOpen] = useState(false);
  const [harvestPeriodCampus, setHarvestPeriodCampus] = useState<string>("all");
  const [harvestPeriodGarden, setHarvestPeriodGarden] = useState<string>("all");
  const [harvestPeriodYear, setHarvestPeriodYear] = useState<number>(() => {
    const y = getDefaultHarvestYear();
    return y >= 2026 && y <= 2030 ? y : 2026;
  });
  const [harvestPeriodRows, setHarvestPeriodRows] = useState<HarvestSummaryRow[] | null>(null);
  const [harvestPeriodLoading, setHarvestPeriodLoading] = useState(false);
  const [harvestPeriodSelectedPoint, setHarvestPeriodSelectedPoint] = useState<{ month: string; tonPerDaRaw: number } | null>(null);

  useEffect(() => {
    if (!isTraderOpen) return;
    let cancelled = false;
    fetchHarvestSummary({ year: traderYear })
      .then((res) => {
        if (!cancelled) setTraderHarvestRows(res.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setTraderHarvestRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isTraderOpen, traderYear]);

  // Hasat Dönemi Analizi: fetch when section open
  useEffect(() => {
    if (!isHarvestPeriodOpen) return;
    let cancelled = false;
    setHarvestPeriodLoading(true);
    const campusId = harvestPeriodCampus === "all" ? undefined : harvestPeriodCampus;
    const gardenId = harvestPeriodGarden === "all" ? undefined : Number(harvestPeriodGarden);
    fetchHarvestSummary({ year: harvestPeriodYear, campusId, gardenId })
      .then((res) => {
        if (!cancelled) setHarvestPeriodRows(res.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setHarvestPeriodRows([]);
      })
      .finally(() => {
        if (!cancelled) setHarvestPeriodLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isHarvestPeriodOpen, harvestPeriodYear, harvestPeriodCampus, harvestPeriodGarden]);

  const traderChartData = useMemo(() => {
    const rows = traderHarvestRows ?? [];
    const byTrader = new Map<
      string,
      {
        sumGrade1: number;
        sumGrade2: number;
        sumScaleDiff: number;
        sumAbsScaleGap: number;
      }
    >();
    for (const r of rows) {
      const name = r.trader_name?.trim() || "—";
      const cur = byTrader.get(name) ?? {
        sumGrade1: 0,
        sumGrade2: 0,
        sumScaleDiff: 0,
        sumAbsScaleGap: 0,
      };
      cur.sumGrade1 += r.grade1_kg ?? 0;
      cur.sumGrade2 += r.grade2_kg ?? 0;
      if (r.scale_diff != null && r.scale_diff > 0 && r.scale_gap != null) {
        cur.sumScaleDiff += r.scale_diff;
        cur.sumAbsScaleGap += Math.abs(r.scale_gap);
      }
      byTrader.set(name, cur);
    }
    return Array.from(byTrader.entries())
      .map(([trader, agg]) => {
        const totalKg = agg.sumGrade1 + agg.sumGrade2;
        const ikinciOran = totalKg > 0 ? (agg.sumGrade2 / totalKg) * 100 : 0;
        const kantarFarkiYuzde =
          agg.sumScaleDiff > 0 ? (agg.sumAbsScaleGap / agg.sumScaleDiff) * 100 : 0;
        const io = Math.round(ikinciOran * 10) / 10;
        const kf = Math.round(kantarFarkiYuzde * 10) / 10;
        return {
          trader,
          ikinciOran: io,
          kantarFarkiYuzde: kf,
        };
      })
      .sort((a, b) => a.trader.localeCompare(b.trader));
  }, [traderHarvestRows]);

  const traderYears = [2026, 2027, 2028, 2029, 2030];
  const harvestPeriodYears = [2026, 2027, 2028, 2029, 2030];

  // Turkish month names for chart
  const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  // Hasat Dönemi: total decare for selected scope (campus/garden)
  const harvestPeriodTotalDa = useMemo(() => {
    if (harvestPeriodGarden !== "all") {
      const garden = gardens.find((g) => g.id === Number(harvestPeriodGarden));
      if (!garden) return 0;
      const campusAreas = GARDEN_AREAS[garden.campusId];
      const da = campusAreas?.[garden.name] ?? 0;
      return da;
    }
    if (harvestPeriodCampus !== "all") {
      const campusAreas = GARDEN_AREAS[harvestPeriodCampus] ?? {};
      return Object.values(campusAreas).reduce((a, b) => a + b, 0);
    }
    return (["belek", "candir", "manavgat"] as const).reduce(
      (sum, c) => sum + Object.values(GARDEN_AREAS[c] ?? {}).reduce((a, b) => a + b, 0),
      0
    );
  }, [gardens, harvestPeriodCampus, harvestPeriodGarden]);

  // Hasat Dönemi: monthly ton/da for line chart (12 months, 0 if no data)
  const harvestPeriodChartData = useMemo(() => {
    const rows = harvestPeriodRows ?? [];
    const totalDa = harvestPeriodTotalDa;
    return monthNames.map((month, monthIndex) => {
      const totalKg = rows
        .filter((r) => {
          const d = new Date(r.harvest_date);
          return d.getFullYear() === harvestPeriodYear && d.getMonth() === monthIndex;
        })
        .reduce((s, r) => s + (r.total_kg ?? 0), 0);
      const tonPerDa = totalDa > 0 ? totalKg / 1000 / totalDa : 0;
      const clamped = Math.min(3, Math.max(0, tonPerDa));
      return {
        month,
        tonPerDa: clamped,
        tonPerDaRaw: tonPerDa,
        monthIndex,
      };
    });
  }, [harvestPeriodRows, harvestPeriodTotalDa, harvestPeriodYear, monthNames]);

  const harvestPeriodGardenOptions = useMemo(() => {
    if (harvestPeriodCampus === "all") return gardens;
    return gardens.filter((g) => g.campusId === harvestPeriodCampus);
  }, [gardens, harvestPeriodCampus]);

  // Performance chart data - grouped by month with all 12 months shown
  // Sadece backend SUBMITTED inspections kullanılır, mock fallback yok
  const performanceChartData = useMemo(() => {
    // Backend inspections'ları tarih ve bahçe bilgisiyle birleştir
    const backendScoreEntries: Array<{
      gardenId: number;
      score: number;
      createdAt: Date;
      campusId?: string;
    }> = [];
    
    inspections
      .filter(i => i.status === "SUBMITTED" && i.score !== null && i.score !== undefined)
      .forEach(inspection => {
        const garden = gardens.find(g => g.id === inspection.gardenId);
        backendScoreEntries.push({
          gardenId: inspection.gardenId,
          score: inspection.score!,
          createdAt: new Date(inspection.createdAt),
          campusId: garden?.campusId,
        });
      });
    
    // Seçili yıl için backend skorlarını filtrele
    const backendScoresForYear = backendScoreEntries.filter(e => {
      const year = e.createdAt.getFullYear();
      return year === selectedYear;
    });
    
    // If filtering by specific campus, use simple average
    if (chartFilter !== "all") {
      const filteredBackendScores = backendScoresForYear.filter(e => e.campusId === chartFilter);
      
      // Aylara göre grupla ve ortalama hesapla
      const monthMap = new Map<number, { total: number; count: number }>();
      
      filteredBackendScores.forEach(e => {
        const monthIndex = e.createdAt.getMonth();
        const existing = monthMap.get(monthIndex) || { total: 0, count: 0 };
        monthMap.set(monthIndex, {
          total: existing.total + e.score,
          count: existing.count + 1,
        });
      });
      
      // Create array with all 12 months
      return monthNames.map((month, index) => {
        const data = monthMap.get(index);
        return {
          month,
          score: data ? Math.round(data.total / data.count) : null,
          monthIndex: index,
        };
      });
    }
    
    // For "Genel" (all): compute weighted monthly averages
    // First, compute monthly averages for each campus
    const belekScores = backendScoresForYear.filter(e => e.campusId === "belek");
    const candirScores = backendScoresForYear.filter(e => e.campusId === "candir");
    const manavgatScores = backendScoresForYear.filter(e => e.campusId === "manavgat");
    
    // Helper: compute monthly averages for a campus
    const computeCampusMonthlyAverages = (scores: typeof backendScoresForYear): Map<number, number> => {
      const monthMap = new Map<number, { total: number; count: number }>();
      
      scores.forEach(e => {
        const monthIndex = e.createdAt.getMonth();
        const existing = monthMap.get(monthIndex) || { total: 0, count: 0 };
        monthMap.set(monthIndex, {
          total: existing.total + e.score,
          count: existing.count + 1,
        });
      });
      
      const averages = new Map<number, number>();
      monthMap.forEach((data, monthIndex) => {
        averages.set(monthIndex, Math.round(data.total / data.count));
      });
      
      return averages;
    };
    
    const belekMonthly = computeCampusMonthlyAverages(belekScores);
    const candirMonthly = computeCampusMonthlyAverages(candirScores);
    const manavgatMonthly = computeCampusMonthlyAverages(manavgatScores);
    
    // Create array with all 12 months - weighted Genel average
    return monthNames.map((month, index) => {
      const belekScore = belekMonthly.get(index) ?? null;
      const candirScore = candirMonthly.get(index) ?? null;
      const manavgatScore = manavgatMonthly.get(index) ?? null;
      
      // Weighted average: Belek * 3 + Çandır * 1 + Manavgat * 1
      let weightedSum = 0;
      let weightTotal = 0;
      
      if (belekScore !== null) {
        weightedSum += belekScore * 3;
        weightTotal += 3;
      }
      if (candirScore !== null) {
        weightedSum += candirScore * 1;
        weightTotal += 1;
      }
      if (manavgatScore !== null) {
        weightedSum += manavgatScore * 1;
        weightTotal += 1;
      }
      
      const genelScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : null;
      
      return {
        month,
        score: genelScore,
        monthIndex: index,
      };
    });
  }, [gardens, chartFilter, selectedYear, inspections]);

  // Find last non-null score index for chart styling
  const lastNonNullScoreIndex = useMemo(() => {
    for (let i = performanceChartData.length - 1; i >= 0; i--) {
      if (performanceChartData[i].score !== null) {
        return i;
      }
    }
    return -1;
  }, [performanceChartData]);


  // Section: Completed Inspection Reports
  const completedInspections = useMemo(() => {
    // Filter only SUBMITTED inspections (completed reports)
    const scored = inspections.filter(i => i.status === "SUBMITTED");
    
    // Sort by createdAt descending (newest first)
    const sorted = scored.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Filter by selected garden if filter is set
    if (selectedGardenFilter !== "all") {
      const gardenId = parseInt(selectedGardenFilter);
      return sorted.filter(i => i.gardenId === gardenId);
    }
    
    // If no filter, return latest 5
    return sorted.slice(0, 5);
  }, [inspections, selectedGardenFilter]);


  // Loading durumunda skeleton göster
  if (isInitialDataLoading) {
    return (
      <div
        className="min-h-0 bg-background overflow-y-auto"
        style={{ height: "calc(100dvh - var(--bottom-tab-height, 80px) - env(safe-area-inset-bottom, 0px))" }}
      >
        <Header title="Analiz" showNotification showProfile />
        
        <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
          {/* Loading skeleton */}
          <div className="space-y-4">
            <div className="card-elevated p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
              <div className="space-y-2">
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
            </div>
            <div className="card-elevated p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
              <div className="space-y-2">
                <div className="h-16 bg-muted rounded"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
            </div>
            <div className="card-elevated p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </main>
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className="min-h-0 bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - var(--bottom-tab-height, 80px) - env(safe-area-inset-bottom, 0px))" }}
    >
      <Header title="Analiz" showNotification showProfile />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Section: Performance Analysis Chart (collapsible) */}
        <section className="card-elevated overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPerfOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-left min-h-[44px]"
            aria-expanded={isPerfOpen}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary flex-shrink-0" />
              <span className="text-base font-semibold text-foreground">Bahce Yonetim Performansi</span>
            </div>
            <ChevronDown
              size={20}
              className={cn("text-muted-foreground flex-shrink-0 transition-transform", isPerfOpen && "rotate-180")}
            />
          </button>
          {isPerfOpen && (
            <div className="px-2 pt-2 pb-1 border-t border-border/50">
            {/* 1) Controls row — same content column */}
            <div className={ANALYSIS_FILTER_ROW_CLASS}>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setChartFilter("all")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0",
                    chartFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Genel
                </button>
                <button
                  onClick={() => setChartFilter("belek")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0",
                    chartFilter === "belek"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Belek
                </button>
                <button
                  onClick={() => setChartFilter("candir")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0",
                    chartFilter === "candir"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Çandır
                </button>
                <button
                  onClick={() => setChartFilter("manavgat")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0",
                    chartFilter === "manavgat"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Manavgat
                </button>
              </div>
              <div className="ml-auto flex-shrink-0">
                <YearChipDropdown
                  years={years}
                  value={selectedYear}
                  onChange={setSelectedYear}
                  aria-label="Yıl"
                />
              </div>
            </div>
            
            {/* 2) Chart area — same content column; optical offset only on chart drawing */}
            <div className={cn(ANALYSIS_CHART_CONTAINER_CLASS, "-translate-x-2 pr-2")}>
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={performanceChartData}
                    margin={{ top: 6, right: 8, left: 8, bottom: 18 }}
                  >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="month"
                    interval={0}
                    minTickGap={0}
                    tick={ANALYSIS_TICK_STYLE}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={true}
                    padding={ANALYSIS_XAXIS_PADDING}
                    tickMargin={10}
                    height={20}
                  />
                  <YAxis
                    domain={[0, 100]}
                    width={34}
                    tick={ANALYSIS_TICK_STYLE}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={true}
                    tickMargin={10}
                  />
                  <Tooltip 
                    contentStyle={ANALYSIS_TOOLTIP_STYLE}
                    formatter={(value: number | null) => value !== null ? [`${value} puan`, 'Ortalama Skor'] : ['Veri yok', '']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, index, value } = props;
                      if (cx === undefined || cy === undefined || value === null || value === undefined) return null;
                      
                      const isLast = index === lastNonNullScoreIndex;
                      
                      if (isLast) {
                        // Latest point: Circled marker (emphasized) - larger with ring
                        return (
                          <g key={`dot-group-${index}`}>
                            {/* Outer ring for emphasis */}
                            <circle
                              key={`dot-ring-${index}`}
                              cx={cx}
                              cy={cy}
                              r={8}
                              fill="hsl(var(--primary) / 0.15)"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                            />
                            {/* Inner filled dot */}
                            <circle
                              key={`dot-inner-${index}`}
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill="hsl(var(--primary))"
                            />
                          </g>
                        );
                      }
                      
                      // Previous points: small muted dots
                      return (
                        <circle
                          key={`dot-${index}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="hsl(var(--primary) / 0.5)"
                          stroke="white"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    label={(props: any) => {
                      const { x, y, value, index } = props;
                      if (x === undefined || y === undefined || value === undefined || value === null) return null;
                      
                      const isLast = index === lastNonNullScoreIndex;
                      // Latest = primary bold, previous = muted (opacity 0.6)
                      const fillColor = isLast ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)";
                      const fontWeight = isLast ? 700 : 500;
                      
                      return (
                        <text 
                          key={`label-${index}`}
                          x={x} 
                          y={y - 14} 
                          fill={fillColor}
                          textAnchor="middle" 
                          fontSize={11}
                          fontWeight={fontWeight}
                        >
                          {value}
                        </text>
                      );
                    }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>
          )}
        </section>

        {/* Section: Inspection Reports (collapsible) */}
        <section className="card-elevated overflow-hidden">
          <button
            type="button"
            onClick={() => setIsReportsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-left min-h-[44px]"
            aria-expanded={isReportsOpen}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary flex-shrink-0" />
              <span className="text-base font-semibold text-foreground">Denetim Raporları</span>
            </div>
            <ChevronDown
              size={20}
              className={cn("text-muted-foreground flex-shrink-0 transition-transform", isReportsOpen && "rotate-180")}
            />
          </button>
          {isReportsOpen && (
            <div className="px-4 pb-4 pt-4 border-t border-border/50">
            {/* Garden Filter */}
            <div className="mb-4">
              <label htmlFor="garden-filter" className="text-xs text-muted-foreground mb-2 block">
                Bahçe filtresi
              </label>
              <Select value={selectedGardenFilter} onValueChange={setSelectedGardenFilter}>
                <SelectTrigger id="garden-filter" className="w-full">
                  <SelectValue placeholder="Tüm bahçeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="focus:bg-card data-[state=checked]:bg-transparent">Tüm bahçeler</SelectItem>
                  {gardens.map(garden => (
                    <SelectItem key={garden.id} value={garden.id.toString()} className="focus:bg-card data-[state=checked]:bg-transparent">
                      {garden.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caption */}
            {completedInspections.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                {selectedGardenFilter === "all" 
                  ? "Son 5 rapor"
                  : `Seçili bahçe için tüm raporlar (${completedInspections.length} adet)`}
              </p>
            )}

            {/* Reports List */}
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
              {completedInspections.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {selectedGardenFilter === "all" 
                    ? "Henüz tamamlanmış bir denetim raporu bulunmuyor."
                    : "Bu bahçe için henüz tamamlanmış bir denetim raporu yok."}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {completedInspections.map((inspection) => {
                    const garden = gardens.find(g => g.id === inspection.gardenId);
                    const evaluationDate = inspection.createdAt; // BackendInspection only has createdAt
                    const formattedDate = formatDateDisplay(evaluationDate);
                    
                    return (
                      <button
                        key={inspection.id}
                        type="button"
                        onClick={() => setSelectedInspection(inspection)}
                        className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left hover:bg-muted transition"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {formattedDate}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {garden?.name || "Bilinmeyen Bahçe"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {typeof inspection.score === "number" && (
                            <div className={cn(
                              "rounded-full border px-2 py-0.5 text-xs font-semibold",
                              inspection.score >= 75 ? "text-success border-success/20 bg-success/10" :
                              inspection.score >= 60 ? "text-warning-foreground border-warning/20 bg-warning/10" :
                              "text-destructive border-destructive/20 bg-destructive/10"
                            )}>
                              {inspection.score}
                            </div>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
          )}
        </section>

        {/* Section: Tuccar Analizi (collapsible) — overflow-visible so X-axis labels are not clipped */}
        <section className="card-elevated overflow-visible">
          <button
            type="button"
            onClick={() => setIsTraderOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-left min-h-[44px]"
            aria-expanded={isTraderOpen}
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary flex-shrink-0" />
              <span className="text-base font-semibold text-foreground">Tuccar Analizi</span>
            </div>
            <ChevronDown
              size={20}
              className={cn("text-muted-foreground flex-shrink-0 transition-transform", isTraderOpen && "rotate-180")}
            />
          </button>
          {isTraderOpen && (
            <div className="px-2 pt-2 pb-1 border-t border-border/50">
              {/* B) Controls/Legend row — same content column */}
              <div className={ANALYSIS_FILTER_ROW_CLASS}>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-2 rounded-sm shrink-0 bg-black" />
                    <span>Ikinci Oran (%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-2 rounded-sm shrink-0 border border-border"
                      style={{
                        backgroundImage: "repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px)",
                        backgroundSize: "4px 2px",
                      }}
                    />
                    <span>Kantar Farki (%)</span>
                  </div>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <YearChipDropdown
                    years={traderYears}
                    value={traderYear}
                    onChange={setTraderYear}
                    id="trader-year"
                    aria-label="Yil"
                  />
                </div>
              </div>
              {activeTraderPoint && (
                <p className="text-xs text-muted-foreground mb-2 py-1 px-2 rounded bg-muted/50">
                  {activeTraderPoint.trader} — Ikinci Oran: {activeTraderPoint.ikinciOran.toFixed(1)}%, Kantar Farki: {activeTraderPoint.kantarFarkiYuzde.toFixed(1)}%
                </p>
              )}
              {traderChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Bu yil icin hasat verisi yok.
                </p>
              ) : (
                <div className={cn(ANALYSIS_CHART_CONTAINER_CLASS, "-translate-x-2 pr-2")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={traderChartData}
                      margin={{ top: 6, right: 8, left: 8, bottom: 26 }}
                      barCategoryGap="40%"
                      barGap={2}
                    >
                      <defs>
                        <pattern id="kantarStripes" patternUnits="userSpaceOnUse" width="6" height="6">
                          <path d="M0,6 l6,-6" stroke="hsl(var(--foreground))" strokeWidth="2" />
                        </pattern>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        dataKey="trader"
                        interval={0}
                        minTickGap={0}
                        height={26}
                        tick={ANALYSIS_TICK_STYLE}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={true}
                        padding={ANALYSIS_XAXIS_PADDING}
                        tickMargin={12}
                      />
                      <YAxis
                        domain={[0, 20]}
                        allowDecimals={false}
                        tickCount={5}
                        width={36}
                        tick={ANALYSIS_TICK_STYLE}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={true}
                        tickMargin={10}
                      />
                      <Tooltip
                        contentStyle={ANALYSIS_TOOLTIP_STYLE}
                        formatter={(value: number) => [value.toFixed(1) + "%", ""]}
                        labelFormatter={(label) => `${label}`}
                      />
                      <ReferenceLine
                        y={5}
                        stroke="hsl(var(--destructive))"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        label={{ value: "5% eşik", position: "right", fontSize: 10, fill: "hsl(var(--destructive))" }}
                      />
                      <ReferenceArea y1={0} y2={5} fill="hsl(var(--success)/0.12)" stroke="none" />
                      <ReferenceArea y1={5} y2={20} fill="hsl(var(--destructive)/0.10)" stroke="none" />
                      <Bar
                        dataKey="ikinciOran"
                        name="Ikinci Oran (%)"
                        fill="hsl(var(--foreground))"
                        barSize={7}
                        radius={[2, 2, 0, 0]}
                        onClick={(data: (typeof traderChartData)[0]) => setActiveTraderPoint({ trader: data.trader, ikinciOran: data.ikinciOran, kantarFarkiYuzde: data.kantarFarkiYuzde })}
                      />
                      <Bar
                        dataKey="kantarFarkiYuzde"
                        name="Kantar Farki (%)"
                        fill="url(#kantarStripes)"
                        barSize={7}
                        radius={[2, 2, 0, 0]}
                        onClick={(data: (typeof traderChartData)[0]) => setActiveTraderPoint({ trader: data.trader, ikinciOran: data.ikinciOran, kantarFarkiYuzde: data.kantarFarkiYuzde })}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section: Hasat Dönemi Analizi (monthly ton/da line chart) — overflow-visible so axis labels don't clip */}
        <section className="card-elevated overflow-visible">
          <button
            type="button"
            onClick={() => setIsHarvestPeriodOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-left min-h-[44px]"
            aria-expanded={isHarvestPeriodOpen}
          >
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-primary flex-shrink-0" />
              <span className="text-base font-semibold text-foreground">Hasat Dönemi Analizi</span>
            </div>
            <ChevronDown
              size={20}
              className={cn("text-muted-foreground flex-shrink-0 transition-transform", isHarvestPeriodOpen && "rotate-180")}
            />
          </button>
          {isHarvestPeriodOpen && (
            <div className="px-2 pt-2 pb-1 border-t border-border/50">
              <div className={ANALYSIS_FILTER_ROW_CLASS}>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={harvestPeriodCampus}
                    onValueChange={(v) => {
                      setHarvestPeriodCampus(v);
                      setHarvestPeriodGarden("all");
                    }}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Kampüs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Tüm kampüsler</SelectItem>
                      <SelectItem value="belek" className="text-xs">Belek</SelectItem>
                      <SelectItem value="candir" className="text-xs">Çandır</SelectItem>
                      <SelectItem value="manavgat" className="text-xs">Manavgat</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={harvestPeriodGarden} onValueChange={setHarvestPeriodGarden}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Bahçe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Tüm bahçeler</SelectItem>
                      {harvestPeriodGardenOptions.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)} className="text-xs">
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <YearChipDropdown
                    years={harvestPeriodYears}
                    value={harvestPeriodYear}
                    onChange={setHarvestPeriodYear}
                    aria-label="Yıl"
                  />
                </div>
              </div>
              {harvestPeriodSelectedPoint && (
                <p className="text-xs text-muted-foreground mb-2 py-1.5 px-2 rounded bg-muted/50">
                  {harvestPeriodSelectedPoint.month}: {formatOneDecimalTR(harvestPeriodSelectedPoint.tonPerDaRaw)} ton/da
                </p>
              )}
              {harvestPeriodLoading ? (
                <div className={ANALYSIS_CHART_CONTAINER_CLASS + " flex items-center justify-center"}>
                  <div className="animate-pulse h-32 w-full rounded bg-muted/50" />
                </div>
              ) : (
                <div className={ANALYSIS_CHART_CONTAINER_CLASS}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={harvestPeriodChartData}
                      margin={{ top: 6, right: 16, left: 8, bottom: 18 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        dataKey="month"
                        height={20}
                        tick={ANALYSIS_TICK_STYLE}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={true}
                        padding={ANALYSIS_XAXIS_PADDING}
                        tickMargin={10}
                      />
                      <YAxis
                        domain={[0, 3]}
                        tickCount={4}
                        ticks={[0, 1, 2, 3]}
                        width={40}
                        tick={ANALYSIS_TICK_STYLE}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={true}
                        tickMargin={10}
                        label={{ value: "ton/da", angle: -90, position: "outsideLeft", offset: 30 }}
                      />
                      <Tooltip
                        contentStyle={ANALYSIS_TOOLTIP_STYLE}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as { month: string; tonPerDaRaw: number };
                          return (
                            <div className="px-2 py-1.5">
                              Month: {p.month}, ton/da: {p.tonPerDaRaw.toFixed(2)}
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tonPerDa"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 5 }}
                        connectNulls={true}
                        isAnimationActive={true}
                        onClick={(data: { month: string; tonPerDaRaw: number }) => {
                          setHarvestPeriodSelectedPoint({ month: data.month, tonPerDaRaw: data.tonPerDaRaw });
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!harvestPeriodLoading && harvestPeriodRows?.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Bu yıl ve seçili kapsam için hasat verisi yok.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Section: Hasat Analizi (ton/dekar) */}
        <HarvestAnalysisSection />
      </main>
      
      {/* Inspection Report Modal */}
      <PreviousInspectionModal
        open={!!selectedInspection}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInspection(null);
          }
        }}
        inspection={selectedInspection}
        garden={selectedInspection ? gardens.find(g => g.id === selectedInspection.gardenId) : null}
        title="Denetim Raporu"
        showCriticalWarnings={false}
      />
      
      <BottomNav />
    </div>
  );
};

export default Analysis;