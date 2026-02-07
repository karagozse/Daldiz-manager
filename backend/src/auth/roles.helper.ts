import { Role } from '@prisma/client';

/**
 * Semantic roles used for permission checks.
 * DB enum stays as CONSULTANT | LEAD_AUDITOR | ADMIN | SUPER_ADMIN.
 * Mapping: SUPER_ADMIN→root, ADMIN→yonetici, CONSULTANT→danisman, LEAD_AUDITOR→denetci.
 */
export type SemanticRole = 'root' | 'yonetici' | 'danisman' | 'denetci';

const BACKEND_TO_SEMANTIC: Record<Role, SemanticRole> = {
  [Role.SUPER_ADMIN]: 'root',
  [Role.ADMIN]: 'yonetici',
  [Role.CONSULTANT]: 'danisman',
  [Role.LEAD_AUDITOR]: 'denetci',
};

export function backendRoleToSemantic(role: Role): SemanticRole {
  return BACKEND_TO_SEMANTIC[role] ?? 'yonetici';
}

export function hasSemanticRole(user: { role: Role }, allowed: SemanticRole[]): boolean {
  const semantic = backendRoleToSemantic(user.role);
  return allowed.includes(semantic);
}
