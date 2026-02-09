/**
 * Harvest (Hasat) API client
 */

import { apiBaseUrl } from "@/config/env";
import { apiFetch, apiGet, apiPost, apiPut, apiDelete, getApiHeaders } from "@/lib/api";

export interface HarvestPhoto {
  id: string;
  category: "GENERAL" | "TRADER_SLIP";
  url: string;
  createdAt?: string;
}

export interface HarvestEntry {
  id: string;
  tenantId: string;
  gardenId: number;
  traderId?: string | null;
  traderName?: string;
  date: string;
  name: string;
  status: "draft" | "submitted";
  pricePerKg: number | null;
  grade1Kg: number | null;
  grade2Kg: number | null;
  thirdLabel: string | null;
  thirdKg: number | null;
  thirdPricePerKg: number | null;
  independentScaleFullKg: number | null;
  independentScaleEmptyKg: number | null;
  traderScaleFullKg: number | null;
  traderScaleEmptyKg: number | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  garden: {
    id: number;
    name: string;
    campusId: string;
    campus?: { id: string; name: string };
  };
  photos: HarvestPhoto[];
}

export interface TraderSuggestion {
  id: string;
  name: string;
}

export async function searchTraders(query: string): Promise<TraderSuggestion[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const res = await apiGet<{ items: TraderSuggestion[] }>(`/traders?query=${q}`);
  return res?.items ?? [];
}

/** Distinct trader names from harvests (for autocomplete in harvest form) */
export async function searchHarvestTraders(query: string): Promise<TraderSuggestion[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const list = await apiGet<{ name: string }[]>(`${BASE}/traders?q=${q}`);
  if (!Array.isArray(list)) return [];
  return list.map((x) => ({ id: x.name, name: x.name }));
}

/** All traders for filter dropdown (GET /harvest/traders?list=all). */
export async function fetchAllHarvestTraders(): Promise<TraderSuggestion[]> {
  const list = await apiGet<{ name: string }[]>(`${BASE}/traders?list=all`);
  if (!Array.isArray(list)) return [];
  return list.map((x) => ({ id: x.name, name: x.name }));
}

export interface CreateHarvestPayload {
  date: string; // YYYY-MM-DD
  gardenId: number;
  traderName: string;
  pricePerKg: number;
  grade1Kg?: number | null;
  grade2Kg?: number | null;
  thirdLabel?: string | null;
  thirdKg?: number | null;
  thirdPricePerKg?: number | null;
  independentScaleFullKg?: number | null;
  independentScaleEmptyKg?: number | null;
  traderScaleFullKg?: number | null;
  traderScaleEmptyKg?: number | null;
}

export interface UpdateHarvestPayload extends Partial<CreateHarvestPayload> {}

const BASE = "/harvest";

export interface HarvestListResponse {
  items: HarvestEntry[];
}

/** Single row from GET /harvest/summary (submitted only) */
export interface HarvestSummaryRow {
  id: string;
  harvest_date: string;
  trader_name: string;
  total_kg: number;
  sale_price: number;
  total_amount: number | null;
  garden_name: string;
  campus_name: string;
  grade1_kg: number;
  grade2_kg: number;
  scale_full_kg: number | null;
  scale_empty_kg: number | null;
  scale_diff: number | null;
  second_ratio: number | null;
  scale_gap: number | null;
  scale_diff_pct: number | null;
  grade1_total: number;
  grade2_total: number;
  net_total: number;
}

export interface HarvestSummaryTotals {
  sum_grade1: number;
  sum_grade2: number;
  sum_total_kg: number;
  sum_full: number;
  sum_empty: number;
  sum_scale_diff: number;
  second_ratio_total: number | null;
  sum_scale_gap: number | null;
  avg_price: number | null;
  sum_grade1_total: number;
  sum_grade2_total: number;
  sum_net_total: number;
}

export interface HarvestSummaryResponse {
  rows: HarvestSummaryRow[];
  totals: HarvestSummaryTotals;
}

export interface HarvestSummaryFilters {
  year?: number;
  campusId?: string;
  gardenId?: number;
  trader?: string;
}

/** Yıl filtresi aralığı */
export const HARVEST_YEAR_MIN = 2026;
export const HARVEST_YEAR_MAX = 2030;

/** Bu yıl, HARVEST_YEAR_MIN..MAX aralığına clamp'lenmiş (varsayılan yıl filtresi). */
export function getDefaultHarvestYear(): number {
  const y = new Date().getFullYear();
  return Math.min(HARVEST_YEAR_MAX, Math.max(HARVEST_YEAR_MIN, y));
}

/** Satır durumu: danger (kırmızı) > warning (sarı) > ok (yeşil). Null-safe. */
export type HarvestRowStatus = "danger" | "warning" | "ok";

export function getRowStatus(row: HarvestSummaryRow): HarvestRowStatus {
  const kantarFarkiPercent = row?.scale_diff_pct ?? null;
  const secondRatioPercent = row?.second_ratio ?? null;
  if (kantarFarkiPercent != null && kantarFarkiPercent > 5) return "danger";
  if (secondRatioPercent != null && secondRatioPercent > 5) return "warning";
  return "ok";
}

export async function fetchHarvestSummary(
  filters: HarvestSummaryFilters
): Promise<HarvestSummaryResponse> {
  const params = new URLSearchParams();
  if (filters.year != null) params.set("year", String(filters.year));
  if (filters.campusId != null && filters.campusId !== "") params.set("campusId", filters.campusId);
  if (filters.gardenId != null) params.set("gardenId", String(filters.gardenId));
  if (filters.trader != null && filters.trader !== "") params.set("trader", filters.trader);
  const q = params.toString();
  const res = await apiGet<HarvestSummaryResponse>(q ? `${BASE}/summary?${q}` : `${BASE}/summary`);
  return (
    res ?? {
      rows: [],
      totals: {
        sum_grade1: 0,
        sum_grade2: 0,
        sum_total_kg: 0,
        sum_full: 0,
        sum_empty: 0,
        sum_scale_diff: 0,
        second_ratio_total: null,
        sum_scale_gap: null,
        avg_price: null,
        sum_grade1_total: 0,
        sum_grade2_total: 0,
        sum_net_total: 0,
      },
    }
  );
}

export async function listHarvest(params?: {
  date_from?: string;
  date_to?: string;
  status?: string;
  garden_id?: number;
}): Promise<HarvestListResponse> {
  const search = new URLSearchParams();
  if (params?.date_from) search.set("date_from", params.date_from);
  if (params?.date_to) search.set("date_to", params.date_to);
  if (params?.status) search.set("status", params.status);
  if (params?.garden_id != null) search.set("garden_id", String(params.garden_id));
  const q = search.toString();
  const res = await apiGet<HarvestListResponse>(q ? `${BASE}?${q}` : BASE);
  return res && typeof res.items !== "undefined" ? res : { items: [] };
}

function isInvalidHarvestId(id: string | undefined): boolean {
  if (id == null || typeof id !== "string") return true;
  const t = id.trim().toLowerCase();
  return t === "" || t === "undefined" || t === "null";
}

export async function getHarvest(id: string): Promise<HarvestEntry> {
  if (isInvalidHarvestId(id)) {
    return Promise.reject(new Error("Harvest id is required."));
  }
  return apiGet<HarvestEntry>(`${BASE}/${id}`);
}

export async function createHarvest(payload: CreateHarvestPayload): Promise<HarvestEntry> {
  return apiPost<HarvestEntry>(BASE, payload);
}

export async function updateHarvest(id: string, payload: UpdateHarvestPayload): Promise<HarvestEntry> {
  return apiPut<HarvestEntry>(`${BASE}/${id}`, payload);
}

export async function submitHarvest(id: string): Promise<HarvestEntry> {
  return apiPost<HarvestEntry>(`${BASE}/${id}/submit`, {});
}

export async function deleteHarvest(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`${BASE}/${id}`);
}

/** Delete a single harvest photo (draft only). */
export async function deleteHarvestPhoto(harvestId: string, photoId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`${BASE}/${harvestId}/photos/${photoId}`);
}

/** Upload harvest photos (multipart). category: GENERAL | TRADER_SLIP */
export async function uploadHarvestPhotos(
  harvestId: string,
  category: "GENERAL" | "TRADER_SLIP",
  files: File[]
): Promise<{ photos: HarvestPhoto[] }> {
  if (files.length === 0) return { photos: [] };
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const url = `${apiBaseUrl}/uploads/harvest-photo/${harvestId}?category=${category}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const tenantKey = import.meta.env.VITE_TENANT_KEY || "kral";
  const headers: Record<string, string> = { "x-tenant": tenantKey };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: form });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.message || text;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// --- Computed helpers (mirror backend logic for UI) ---

export function harvestTotalKg(e: HarvestEntry): number | null {
  const g1 = e.grade1Kg ?? 0;
  const g2 = e.grade2Kg ?? 0;
  const g3 = e.thirdKg ?? 0;
  const total = g1 + g2 + g3;
  return total > 0 ? total : null;
}

export function harvestSecondRatio(e: HarvestEntry): number | null {
  const total = harvestTotalKg(e);
  if (total == null || total === 0) return null;
  const g2 = e.grade2Kg ?? 0;
  return (g2 / total) * 100;
}

export function isSecondRatioHigh(e: HarvestEntry): boolean {
  const r = harvestSecondRatio(e);
  return r != null && r > 5;
}

/** Revenue: grade1*price + grade2*(price/2) + third*thirdPrice (if third exists) */
export function harvestRevenue(e: HarvestEntry): number | null {
  const price = e.pricePerKg ?? 0;
  const g1 = e.grade1Kg ?? 0;
  const g2 = e.grade2Kg ?? 0;
  const g3 = e.thirdKg ?? 0;
  const thirdPrice = e.thirdPricePerKg ?? 0;
  if (g1 === 0 && g2 === 0 && g3 === 0) return null;
  const rev = g1 * price + g2 * (price / 2) + g3 * thirdPrice;
  return rev;
}

/** Dolu (kg) = independentScaleFullKg */
export function harvestScaleFull(e: HarvestEntry): number | null {
  const v = e.independentScaleFullKg;
  return v != null ? v : null;
}

/** Boş (kg) = independentScaleEmptyKg */
export function harvestScaleEmpty(e: HarvestEntry): number | null {
  const v = e.independentScaleEmptyKg;
  return v != null ? v : null;
}

/** Fark = dolu - boş (kantar) */
export function harvestScaleDiff(e: HarvestEntry): number | null {
  const full = harvestScaleFull(e);
  const empty = harvestScaleEmpty(e);
  if (full == null && empty == null) return null;
  return (full ?? 0) - (empty ?? 0);
}

/** Kantar Farkı = fark - toplam (grade1+grade2) */
export function harvestKantarDiff(e: HarvestEntry): number | null {
  const fark = harvestScaleDiff(e);
  const total = harvestTotalKg(e);
  if (fark == null && total == null) return null;
  return (fark ?? 0) - (total ?? 0);
}

/** 1. kalite toplam = grade1 * sale_price */
export function harvestGrade1Total(e: HarvestEntry): number | null {
  const g1 = e.grade1Kg ?? 0;
  const price = e.pricePerKg ?? 0;
  return g1 > 0 ? g1 * price : null;
}

/** 2. kalite toplam = grade2 * (sale_price / 2) */
export function harvestGrade2Total(e: HarvestEntry): number | null {
  const g2 = e.grade2Kg ?? 0;
  const price = e.pricePerKg ?? 0;
  return g2 > 0 ? g2 * (price / 2) : null;
}

/** KDV hariç tutar = 1. kalite toplam + 2. kalite toplam */
export function harvestRevenueKdvHaric(e: HarvestEntry): number | null {
  const t1 = harvestGrade1Total(e);
  const t2 = harvestGrade2Total(e);
  if (t1 == null && t2 == null) return null;
  return (t1 ?? 0) + (t2 ?? 0);
}
