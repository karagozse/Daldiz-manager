/**
 * Photo Utilities - Centralized photo URL building
 * 
 * This module provides utilities for converting stored photo paths
 * (from the backend) to full URLs for display.
 */

import { apiBaseUrl } from "@/config/env";

/**
 * Convert a photo path (from backend) to a full URL for display
 * 
 * @param photoPath - Photo path from backend (e.g. "/uploads/inspections/abc123.jpg")
 * @returns Full URL for the photo, or null if no path provided
 * 
 * Uses the centralized apiBaseUrl from @/config/env which automatically
 * resolves to the correct backend URL based on hostname (localhost or LAN IP).
 * 
 * @example
 * ```ts
 * const url = getPhotoUrl("/uploads/inspections/abc123.jpg");
 * // On localhost: "http://localhost:3000/uploads/inspections/abc123.jpg"
 * // On mobile (192.168.1.76): "http://192.168.1.76:3000/uploads/inspections/abc123.jpg"
 * 
 * const url2 = getPhotoUrl("https://example.com/photo.jpg");
 * // Returns: "https://example.com/photo.jpg" (already absolute)
 * ```
 */
export function getPhotoUrl(photoPath?: string | null): string | null {
  if (!photoPath) return null;
  
  // If it's already an absolute URL, return as-is
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }
  
  // Otherwise, build it relative to the API base URL (dynamically resolved from env.ts)
  // Remove leading slash if present, then combine with base URL
  const cleanPath = photoPath.replace(/^\/+/, "");
  return `${apiBaseUrl}/${cleanPath}`;
}