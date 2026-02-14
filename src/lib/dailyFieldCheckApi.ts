/**
 * Günlük Saha Kontrolü - Backend API client.
 * Denetim (inspection) akışı ile aynı pattern: getOrCreate, update (draft), submit, delete.
 */

import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/api";

export type DailyFieldCheckStatus = "DRAFT" | "SUBMITTED";

export interface BackendDailyFieldCheck {
  id: string;
  tenantId: string;
  gardenId: number;
  createdById: number;
  date: string;
  status: DailyFieldCheckStatus;
  answers: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  garden?: { id: number; name: string; campus?: { name: string } };
  createdBy?: { id: number; displayName: string };
}

export interface GetDailyFieldCheckResponse {
  exists: boolean;
  record: BackendDailyFieldCheck | null;
}

/**
 * GET /gardens/:gardenId/daily-field-check?date=YYYY-MM-DD
 * Returns { exists, record }. Does not create. record is null when no draft exists.
 */
export async function getDailyFieldCheck(
  gardenId: number,
  date: string
): Promise<GetDailyFieldCheckResponse> {
  return apiGet<GetDailyFieldCheckResponse>(
    `/gardens/${gardenId}/daily-field-check?date=${encodeURIComponent(date)}`
  );
}

/**
 * POST /gardens/:gardenId/daily-field-check
 * Create a new draft (or return existing). Body: { date, answers? }
 */
export async function createDailyFieldCheck(
  gardenId: number,
  date: string,
  answers?: Record<string, unknown>
): Promise<BackendDailyFieldCheck> {
  return apiPost<BackendDailyFieldCheck>(
    `/gardens/${gardenId}/daily-field-check`,
    { date, answers }
  );
}

/**
 * PUT /daily-field-check/:id
 * Update draft answers (stays draft).
 */
export async function updateDailyFieldCheck(
  id: string,
  answers: Record<string, unknown>
): Promise<BackendDailyFieldCheck> {
  return apiPut<BackendDailyFieldCheck>(`/daily-field-check/${id}`, {
    answers,
  });
}

/**
 * POST /daily-field-check/:id/submit
 * Mark as submitted.
 */
export async function submitDailyFieldCheck(
  id: string
): Promise<BackendDailyFieldCheck> {
  return apiPost<BackendDailyFieldCheck>(
    `/daily-field-check/${id}/submit`,
    undefined
  );
}

/**
 * DELETE /daily-field-check/:id
 * Delete draft (only draft can be deleted).
 */
export async function deleteDailyFieldCheck(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/daily-field-check/${id}`);
}

/**
 * GET /daily-field-check?gardenId=&limit=
 * List daily field checks (for Analiz sayfası).
 */
export async function listDailyFieldChecks(gardenId?: number, limit = 20): Promise<BackendDailyFieldCheck[]> {
  const params = new URLSearchParams();
  if (gardenId != null) params.set("gardenId", String(gardenId));
  params.set("limit", String(limit));
  return apiGet<BackendDailyFieldCheck[]>(`/daily-field-check?${params.toString()}`);
}
