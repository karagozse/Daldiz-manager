/**
 * API helpers for Critical Warnings
 */

import { apiFetch } from "./api";
import type { CriticalWarning } from "@/contexts/AppContext";

/**
 * Fetch critical warnings for a specific garden
 */
export async function fetchCriticalWarningsForGarden(
  gardenId: number,
  status: "OPEN" | "CLOSED" | "all" = "OPEN"
): Promise<CriticalWarning[]> {
  const params = new URLSearchParams();
  if (status && status !== "all") {
    params.set("status", status);
  }
  const res = await apiFetch<CriticalWarning[]>(
    `/gardens/${gardenId}/critical-warnings?${params.toString()}`
  );
  return res;
}

/**
 * Filters for global critical warnings
 */
export interface CriticalWarningFilters {
  status?: "OPEN" | "CLOSED" | "all";
  campusId?: string; // "belek" | "candir" | "manavgat" | "all"
  topicId?: number | "all";
  limit?: number;
  offset?: number;
}

/**
 * Fetch global critical warnings with filters
 */
export async function fetchGlobalCriticalWarnings(
  filters: CriticalWarningFilters
): Promise<CriticalWarning[]> {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.campusId && filters.campusId !== "all") {
    params.set("campusId", filters.campusId);
  }
  if (filters.topicId && filters.topicId !== "all") {
    params.set("topicId", String(filters.topicId));
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.offset) {
    params.set("offset", String(filters.offset));
  }

  const res = await apiFetch<CriticalWarning[]>(
    `/critical-warnings?${params.toString()}`
  );
  return res;
}

/**
 * Create a new critical warning for an inspection
 */
export async function createCriticalWarning(
  inspectionId: string | number,
  payload: {
    topicId: number;
    title: string;
    description: string;
    severity?: "LOW" | "MEDIUM" | "HIGH";
  }
): Promise<CriticalWarning> {
  const res = await apiFetch<CriticalWarning>(
    `/inspections/${inspectionId}/critical-warnings`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return res;
}

/**
 * Update a critical warning (status, closure note, severity)
 */
export async function updateCriticalWarning(
  id: string,
  payload: {
    status?: "OPEN" | "CLOSED";
    closureNote?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH";
  }
): Promise<CriticalWarning> {
  const res = await apiFetch<CriticalWarning>(
    `/critical-warnings/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  return res;
}