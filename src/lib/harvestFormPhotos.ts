/**
 * Unified photo state for harvest form (create + revize).
 * Used so revize mode can show existing photos, add new, mark deleted, and sync on submit.
 */

import type { HarvestPhoto } from "@/lib/harvest";

export type FormPhotoItem = {
  id?: string;
  url?: string;
  file?: File;
  previewUrl: string;
  status: "existing" | "new" | "deleted";
};

/**
 * Convert server harvest photos to form state. Existing photos get status 'existing';
 * previewUrl is the server url (or same as url).
 */
export function normalizeExistingPhotos(
  existing: HarvestPhoto[],
  getPreviewUrl?: (url: string) => string
): FormPhotoItem[] {
  if (!existing?.length) return [];
  const resolve = getPreviewUrl ?? ((u: string) => u);
  return existing.map((p) => ({
    id: p.id,
    url: p.url,
    previewUrl: resolve(p.url),
    status: "existing" as const,
  }));
}

/**
 * Create a new form photo item from a File (for revize add).
 * Caller should revoke the object URL on remove/unmount.
 */
export function formPhotoFromFile(file: File): FormPhotoItem {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    status: "new",
  };
}
