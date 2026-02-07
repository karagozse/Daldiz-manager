/**
 * Öngörülen verim hesaplama: son 12 ay, aylık skorlar, ay ağırlıkları, skor→ton/da bant dönüşümü.
 * Dashboard (genel) ve Bahçeler (kampüs bazlı) ekranlarında ortak kullanılır.
 */

export type ScoredEntry = {
  createdAt: Date;
  score: number;
  campusId: string | undefined;
};

/** Ay ağırlıkları: Mart 2, Nisan 3, Mayıs 3, Haziran 2, Temmuz 2, diğer 1 (month 0-11) */
export function getMonthWeight(monthIndex: number): number {
  if (monthIndex === 2) return 2;  // Mart
  if (monthIndex === 3) return 3;  // Nisan
  if (monthIndex === 4) return 3;  // Mayıs
  if (monthIndex === 5) return 2;  // Haziran
  if (monthIndex === 6) return 2;  // Temmuz
  return 1;
}

/**
 * Score (0-100) → ton/da. Band içi lineer. 100 dahil (son bant s <= 100).
 * 0-20→0-2, 20-40→2-3, 40-60→3-4, 60-70→4-5, 70-80→5-6, 80-90→6-7, 90-100→7-8
 */
export function mapScoreToYieldTonPerDa(score: number): number {
  const s = Math.max(0, Math.min(100, score));
  const bands: { sMin: number; sMax: number; tMin: number; tMax: number }[] = [
    { sMin: 0, sMax: 20, tMin: 0, tMax: 2 },
    { sMin: 20, sMax: 40, tMin: 2, tMax: 3 },
    { sMin: 40, sMax: 60, tMin: 3, tMax: 4 },
    { sMin: 60, sMax: 70, tMin: 4, tMax: 5 },
    { sMin: 70, sMax: 80, tMin: 5, tMax: 6 },
    { sMin: 80, sMax: 90, tMin: 6, tMax: 7 },
    { sMin: 90, sMax: 100, tMin: 7, tMax: 8 },
  ];
  const band = bands.find(b =>
    s >= b.sMin && (b.sMax === 100 ? s <= b.sMax : s < b.sMax)
  ) ?? bands[bands.length - 1];
  return band.tMin + ((s - band.sMin) / (band.sMax - band.sMin)) * (band.tMax - band.tMin);
}

/**
 * O ayda kampüse ait denetim skorlarının ortalaması.
 * @param month - Ay indeksi 0-11
 */
export function computeCampusMonthlyAverage(
  scoredInspections: ScoredEntry[],
  campusId: string,
  year: number,
  month: number
): number | null {
  const scoresForMonth = scoredInspections
    .filter(
      (e) =>
        e.campusId === campusId &&
        e.createdAt.getFullYear() === year &&
        e.createdAt.getMonth() === month
    )
    .map((e) => e.score);
  if (scoresForMonth.length === 0) return null;
  return Math.round(
    scoresForMonth.reduce((sum, s) => sum + s, 0) / scoresForMonth.length
  );
}

/** inspections/gardens'den SUBMITTED kayıtları ScoredEntry[] yapar */
function buildScoredInspections(
  inspections: Array<{ gardenId: number; status: string; score: number | null; createdAt: string }>,
  gardens: Array<{ id: number; campusId: string }>
): ScoredEntry[] {
  return inspections
    .filter((i) => i.status === "SUBMITTED" && typeof i.score === "number")
    .map((i) => {
      const garden = gardens.find((g) => g.id === i.gardenId);
      return {
        createdAt: new Date(i.createdAt),
        score: i.score as number,
        campusId: garden?.campusId,
      };
    });
}

const CAMPUS_WEIGHTS: Record<string, number> = { belek: 3, candir: 1, manavgat: 1 };

/**
 * Tek kampüs için öngörülen verim (ton/da). Son 12 ay, ay ağırlıkları, bant dönüşümü.
 * Veri yoksa null.
 */
export function computeForecastYieldTonPerDaForCampus(params: {
  inspections: Array<{ gardenId: number; status: string; score: number | null; createdAt: string }>;
  gardens: Array<{ id: number; campusId: string }>;
  campusId: string;
  getLatestBackendScoreForGarden?: (gardenId: number) => number | null;
}): number | null {
  const { inspections, gardens, campusId } = params;
  const scored = buildScoredInspections(inspections, gardens);
  const now = new Date();
  let weightedSum = 0;
  let weightTotal = 0;
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const monthScore = computeCampusMonthlyAverage(scored, campusId, year, monthIndex);
    const monthW = getMonthWeight(monthIndex);
    if (monthScore !== null) {
      weightedSum += monthScore * monthW;
      weightTotal += monthW;
    }
  }
  if (weightTotal === 0) return null;
  const forecastScore = weightedSum / weightTotal;
  return mapScoreToYieldTonPerDa(forecastScore);
}

/**
 * Tek bahçe için o aydaki SUBMITTED denetim skorlarının ortalaması.
 */
export function computeGardenMonthlyAverage(
  entries: Array<{ createdAt: Date; score: number }>,
  year: number,
  month: number
): number | null {
  const scoresForMonth = entries
    .filter(
      (e) =>
        e.createdAt.getFullYear() === year &&
        e.createdAt.getMonth() === month
    )
    .map((e) => e.score);
  if (scoresForMonth.length === 0) return null;
  return Math.round(
    scoresForMonth.reduce((sum, s) => sum + s, 0) / scoresForMonth.length
  );
}

/**
 * Tek bahçe için öngörülen verim (ton/da). Son 12 ay, aylık skor ortalaması, ay ağırlıkları, bant dönüşümü.
 * Veri yoksa null.
 */
export function computeForecastYieldTonPerDaForGarden(params: {
  inspections: Array<{ gardenId: number; status: string; score: number | null; createdAt: string }>;
  gardenId: number;
}): number | null {
  const { inspections, gardenId } = params;
  const entries = inspections
    .filter(
      (i) =>
        i.gardenId === gardenId &&
        i.status === "SUBMITTED" &&
        typeof i.score === "number"
    )
    .map((i) => ({
      createdAt: new Date(i.createdAt),
      score: i.score as number,
    }));
  const now = new Date();
  let weightedSum = 0;
  let weightTotal = 0;
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const monthScore = computeGardenMonthlyAverage(entries, year, monthIndex);
    const monthW = getMonthWeight(monthIndex);
    if (monthScore !== null) {
      weightedSum += monthScore * monthW;
      weightTotal += monthW;
    }
  }
  if (weightTotal === 0) return null;
  const forecastScore = weightedSum / weightTotal;
  return mapScoreToYieldTonPerDa(forecastScore);
}

/**
 * Genel (şirket) öngörülen verim: son 12 ay, her ay Belek/Çandır/Manavgat 3/1/1 ağırlıklı ortalama,
 * sonra ay ağırlıkları ile forecastScore, ton/da. Dashboard için.
 */
export function computeForecastYieldTonPerDaGeneral(params: {
  inspections: Array<{ gardenId: number; status: string; score: number | null; createdAt: string }>;
  gardens: Array<{ id: number; campusId: string }>;
}): number | null {
  const { inspections, gardens } = params;
  const scored = buildScoredInspections(inspections, gardens);
  const now = new Date();
  let weightedSum = 0;
  let weightTotal = 0;
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const belekScore = computeCampusMonthlyAverage(scored, "belek", year, monthIndex);
    const candirScore = computeCampusMonthlyAverage(scored, "candir", year, monthIndex);
    const manavgatScore = computeCampusMonthlyAverage(scored, "manavgat", year, monthIndex);
    let genelSum = 0;
    let genelW = 0;
    if (belekScore !== null) {
      genelSum += belekScore * CAMPUS_WEIGHTS.belek;
      genelW += CAMPUS_WEIGHTS.belek;
    }
    if (candirScore !== null) {
      genelSum += candirScore * CAMPUS_WEIGHTS.candir;
      genelW += CAMPUS_WEIGHTS.candir;
    }
    if (manavgatScore !== null) {
      genelSum += manavgatScore * CAMPUS_WEIGHTS.manavgat;
      genelW += CAMPUS_WEIGHTS.manavgat;
    }
    const genelScore = genelW > 0 ? genelSum / genelW : null;
    const monthW = getMonthWeight(monthIndex);
    if (genelScore !== null) {
      weightedSum += genelScore * monthW;
      weightTotal += monthW;
    }
  }
  if (weightTotal === 0) return null;
  const forecastScore = weightedSum / weightTotal;
  return mapScoreToYieldTonPerDa(forecastScore);
}
