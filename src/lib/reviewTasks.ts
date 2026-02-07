/**
 * Görev Merkezi – ortak görev tipi ve mapping helpers.
 * Pending reçeteler + değerlendirme bekleyen denetimler tek listede kullanılır.
 */

import type { Prescription } from "@/lib/prescriptions";
import type { BackendInspection } from "@/contexts/AppContext";
import { getPrescriptionStatusLabel } from "@/lib/prescriptions";

export type TaskType = "prescription" | "inspection";

export interface ReviewTask {
  id: string;
  type: TaskType;
  /** Inspection: garden id. Prescription: not used for nav. */
  gardenId?: number;
  /** Inspection: inspection id. */
  inspectionId?: string;
  /** Prescription: id for review modal. */
  prescriptionId?: number;
  campusId?: string;
  campusName?: string;
  gardenName?: string;
  createdAt?: string;
  statusLabel: string;
}

/** Map pending prescriptions (API) to ReviewTask[]. */
export function mapPendingPrescriptionsToTasks(rows: Prescription[]): ReviewTask[] {
  return rows.map((p) => {
    const campusName = p.campus?.name ?? p.campusId ?? "—";
    const raw = (p.updatedAt ?? p.createdAt) ?? undefined;
    const createdAt = typeof raw === "string" ? raw : undefined;
    return {
      id: `prescription-${p.id}`,
      type: "prescription",
      prescriptionId: p.id,
      campusId: p.campusId,
      campusName,
      gardenName: "Kampüs reçetesi",
      createdAt,
      statusLabel: getPrescriptionStatusLabel(p.status),
    };
  });
}

/** Map pending inspections to ReviewTask[] - Single-layer flow: no separate pending evaluations. */
export function mapPendingInspectionsToTasks(_rows: BackendInspection[]): ReviewTask[] {
  const pending = _rows.filter(() => false); // No SUBMITTED/REVIEW in single-layer flow
  return pending.map((i) => {
    const campusName = i.garden?.campus?.name ?? "—";
    const gardenName = i.garden?.name ?? "—";
    return {
      id: `inspection-${i.id}`,
      type: "inspection",
      gardenId: i.gardenId,
      inspectionId: i.id,
      campusId: i.garden?.campusId,
      campusName,
      gardenName,
      createdAt: i.createdAt,
      statusLabel: "Değerlendirme bekliyor",
    };
  });
}
