/**
 * Permission helpers for role-based UI visibility and actions.
 * Backend sends Role as CONSULTANT | LEAD_AUDITOR | ADMIN | SUPER_ADMIN;
 * we map to semantic roles: root | yonetici | danisman | denetci.
 */

export type Role = 'root' | 'yonetici' | 'danisman' | 'denetci';

export type BackendRole = 'CONSULTANT' | 'LEAD_AUDITOR' | 'ADMIN' | 'SUPER_ADMIN';

const BACKEND_TO_ROLE: Record<BackendRole, Role> = {
  SUPER_ADMIN: 'root',
  ADMIN: 'yonetici',
  CONSULTANT: 'danisman',
  LEAD_AUDITOR: 'denetci',
};

export function mapBackendRoleToSemantic(backendRole: string): Role {
  const r = BACKEND_TO_ROLE[backendRole as BackendRole];
  return r ?? 'yonetici';
}

export const can = {
  startAudit: (role: Role) => role === 'root' || role === 'danisman',
  seeStartAuditBtn: (role: Role) => role === 'root' || role === 'danisman',
  writeRecipe: (role: Role) => role === 'root' || role === 'danisman',
  seeWriteRecipeBtn: (role: Role) => role === 'root' || role === 'danisman',
  seePendingAudits: (role: Role) => role === 'root' || role === 'danisman' || role === 'denetci',
  openPendingAudit: (role: Role) => role === 'root' || role === 'denetci',
  seePendingRecipes: (role: Role) => role === 'root' || role === 'danisman' || role === 'denetci',
  openPendingRecipe: (role: Role) => role === 'root' || role === 'denetci',
  viewCurrentPrescription: (_role: Role) => true,
  editCurrentPrescription: (role: Role) => role === 'root' || role === 'denetci',
  /** Görev Merkezi ikonu + modal: sadece root, denetci */
  seeTaskCenter: (role: Role) => role === 'root' || role === 'denetci',
} as const;
