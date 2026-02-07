import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { formatDateTR } from '@/lib/date';

export type PrescriptionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Prescription {
  id: number;
  campusId: string;
  createdById: number;
  ventilation: string | null;
  irrigation: string | null;
  fertilization: string | null;
  status: PrescriptionStatus;
  approvedById: number | null;
  approvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: {
    id: number;
    username: string;
    displayName: string;
    role: string;
  };
  approvedBy?: {
    id: number;
    username: string;
    displayName: string;
    role: string;
  } | null;
  campus?: {
    id: string;
    name: string;
    weight: number;
  };
}

/**
 * Prescription için gösterilecek tarihi hesaplar.
 * Öncelik: approvedAt -> updatedAt -> createdAt
 * Geçerli bir tarih yoksa null döner.
 * @param p - Prescription objesi veya null
 * @returns dd.MM.yyyy formatında tarih string'i veya null
 */
export function getPrescriptionEffectiveDate(p?: Prescription | null): string | null {
  if (!p) return null;

  const raw =
    (p.approvedAt as string | undefined) ??
    p.updatedAt ??
    p.createdAt;

  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  // dd.MM.yyyy formatında döndür
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * @deprecated Use getPrescriptionEffectiveDate instead
 */
export function getPrescriptionDisplayDate(p?: Prescription | null): string | null {
  return getPrescriptionEffectiveDate(p);
}

export interface CreatePrescriptionRequest {
  campusId: string;
  ventilation?: string;
  irrigation?: string;
  fertilization?: string;
}

export interface UpdatePrescriptionRequest {
  ventilation?: string;
  irrigation?: string;
  fertilization?: string;
  status?: string;
}

export interface ReviewPrescriptionRequest {
  status: 'approved' | 'rejected';
  reviewNote?: string;
}

/**
 * Create a new prescription draft
 */
export const createPrescription = async (data: CreatePrescriptionRequest): Promise<Prescription> => {
  return apiPost<Prescription>('/prescriptions', data);
};

/**
 * Update prescription (only draft or rejected)
 */
export const updatePrescription = async (id: number, data: UpdatePrescriptionRequest): Promise<Prescription> => {
  return apiPut<Prescription>(`/prescriptions/${id}`, data);
};

/**
 * Submit prescription for review
 */
export const submitPrescriptionForReview = async (id: number): Promise<Prescription> => {
  return apiPost<Prescription>(`/prescriptions/${id}/submit`, {});
};

/**
 * Review prescription (approve or return)
 */
export const reviewPrescription = async (id: number, data: ReviewPrescriptionRequest): Promise<Prescription> => {
  return apiPost<Prescription>(`/prescriptions/${id}/review`, data);
};

/**
 * Get latest approved prescription for a campus.
 * Returns null when none exists (404/empty) — not an error. Only throws on real network/5xx.
 */
export const getLatestPrescriptionByCampus = async (campusId: string): Promise<Prescription | null> => {
  try {
    const result = await apiGet<Prescription>(`/prescriptions/campus/${campusId}/latest`);
    if (result == null || typeof (result as { id?: unknown })?.id !== 'number') {
      return null;
    }
    return result as Prescription;
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 404) {
      return null;
    }
    throw error;
  }
};


/**
 * Get prescription by ID
 */
export const getPrescription = async (id: number): Promise<Prescription> => {
  return apiGet<Prescription>(`/prescriptions/${id}`);
};

/**
 * Delete prescription
 */
export const deletePrescription = async (id: number): Promise<void> => {
  return apiDelete<void>(`/prescriptions/${id}`);
};

/**
 * List all prescriptions for a campus
 */
export const listPrescriptionsByCampus = async (campusId: string): Promise<Prescription[]> => {
  return apiGet<Prescription[]>(`/prescriptions/campus/${campusId}/list`);
};

/**
 * List pending review prescriptions
 */
export const listPendingReviewPrescriptions = async (): Promise<Prescription[]> => {
  return apiGet<Prescription[]>('/prescriptions/pending');
};

/**
 * Get pending prescription for a specific campus
 */
export const getPendingPrescriptionByCampus = async (campusId: string): Promise<Prescription | null> => {
  try {
    const allPending = await listPendingReviewPrescriptions();
    const campusPending = allPending.find(p => p != null && p.campusId === campusId);
    return campusPending || null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug(`Pending prescription for campus ${campusId}:`, error);
    }
    return null;
  }
};

/**
 * Get latest prescription for a campus (any status, ordered by id desc)
 */
export const getLatestPrescriptionByCampusAnyStatus = async (campusId: string): Promise<Prescription | null> => {
  try {
    const all = await listPrescriptionsByCampus(campusId);
    if (!Array.isArray(all) || all.length === 0) return null;
    const valid = all.filter((p): p is Prescription => p != null && typeof p.id === 'number');
    if (valid.length === 0) return null;
    return valid.sort((a, b) => b.id - a.id)[0];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug(`Latest prescription (any status) for campus ${campusId}:`, error);
    }
    return null;
  }
};

/**
 * Get status label in Turkish
 */
export const getPrescriptionStatusLabel = (status: PrescriptionStatus): string => {
  const statusUpper = status.toUpperCase() as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  const labels: Record<'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED', string> = {
    DRAFT: 'Taslak',
    PENDING: 'Denetçi onayı bekliyor',
    REJECTED: 'Reddedildi',
    APPROVED: 'Onaylandı (Güncel reçete)',
  };
  return labels[statusUpper] || status;
};

/**
 * Prescription için onay tarihini hesaplar ve formatlar.
 * Öncelik: updatedAt -> createdAt
 * Geçerli bir tarih yoksa null döner.
 * @param p - Prescription objesi veya null
 * @returns dd.MM.yyyy formatında tarih string'i veya null
 */
export function getPrescriptionApprovedDateLabel(p?: Prescription | null): string | null {
  if (!p) return null;

  const raw =
    (p.updatedAt && new Date(p.updatedAt)) ||
    (p.createdAt && new Date(p.createdAt)) ||
    null;

  if (!raw || isNaN(raw.getTime())) {
    return null;
  }

  // formatDateTR zaten Date veya string kabul ediyor, invalid ise "" döndürür
  const formatted = formatDateTR(raw);
  if (!formatted) {
    return null;
  }

  return formatted; // dd.MM.yyyy
}
