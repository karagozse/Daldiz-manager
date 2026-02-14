/**
 * Günlük Saha Kontrolü taslak/gönderim durumu (localStorage, gardenId + tarih bazlı).
 * Gönderilen raporlar ayrı listede tutulur (Analiz sayfasında listeleme için).
 */

const STORAGE_KEY = (gardenId: number, date: string) => `dailyFieldCheck_${gardenId}_${date}`;
const SUBMITTED_LIST_KEY = "dailyFieldCheck_submittedList";
const MAX_SUBMITTED_LIST = 200;

export type DailyFieldCheckStatus = "DRAFT" | "SUBMITTED";

export interface StoredDailyFieldCheck {
  status: DailyFieldCheckStatus;
  form?: Record<string, unknown>; // serializable form state (no File/blob)
}

/** Gönderilmiş saha kontrol raporu (Analiz'de listelenir). */
export interface SubmittedFieldCheckReport {
  id: string;
  gardenId: number;
  date: string;
  submittedAt: string;
  form: Record<string, unknown>;
}

export function getDailyFieldCheckStatus(gardenId: number): DailyFieldCheckStatus | null {
  const date = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(STORAGE_KEY(gardenId, date));
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredDailyFieldCheck;
    return data?.status ?? null;
  } catch {
    return null;
  }
}

export function getDailyFieldCheckDraft(gardenId: number): StoredDailyFieldCheck | null {
  const date = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(STORAGE_KEY(gardenId, date));
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredDailyFieldCheck;
    return data?.status === "DRAFT" ? data : null;
  } catch {
    return null;
  }
}

export function setDailyFieldCheckDraft(gardenId: number, form: Record<string, unknown>): void {
  const date = new Date().toISOString().slice(0, 10);
  localStorage.setItem(
    STORAGE_KEY(gardenId, date),
    JSON.stringify({ status: "DRAFT" as const, form })
  );
}

export function setDailyFieldCheckSubmitted(gardenId: number, form: Record<string, unknown>): void {
  const date = new Date().toISOString().slice(0, 10);
  localStorage.setItem(
    STORAGE_KEY(gardenId, date),
    JSON.stringify({ status: "SUBMITTED" as const })
  );
  const list = getSubmittedReportsRaw();
  const report: SubmittedFieldCheckReport = {
    id: `dfc_${gardenId}_${date}_${Date.now()}`,
    gardenId,
    date,
    submittedAt: new Date().toISOString(),
    form,
  };
  list.unshift(report);
  if (list.length > MAX_SUBMITTED_LIST) list.length = MAX_SUBMITTED_LIST;
  try {
    localStorage.setItem(SUBMITTED_LIST_KEY, JSON.stringify(list));
  } catch {
    // ignore quota
  }
}

function getSubmittedReportsRaw(): SubmittedFieldCheckReport[] {
  try {
    const raw = localStorage.getItem(SUBMITTED_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SubmittedFieldCheckReport[];
  } catch {
    return [];
  }
}

/** Son gönderilen raporlar (Analiz sayfası). gardenId verilirse o bahçeye filtreler; yoksa son 5. */
export function getDailyFieldCheckSubmittedReports(gardenFilter: "all" | number): SubmittedFieldCheckReport[] {
  let list = getSubmittedReportsRaw();
  list = list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  if (gardenFilter !== "all") {
    list = list.filter((r) => r.gardenId === gardenFilter);
  } else {
    list = list.slice(0, 5);
  }
  return list;
}

export function clearDailyFieldCheckDraft(gardenId: number): void {
  const date = new Date().toISOString().slice(0, 10);
  localStorage.removeItem(STORAGE_KEY(gardenId, date));
}
