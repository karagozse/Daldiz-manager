/**
 * Environment Configuration - Single Source of Truth for API Configuration
 * 
 * This module centralizes all API-related configuration from Vite environment variables.
 * Use this module instead of directly accessing import.meta.env throughout the codebase.
 */

/**
 * Resolve the API base URL dynamically based on current hostname.
 * This allows the app to work on both localhost and LAN (e.g., phone on same Wi-Fi)
 * without manually editing .env files.
 * 
 * Logic:
 * - If VITE_API_BASE_URL is set, use it (override)
 * - If hostname is "localhost" or "127.0.0.1" → backend = "http://localhost:3000"
 * - Otherwise → backend = "http://{hostname}:3000" (e.g., "http://192.168.1.76:3000")
 */
function resolveApiBaseUrl(): string {
  // If an explicit env var is set, prefer it (override)
  const envUrl =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fallback: use current hostname to determine backend URL
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname || "localhost";

    // If accessing from localhost or 127.0.0.1, backend is also on localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }

    // Otherwise, use the same hostname with port 3000 (for LAN access from phone/tablet)
    // e.g., http://192.168.1.76:8080 → backend = http://192.168.1.76:3000
    return `http://${hostname}:3000`;
  }

  // Final fallback (SSR or weird case)
  return "http://localhost:3000";
}

/**
 * API Base URL for backend requests
 * 
 * Automatically uses the current hostname so the app works on:
 * - localhost (http://localhost:3000)
 * - LAN IP (http://192.168.x.x:3000)
 * 
 * Can be overridden via VITE_API_BASE_URL or VITE_API_URL environment variable.
 */
export const apiBaseUrl: string = resolveApiBaseUrl();

/**
 * Whether to use mock backend instead of real API
 * 
 * Default: false (use real backend by default)
 * 
 * Set via VITE_USE_MOCK_BACKEND environment variable.
 * Example: VITE_USE_MOCK_BACKEND=true
 * 
 * Note: This is a configuration flag. The app may still fall back to mock
 * authentication in development mode if the backend is unreachable, but
 * this flag controls the initial preference.
 */
export const useMockBackend: boolean = 
  import.meta.env.VITE_USE_MOCK_BACKEND === 'true';
