import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useApp, BackendInspection } from "@/contexts/AppContext";
import { ChevronRight, AlertTriangle, TrendingUp, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PreviousInspectionModal from "@/components/PreviousInspectionModal";
import { formatDateDisplay } from "@/lib/date";

const Analysis = () => {
  const navigate = useNavigate();
  const { 
    gardens, 
    setSelectedGardenId,
    isInitialDataLoading,
    inspections,
    getLatestBackendScoreForGarden
  } = useApp();

  // State for performance chart filter
  const [chartFilter, setChartFilter] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  
  // State for inspection reports section
  const [selectedGardenFilter, setSelectedGardenFilter] = useState<string>("all");
  const [selectedInspection, setSelectedInspection] = useState<BackendInspection | null>(null);

  // Section 1: Worst Gardens (Top 5) - sorted by lowest score first
  // Sadece backend SCORED inspections kullanılır
  const worstGardens = useMemo(() => {
    return gardens
      .map(garden => {
        // Sadece backend skorunu kullan
        const latestScore = getLatestBackendScoreForGarden(garden.id);
        
        const openWarnings = garden.openCriticalWarningCount ?? 0;
        return {
          ...garden,
          score: latestScore ?? 0, // Backend skor yoksa 0 (değerlendirilmemiş)
          openWarnings,
          hasScore: latestScore !== null, // Skor var mı flag'i
        };
      })
      .filter(g => g.hasScore) // Sadece skoru olan bahçeleri göster
      .sort((a, b) => a.score - b.score) // Lowest score first (worst performance)
      .slice(0, 5);
  }, [gardens, getLatestBackendScoreForGarden]);


  // Turkish month names for chart
  const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  // Performance chart data - grouped by month with all 12 months shown
  // Sadece backend SCORED inspections kullanılır, mock fallback yok
  const performanceChartData = useMemo(() => {
    // Backend inspections'ları tarih ve bahçe bilgisiyle birleştir
    const backendScoreEntries: Array<{
      gardenId: number;
      score: number;
      createdAt: Date;
      campusId?: string;
    }> = [];
    
    inspections
      .filter(i => i.status === "SCORED" && i.score !== null && i.score !== undefined)
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

  // Available years for selection
  const years = [2026, 2027, 2028, 2029, 2030];

  // Section: Completed Inspection Reports
  const completedInspections = useMemo(() => {
    // Filter only SCORED inspections (completed reports)
    const scored = inspections.filter(i => i.status === "SCORED");
    
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


  const handleGardenClick = (gardenId: number) => {
    setSelectedGardenId(gardenId);
    navigate(`/bahce/${gardenId}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-success";
    if (score >= 60) return "text-warning-foreground";
    return "text-destructive";
  };

  // Loading durumunda skeleton göster
  if (isInitialDataLoading) {
    return (
      <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
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
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      <Header title="Analiz" showNotification showProfile />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Section 1: Worst Performance Overview */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-destructive" />
            En Kötü Performans
          </h2>
          
          <div className="card-elevated p-4">
            <div className="space-y-2">
              {worstGardens.map((garden, idx) => (
                <button
                  key={garden.id}
                  onClick={() => handleGardenClick(garden.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-destructive/20 text-destructive text-xs font-medium flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{garden.name}</p>
                      <p className="text-xs text-muted-foreground">{garden.campusName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${getScoreColor(garden.score)}`}>
                      {garden.score}
                    </p>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Performance Analysis Chart */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Performans Analizi
          </h2>
          
          <div className="card-elevated p-4">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 mb-4">
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
              
              {/* Year Selector */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="ml-auto px-2.5 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground border-none outline-none cursor-pointer flex-shrink-0"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {/* Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceChartData} margin={{ top: 28, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
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
        </section>

        {/* Section 3: Inspection Reports */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Denetim Raporları
          </h2>
          
          <div className="card-elevated p-4">
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
        </section>
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