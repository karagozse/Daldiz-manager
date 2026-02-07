/**
 * API Helper - Backend API çağrıları için basit fetch wrapper
 * 
 * Bu helper, backend entegrasyonu için hazırlanmış basit bir API client'tır.
 * JWT token yönetimi otomatik olarak localStorage'dan okunur ve header'a eklenir.
 */

import { apiBaseUrl } from "@/config/env";

/**
 * API base URL - dynamically resolved based on hostname
 * Uses apiBaseUrl from config/env.ts which:
 * - Uses VITE_API_BASE_URL if set (override)
 * - Uses http://localhost:3000 if hostname is localhost/127.0.0.1
 * - Uses http://{hostname}:3000 otherwise (e.g., http://192.168.1.76:3000)
 */
const getBaseURL = (): string => {
  return apiBaseUrl;
};

/**
 * Token storage keys - proje genelinde tutarlı olmalı
 */
const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * Module-level access token storage
 */
let accessToken: string | null = null;

// Initialize token from localStorage on module load
if (typeof window !== "undefined") {
  const storedAccess = localStorage.getItem(TOKEN_KEY);
  if (storedAccess) {
    accessToken = storedAccess;
  }
}

/**
 * Auth token'ı ayarla ve localStorage'a kaydet
 */
export function setAuthToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

/**
 * Handle 401 Unauthorized - clear token and redirect to login
 */
function handleUnauthorized() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    accessToken = null;
  } catch (e) {
    console.error("Failed to clear access token from localStorage", e);
  }
  // Redirect to login page
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

/**
 * Refresh token functions - deprecated, kept for backward compatibility
 * These are no-ops since we don't use refresh tokens anymore
 */
export function setRefreshToken(_token: string | null) {
  // No-op: refresh tokens are not used
}

export function getRefreshToken(): string | null {
  // No-op: refresh tokens are not used
  return null;
}

/**
 * localStorage'dan auth token'ı kaldır
 */
export function removeAuthToken() {
  setAuthToken(null);
  // Note: refresh tokens are no longer used, but kept for backward compatibility
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Backend/DB bağlantı koptu popup için handler - AppContext mount'ta register edilir
 */
let backendDownHandler: ((reason?: string) => void) | null = null;

export function registerBackendDownHandler(fn: (reason?: string) => void) {
  backendDownHandler = fn;
}

function isBackendDownError(error: {
  status?: number;
  message?: string;
  responseData?: string;
}): boolean {
  const status = error?.status;
  if (status === 401 || status === 403) return false;
  if (status === 502 || status === 503 || status === 504) return true;

  const msg = String(error?.message ?? "").toLowerCase();
  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("err_network")
  )
    return true;

  if (status === 500) {
    const dataStr = String(error?.responseData ?? "").toLowerCase();
    if (
      dataStr.includes("database") ||
      dataStr.includes("connection") ||
      dataStr.includes("econnrefused") ||
      dataStr.includes("etimedout") ||
      dataStr.includes("postgres") ||
      dataStr.includes("prisma") ||
      dataStr.includes("neon")
    )
      return true;
  }
  return false;
}

/**
 * Generic API fetch fonksiyonu
 * 
 * @param path - API endpoint path'i (örn: "/auth/login", "/campuses")
 * @param options - Fetch options (method, body, headers vb.)
 * @returns Promise<T> - API response'u generic tip olarak döner
 * 
 * @example
 * ```ts
 * const data = await apiFetch<User[]>("/users");
 * const result = await apiFetch<LoginResponse>("/auth/login", {
 *   method: "POST",
 *   body: JSON.stringify({ username, password }),
 * });
 * ```
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseURL = getBaseURL();
  const url = `${baseURL}${path}`;

  // Skip 401 handling for login endpoint
  const isAuthEndpoint = path === "/auth/login";

  // Get token from memory or localStorage (fallback)
  const token =
    accessToken ||
    (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // Auth token varsa Authorization header'ına ekle
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Set Content-Type only if not already provided in options.headers
  if (!headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (e) {
    const err = e as Error;
    const errorObj = { message: err.message };
    if (isBackendDownError(errorObj) && backendDownHandler) {
      backendDownHandler(`network: ${err.message}`);
    }
    throw e;
  }

  // Handle 401 Unauthorized - clear token and redirect to login
  if (response.status === 401 && !isAuthEndpoint) {
    handleUnauthorized();
    const error = new Error("Unauthorized");
    (error as any).status = 401;
    (error as any).statusText = "Unauthorized";
    throw error;
  }

  // Hata durumunu kontrol et
  if (!response.ok) {
    // Hata mesajını anlamlı hale getir
    let errorMessage = `API error ${response.status} ${response.statusText}`;
    let responseText = "";
    try {
      responseText = await response.text();
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
      }
    } catch {
      // Text okuma başarısız olursa varsayılan mesajı kullan
    }

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).responseData = responseText;

    if (
      isBackendDownError({
        status: response.status,
        message: errorMessage,
        responseData: responseText,
      }) &&
      backendDownHandler
    ) {
      backendDownHandler(`status=${response.status} message=${errorMessage}`);
    }
    throw error;
  }

  // Bazı endpoint'ler boş body dönebilir (örn: 204 No Content)
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as T;
    } catch {
      // JSON parse başarısız olursa undefined dön
      return undefined as T;
    }
  }

  // JSON değilse T unknown olarak dön
  return undefined as T;
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(path: string, body?: any): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(path: string, body?: any): Promise<T> {
  return apiFetch<T>(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = unknown>(path: string, body?: any): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}
