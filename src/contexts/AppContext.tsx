import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
// Import only constants, not mock data generators
import {
  VALID_USERS,
  INSPECTION_TOPICS,
  CAMPUS_WEIGHTS,
  STATUS_OPTIONS,
  NOTE_TEMPLATES,
  WARNING_TEMPLATES,
  CLOSURE_NOTE_TEMPLATES,
  getRandomGardenIdHelper,
  getRandomNoteHelper,
  getRandomWarningHelper,
  INITIAL_GARDENS,
  generateCompletedCycle,
} from "./mockData";
// API helper'ı import et
import {
  apiFetch,
  setAuthToken as setApiAuthToken,
  removeAuthToken,
  registerBackendDownHandler,
} from "@/lib/api";
// Prescription types and functions
import {
  type Prescription,
  listPrescriptionsByCampus as apiListPrescriptionsByCampus,
  getLatestPrescriptionByCampus as apiGetLatestPrescriptionByCampus,
  createPrescription as apiCreatePrescription,
  updatePrescription as apiUpdatePrescription,
  submitPrescriptionForReview as apiSubmitPrescriptionForReview,
  reviewPrescription as apiReviewPrescription,
  deletePrescription as apiDeletePrescription,
} from "@/lib/prescriptions";

// App roles - SUPER_ADMIN is highest privilege (only for "admin" user)
export type UserRole = "CONSULTANT" | "LEAD_AUDITOR" | "ADMIN" | "SUPER_ADMIN";

// User credentials and roles mapping
export interface UserCredentials {
  id?: number; // Backend user ID (optional for backward compatibility with mock users)
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}

// Mock verileri dışa aktar (geriye uyumluluk için)
export { VALID_USERS, INSPECTION_TOPICS, CAMPUS_WEIGHTS };
export type InspectionState = "DRAFT" | "SUBMITTED";
export type TopicStatus = "uygun" | "kismen_uygun" | "uygun_degil" | "not_started";

/**
 * Backend Inspection tipi - API'den dönen inspection verisi
 */
export interface BackendInspection {
  id: string;
  gardenId: number;
  createdById: number;
  status: "DRAFT" | "SUBMITTED";
  createdAt: string;
  score: number | null;
  topics?: Array<{
    topicId: number;
    topicName: string;
    status: TopicStatus;
    note: string | null;
    photoUrl: string | null;
    score: number | null;
  }> | null;
  garden: {
    id: number;
    name: string;
    status: GardenStatus;
    campusId: string;
    campus: {
      id: string;
      name: string;
      weight: number;
    };
  };
  createdBy: {
    id: number;
    username: string;
    displayName: string;
    role: string;
  };
}

/**
 * Backend InspectionStatus'u Frontend InspectionState'e map et
 */
export const mapBackendStatusToFrontendState = (
  backendStatus: BackendInspection["status"]
): InspectionState => {
  switch (backendStatus) {
    case "DRAFT":
      return "DRAFT";
    case "SUBMITTED":
      return "SUBMITTED";
    default:
      return "DRAFT";
  }
};

/**
 * Kullanıcı doğrulama fonksiyonu
 * 
 * ŞU ANDA: Mock kullanıcı verilerini kontrol eder (VALID_USERS)
 * İLERİDE: Backend /auth/login endpoint'ine bağlanacak
 * 
 * @param username - Kullanıcı adı
 * @param password - Şifre
 * @returns UserCredentials | null - Eşleşen kullanıcı veya null
 */
async function authenticateUserLocal(
  username: string,
  password: string
): Promise<UserCredentials | null> {
  // Şu anda kullanılan mock kontrol mantığı
  const user = VALID_USERS.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  return user || null;
}

/**
 * Backend Auth Response tipi
 */
interface BackendAuthResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    role: string;
    email: string | null;
  };
}

/**
 * Kullanıcı doğrulama fonksiyonu (public export)
 * 
 * Backend API'ye bağlı çalışır:
 * 1. Önce backend API'ye istek at (/auth/login)
 * 2. Başarılı olursa API'den dönen kullanıcı bilgilerini kullan
 * 3. Hata olursa DEVELOPMENT modunda fallback olarak local mock doğrulamaya düş
 * 
 * @param username - Kullanıcı adı
 * @param password - Şifre
 * @param setAuthToken - Auth token'ı saklamak için callback
 * @param setCurrentUser - Current user'ı saklamak için callback
 * @returns UserCredentials | null - Eşleşen kullanıcı veya null
 */
export const authenticateUser = async (
  username: string,
  password: string,
  setAuthToken?: (token: string | null) => void,
  setCurrentUser?: (user: UserCredentials | null) => void,
  setIsUsingMockBackend?: (isMock: boolean) => void
): Promise<UserCredentials | null> => {
  try {
    // Backend API'ye login isteği
    const response = await apiFetch<BackendAuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    // Backend'den dönen user bilgilerini UserCredentials tipine map et
    const mappedUser: UserCredentials = {
      id: response.user.id, // Backend user ID
      username: response.user.username,
      password: "", // Şifre saklanmaz
      role: response.user.role as UserRole,
      displayName: response.user.displayName,
    };

    // Token'ı merkezi yönetim üzerinden kaydet
    setApiAuthToken(response.access_token);
    // Note: refresh_token is no longer used - 401 responses trigger logout
    
    // Context state'lerini güncelle (eğer callback'ler verilmişse)
    if (setAuthToken) {
      setAuthToken(response.access_token);
    }
    if (setCurrentUser) {
      setCurrentUser(mappedUser);
    }
    if (setIsUsingMockBackend) {
      setIsUsingMockBackend(false);
    }

    return mappedUser;
  } catch (error) {
    console.error("Backend login error", error);

    // DEVELOPMENT modunda local mock'a fallback yap
    if (import.meta.env.DEV) {
      const localUser = await authenticateUserLocal(username, password);
      if (localUser && setCurrentUser) {
        setCurrentUser(localUser);
      }
      if (setIsUsingMockBackend) {
        setIsUsingMockBackend(true);
      }
      return localUser;
    }

    // Production'da null dön
    return null;
  }
};

export interface CriticalWarning {
  id: string;
  topicId: number;
  title: string;
  description: string;
  status: "OPEN" | "CLOSED";
  openedDate: string;
  closedDate?: string;
  closureNote?: string;
  // Optional: garden info for display in modals
  // Backend returns gardenId as string, but we convert to number for compatibility
  gardenId?: number | string;
  gardenName?: string;
  campusName?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH"; // Optional - from backend
}

export interface TopicInspection {
  topicId: number;
  topicName: string;
  status: TopicStatus;
  note?: string;
  photoUrl?: string;
  score?: number; // 0-100, only set by lead auditor
}

export interface InspectionCycle {
  id: string;
  gardenId: number;
  state: InspectionState;
  consultantId?: string;
  leadAuditorId?: string;
  consultantSubmissionDate?: string;
  evaluationDate?: string;
  topics: TopicInspection[];
  gardenScore?: number; // 0-100, weighted average
  criticalWarnings: CriticalWarning[];
}

export type GardenStatus = "ACTIVE" | "INACTIVE";

export interface Garden {
  id: number;
  name: string;
  campusId: string;
  campusName: string;
  status: GardenStatus;
  openCriticalWarningCount?: number;
}

// INSPECTION_TOPICS ve CAMPUS_WEIGHTS artık mockData.ts'den import ediliyor
// Yukarıda export { VALID_USERS, INSPECTION_TOPICS, CAMPUS_WEIGHTS }; ile dışa aktarılıyor

/**
 * Calculate garden score as weighted sum of topic scores.
 * Garden Score = Σ(topicScore × topicWeight)
 * Output: 0-100 scale
 */
export const calculateGardenScore = (topics: TopicInspection[]): number => {
  let weightedSum = 0;
  let totalWeight = 0;
  
  topics.forEach((topic) => {
    // Only include topics with explicit numeric scores (including 0)
    // Do NOT treat undefined/null as 0
    if (typeof topic.score === "number") {
      const topicDef = INSPECTION_TOPICS.find(t => t.id === topic.topicId);
      if (topicDef) {
        weightedSum += topic.score * topicDef.weight;
        totalWeight += topicDef.weight;
      }
    }
  });
  
  // If not all topics scored, normalize by actual weight used
  if (totalWeight === 0) return 0;
  // Normalize to 0-100 (divide by totalWeight to handle partial scoring)
  return Math.round(weightedSum / totalWeight);
};

  /**
   * Calculate campus score as average of latest garden scores.
   * Only ACTIVE gardens are included in the calculation.
   * All gardens equally weighted within campus.
   * 
   * KRİTİK KURAL: Değerlendirilmemiş bahçeler ortalamaya dahil edilmez.
   * Sadece gerçekten skoru olan bahçeler hesaba katılır.
   * 
   * @returns number | null - Kampüs skoru (0-100) veya null (hiç skor yoksa)
   * 
   * NOT: Bu fonksiyon sadece backend SUBMITTED inspections'dan skor okur.
   * Mock inspectionCycles kullanılmaz.
   */
export const calculateCampusScore = (
  campusId: string,
  gardens: Garden[],
  getLatestBackendScoreForGarden: (gardenId: number) => number | null
): number | null => {
  // Only include ACTIVE gardens
  const campusGardens = gardens.filter(g => g.campusId === campusId && g.status === "ACTIVE");
  if (campusGardens.length === 0) return null;
  
  // Sadece skoru olan bahçeleri filtrele
  const scores = campusGardens
    .map(g => getLatestBackendScoreForGarden(g.id))
    .filter((s): s is number => typeof s === "number");
  
  // Hiç skor yoksa null döndür
  if (scores.length === 0) return null;
  
  // Ortalamayı hesapla
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round(sum / scores.length);
};

/**
 * Calculate company-wide general score as weighted sum of campus scores.
 * Only ACTIVE gardens are included via calculateCampusScore.
 * General Score = (Belek × 0.60) + (Çandır × 0.20) + (Manavgat × 0.20)
 * 
 * KRİTİK KURAL: Değerlendirilmemiş kampüsler ortalamaya dahil edilmez.
 * Sadece gerçekten skoru olan kampüsler hesaba katılır ve weight'leri normalize edilir.
 * 
 * @returns number | null - Genel skor (0-100) veya null (hiç skor yoksa)
 * 
 * NOT: Bu fonksiyon sadece backend SUBMITTED inspections'dan skor okur.
 * Mock inspectionCycles kullanılmaz.
 */
export const calculateGeneralScore = (
  gardens: Garden[],
  getLatestBackendScoreForGarden: (gardenId: number) => number | null
): number | null => {
  // Her kampüs için skor al ve sadece skoru olanları filtrele
  const scoredCampuses = Object.entries(CAMPUS_WEIGHTS)
    .map(([campusId, weight]) => {
      const hasActiveGardens = gardens.some(g => g.campusId === campusId && g.status === "ACTIVE");
      if (!hasActiveGardens) return null;
      
      const campusScore = calculateCampusScore(campusId, gardens, getLatestBackendScoreForGarden);
      if (campusScore === null) return null;
      
      return {
        campusId,
        score: campusScore,
        weight,
      };
    })
    .filter((item): item is { campusId: string; score: number; weight: number } => item !== null);
  
  // Hiç skor yoksa null döndür
  if (scoredCampuses.length === 0) return null;
  
  // Weight'leri normalize et (sadece skoru olan kampüslerin weight'leri toplamı)
  const totalWeight = scoredCampuses.reduce((sum, item) => sum + item.weight, 0);
  const weightedSum = scoredCampuses.reduce(
    (sum, item) => sum + item.score * item.weight,
    0
  );
  
  return Math.round(weightedSum / totalWeight);
};

interface AppContextType {
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  inspectionCycles: InspectionCycle[];
  setInspectionCycles: React.Dispatch<React.SetStateAction<InspectionCycle[]>>;
  gardens: Garden[];
  setGardens: React.Dispatch<React.SetStateAction<Garden[]>>;
  selectedGardenId: number | null;
  setSelectedGardenId: (id: number | null) => void;
  // For READ-ONLY viewing of previous inspections (used by InspectionSummary route)
  viewingInspectionId: string | null;
  setViewingInspectionId: (id: string | null) => void;
  // Legacy - kept for compatibility but routes to viewingInspectionId
  selectedInspectionId: string | null;
  setSelectedInspectionId: (id: string | null) => void;
  addCompletedInspection: () => void;
  addPendingEvaluation: () => void;
  addTestCriticalWarnings: () => void;
  addCompletedEvaluation: () => void;
  addYearlyTestData: (year: number) => void;
  getCompletedCyclesForGarden: (gardenId: number) => InspectionCycle[];
  getLatestCompletedCycleForGarden: (gardenId: number) => InspectionCycle | null;
  getPreviousCompletedCycleForGarden: (gardenId: number) => InspectionCycle | null;
  getPendingEvaluationForGarden: (gardenId: number) => InspectionCycle | undefined;
  getDraftForGarden: (gardenId: number) => InspectionCycle | undefined;
  findDraftForGarden: (gardenId: number) => InspectionCycle | undefined;
  getOpenCriticalWarningsCount: (gardenId: number) => number;
  getAllOpenCriticalWarnings: (campusId: string) => CriticalWarning[];
  // Garden management (admin only)
  addGarden: (name: string, campusId: string, campusName: string) => void;
  toggleGardenStatus: (gardenId: number) => void;
  getActiveGardens: () => Garden[];
  // Backend API entegrasyonu için merkezi veri yükleme
  isInitialDataLoading: boolean;
  loadInitialDataFromApi: () => Promise<void>;
  loadGardens: () => Promise<void>;
  // Backend Inspection API entegrasyonu
  inspections: BackendInspection[];
  loadInspectionsForGarden: (gardenId: number) => Promise<void>;
  loadAllInspections: () => Promise<void>;
  createInspection: (gardenId: number, options?: { status?: BackendInspection["status"]; topics?: any; score?: number }) => Promise<BackendInspection>;
  updateInspection: (inspectionId: string, data: { status?: BackendInspection["status"]; score?: number; topics?: any }) => Promise<BackendInspection>;
  // Backend score helper fonksiyonları
  getBackendScoresByGarden: () => Map<number, number[]>;
  getLatestBackendScoreForGarden: (gardenId: number) => number | null;
  getLatestScoreForGarden: (gardenId: number) => number | null;
  // Prescriptions state and functions
  prescriptions: Prescription[];
  setPrescriptions: React.Dispatch<React.SetStateAction<Prescription[]>>;
  latestPrescriptionByCampus: Record<string, Prescription | null>;
  pendingPrescriptionByCampus: Record<string, Prescription | null>;
  pendingPrescriptions: Prescription[];
  loadPrescriptionsByCampus: (campusId: string) => Promise<void>;
  loadLatestPrescriptionForCampus: (campusId: string) => Promise<void>;
  loadPendingPrescriptionForCampus: (campusId: string) => Promise<void>;
  loadPendingPrescriptions: () => Promise<void>;
  createPrescription: (campusId: string, data: { ventilation?: string; irrigation?: string; fertilization?: string }) => Promise<Prescription>;
  updatePrescription: (id: number, data: { ventilation?: string; irrigation?: string; fertilization?: string }) => Promise<Prescription>;
  submitPrescription: (id: number) => Promise<Prescription>;
  reviewPrescription: (id: number, decision: 'approved' | 'rejected') => Promise<Prescription | null>;
  deletePrescription: (id: number) => Promise<void>;
  createOrUpdatePrescription: (campusId: string, data: { ventilation?: string; irrigation?: string; fertilization?: string; submit?: boolean }) => Promise<Prescription>;
  // Legacy aliases for backward compatibility
  listPrescriptionsByCampus: (campusId: string) => Promise<void>;
  // Auth token yönetimi
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  currentUser: UserCredentials | null;
  setCurrentUser: (user: UserCredentials | null) => void;
  // Mock backend tracking
  isUsingMockBackend: boolean;
  setIsUsingMockBackend: (isMock: boolean) => void;
  // Backend/DB bağlantı koptu popup
  backendConnectionLost: boolean;
  markBackendDown: (reason?: string) => void;
  clearBackendDown: () => void;
  logout: () => void;
}

const BACKEND_DOWN_FLAG = "daldiz_backend_down";

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock veriler artık mockData.ts'den import ediliyor
// initialGardens -> INITIAL_GARDENS
// statusOptions -> STATUS_OPTIONS
// noteTemplates -> NOTE_TEMPLATES
// warningTemplates -> WARNING_TEMPLATES

const getInitialRole = (): UserRole => {
  // Role will be restored from currentUser after /me call
  // Default to CONSULTANT if no user is available
  return "CONSULTANT";
};

/**
 * INTERNAL provider component - contains all state and effects
 * This component must have all hooks at the top level with no conditionals
 */
const AppProviderInternal = ({ children }: { children: ReactNode }) => {
  // ALL HOOKS DECLARED AT THE TOP - NO CONDITIONALS
  const [activeRole, setActiveRole] = useState<UserRole>(() => getInitialRole());
  // inspectionCycles artık sadece anlık frontend state (taslak/geçici akış) için kullanılıyor
  // Skor kaynağı olarak kullanılmıyor - skorlar backend'den geliyor
  const [inspectionCycles, setInspectionCycles] = useState<InspectionCycle[]>([]);
  const [gardens, setGardens] = useState<Garden[]>([]);
  
  // Backend'den veri yükleme loading state'i
  const [isInitialDataLoading, setIsInitialDataLoading] = useState<boolean>(false);
  
  // Track whether we're using mock backend or real API
  const [isUsingMockBackend, setIsUsingMockBackend] = useState<boolean>(() => {
    // Check if we have a token - if yes, assume we're using API
    const token = localStorage.getItem("accessToken");
    return !token;
  });
  
  // Backend Inspection state'i
  const [inspections, setInspections] = useState<BackendInspection[]>([]);
  
  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [latestPrescriptionByCampus, setLatestPrescriptionByCampus] = useState<Record<string, Prescription | null>>({});
  const [pendingPrescriptionByCampus, setPendingPrescriptionByCampus] = useState<Record<string, Prescription | null>>({});
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [initialPrescriptionsLoaded, setInitialPrescriptionsLoaded] = useState(false);
  const [backendConnectionLost, setBackendConnectionLost] = useState(false);

  // Auth token ve current user state'leri
  const [authToken, setAuthTokenState] = useState<string | null>(() => 
    localStorage.getItem("accessToken")
  );
  const [currentUser, setCurrentUser] = useState<UserCredentials | null>(null);
  
  const [selectedGardenId, setSelectedGardenId] = useState<number | null>(null);
  // READ-ONLY viewing of previous inspections (used by InspectionSummary route)
  const [viewingInspectionId, setViewingInspectionId] = useState<string | null>(null);
  
  // Auth token setter - hem state hem localStorage'ı günceller
  const setAuthToken = (token: string | null) => {
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
    setAuthTokenState(token);
  };
  
  // Legacy compatibility - maps to viewingInspectionId
  const selectedInspectionId = viewingInspectionId;
  const setSelectedInspectionId = setViewingInspectionId;

  const markBackendDown = useCallback((reason?: string) => {
    console.warn("[backendConnectionLost] set true", reason);
    if (typeof window !== "undefined") {
      localStorage.setItem(BACKEND_DOWN_FLAG, "1");
    }
    setBackendConnectionLost(true);
  }, []);

  const clearBackendDown = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(BACKEND_DOWN_FLAG);
    }
    setBackendConnectionLost(false);
  }, []);

  const logout = useCallback(() => {
    removeAuthToken();
    setAuthToken(null);
    setCurrentUser(null);
    clearBackendDown();
  }, [setAuthToken, clearBackendDown]);

  // Migration: Move legacy "access_token" to "accessToken" (one-time)
  useEffect(() => {
    const legacyToken = localStorage.getItem("access_token");
    const currentToken = localStorage.getItem("accessToken");

    if (legacyToken && !currentToken) {
      localStorage.setItem("accessToken", legacyToken);
    }

    if (legacyToken) {
      localStorage.removeItem("access_token");
    }
  }, []);

  // Backend down flag'i mount'ta restore et (refresh sonrası popup tekrar gösterilsin)
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(BACKEND_DOWN_FLAG) === "1") {
      setBackendConnectionLost(true);
    }
  }, []);

  // API interceptor için handler register et
  useEffect(() => {
    registerBackendDownHandler((reason) => {
      markBackendDown(reason);
    });
  }, [markBackendDown]);

  // Garden management functions (admin only)
  const addGarden = useCallback((name: string, campusId: string, campusName: string) => {
    setGardens(prev => {
      const newId = Math.max(...prev.map(g => g.id), 0) + 1;
      const newGarden: Garden = {
        id: newId,
        name,
        campusId,
        campusName,
        status: "ACTIVE",
      };
      return [...prev, newGarden];
    });
  }, []);

  const toggleGardenStatus = useCallback((gardenId: number) => {
    setGardens(prev => prev.map(g => 
      g.id === gardenId 
        ? { ...g, status: g.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } 
        : g
    ));
  }, []);

  const getActiveGardens = useCallback(() => {
    return gardens.filter(g => g.status === "ACTIVE");
  }, [gardens]);

  /**
   * Get completed inspections for a garden from backend (SUBMITTED status)
   * Falls back to mock inspectionCycles for backward compatibility
   * Pure selector function - no state updates
   */
  const getCompletedCyclesForGarden = useCallback((gardenId: number) => {
    // First, try to get from backend inspections
    const backendScored = inspections
      .filter(i => i.gardenId === gardenId && i.status === "SUBMITTED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(i => ({
        id: i.id,
        gardenId: i.gardenId,
        state: "SUBMITTED" as InspectionState,
        consultantSubmissionDate: i.createdAt,
        evaluationDate: i.createdAt, // Use createdAt as evaluation date for now
        topics: (i.topics as TopicInspection[]) || [],
        gardenScore: i.score || undefined,
        criticalWarnings: [], // Critical warnings not yet in backend
      }));
    
    // Also include mock cycles for backward compatibility
    const mockCompleted = inspectionCycles
      .filter(c => c.gardenId === gardenId && c.state === "SUBMITTED")
      .sort((a, b) => new Date(b.evaluationDate!).getTime() - new Date(a.evaluationDate!).getTime());
    
    // Combine and deduplicate by ID, prioritizing backend data
    const all = [...backendScored, ...mockCompleted];
    const unique = Array.from(new Map(all.map(c => [c.id, c])).values());
    return unique.sort((a, b) => {
      const dateA = a.evaluationDate || a.consultantSubmissionDate || "";
      const dateB = b.evaluationDate || b.consultantSubmissionDate || "";
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [inspections, inspectionCycles]);

  /**
   * En son tamamlanmış cycle'ı döndürür (en yeni completed cycle)
   * @param gardenId - Bahçe ID'si
   * @returns En son completed cycle veya null
   */
  const getLatestCompletedCycleForGarden = useCallback((gardenId: number): InspectionCycle | null => {
    const completedCycles = getCompletedCyclesForGarden(gardenId);
    return completedCycles.length > 0 ? completedCycles[0] : null;
  }, [getCompletedCyclesForGarden]);

  /**
   * Bir önceki tamamlanmış cycle'ı döndürür (ikinci en yeni completed cycle)
   * @param gardenId - Bahçe ID'si
   * @returns Bir önceki completed cycle veya null (en az 2 completed cycle yoksa)
   */
  const getPreviousCompletedCycleForGarden = useCallback((gardenId: number): InspectionCycle | null => {
    const completedCycles = getCompletedCyclesForGarden(gardenId);
    return completedCycles.length >= 2 ? completedCycles[1] : null;
  }, [getCompletedCyclesForGarden]);

  /**
   * Get pending evaluation for a garden - DEPRECATED in single-layer flow.
   * No separate auditor evaluation step anymore. Returns null.
   */
  const getPendingEvaluationForGarden = useCallback((_gardenId: number) => {
    return undefined;
  }, []);

  /**
   * Pure lookup function - finds draft inspection for a garden
   * Does NOT create or update state - use this in render/useMemo
   */
  const findDraftForGarden = useCallback((gardenId: number): InspectionCycle | undefined => {
    // First, try to get from backend inspections
    // Filter by current user if we have their ID
    const backendDrafts = inspections
      .filter(i => {
        if (i.gardenId !== gardenId || i.status !== "DRAFT") return false;
        // If we have current user ID, only show their drafts
        if (currentUser?.id) {
          return i.createdById === currentUser.id;
        }
        // Otherwise show all drafts (for backward compatibility)
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const backendDraft = backendDrafts[0];
    if (backendDraft) {
      return {
        id: backendDraft.id,
        gardenId: backendDraft.gardenId,
        state: "DRAFT" as InspectionState,
        topics: (backendDraft.topics as TopicInspection[]) || [],
        criticalWarnings: [], // Critical warnings not yet in backend
      };
    }
    
    // Fallback to mock cycles
    return inspectionCycles.find(c => c.gardenId === gardenId && c.state === "DRAFT");
  }, [inspections, inspectionCycles, currentUser?.id]);

  /**
   * Legacy alias for backward compatibility
   * @deprecated Use findDraftForGarden instead - this is a pure lookup function
   */
  const getDraftForGarden = findDraftForGarden;

  // getOpenCriticalWarningsCount removed - use garden.openCriticalWarningCount from backend instead
  const getOpenCriticalWarningsCount = useCallback((gardenId: number) => {
    const garden = gardens.find(g => g.id === gardenId);
    return garden?.openCriticalWarningCount ?? 0;
  }, [gardens]);

  // getAllOpenCriticalWarnings removed - use GlobalWarningsModal with campus filter instead
  const getAllOpenCriticalWarnings = useCallback((campusId: string) => {
    // Mock critical warnings removed - use backend API (GlobalWarningsModal) instead
    return [];
  }, []);

  const addCompletedInspection = useCallback(() => {
    setInspectionCycles(prev => {
      const randomGardenId = getRandomGardenIdHelper(prev.length > 0 ? gardens : INITIAL_GARDENS);
      const daysAgo = Math.floor(Math.random() * 5);
      const newCycle = generateCompletedCycle(randomGardenId, daysAgo, calculateGardenScore);
      return [...prev, newCycle];
    });
  }, [gardens]);

  const addPendingEvaluation = useCallback(() => {
    // Mock data generation disabled - use backend API instead
    if (gardens.length === 0) {
      return;
    }
    setInspectionCycles(prev => {
      const randomGardenId = getRandomGardenIdHelper(gardens);
      const topics = INSPECTION_TOPICS.map(t => ({
        topicId: t.id,
        topicName: t.name,
        status: STATUS_OPTIONS[Math.floor(Math.random() * 3)] as TopicStatus,
        note: `${t.name}: ${getRandomNoteHelper()}`,
        photoUrl: Math.random() > 0.5 ? "/placeholder.svg" : undefined,
      }));
      
      const cycle: InspectionCycle = {
        id: `pending-${randomGardenId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        gardenId: randomGardenId,
        state: "SUBMITTED_FOR_REVIEW",
        consultantSubmissionDate: new Date().toISOString(),
        topics,
        criticalWarnings: [],
      };
      
      return [...prev, cycle];
    });
  }, [gardens]);

  const addCompletedEvaluation = useCallback(() => {
    // Mock data generation disabled - use backend API instead
    if (gardens.length === 0) {
      return;
    }
    setInspectionCycles(prev => {
      const randomGardenId = getRandomGardenIdHelper(gardens);
      const topics = INSPECTION_TOPICS.map(t => ({
        topicId: t.id,
        topicName: t.name,
        status: STATUS_OPTIONS[Math.floor(Math.random() * 3)] as TopicStatus,
        note: `${t.name}: ${getRandomNoteHelper()}`,
        photoUrl: Math.random() > 0.3 ? "/placeholder.svg" : undefined,
        score: Math.floor(Math.random() * 35) + 55,
      }));
      
      const cycle: InspectionCycle = {
        id: `eval-${randomGardenId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        gardenId: randomGardenId,
        state: "SUBMITTED",
        consultantSubmissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        evaluationDate: new Date().toISOString(),
        topics,
        gardenScore: calculateGardenScore(topics),
        criticalWarnings: [],
      };
      
      return [...prev, cycle];
    });
  }, [gardens]);

  // addTestCriticalWarnings removed - critical warnings now come from backend API
  // Use the backend API endpoints to create/update warnings instead
  const addTestCriticalWarnings = useCallback(() => {
    // Mock critical warnings generation disabled - use backend API instead
  }, []);

  // Generate yearly test data - 24 evaluations per campus (2 per month)
  const addYearlyTestData = useCallback((year: number) => {
    setInspectionCycles(prev => {
      const newCycles: InspectionCycle[] = [];
      
      // Group gardens by campus
      const campusGroups = {
        belek: INITIAL_GARDENS.filter(g => g.campusId === "belek"),
        candir: INITIAL_GARDENS.filter(g => g.campusId === "candir"),
        manavgat: INITIAL_GARDENS.filter(g => g.campusId === "manavgat"),
      };
      
      // For each campus, create 24 evaluations (2 per month)
      Object.entries(campusGroups).forEach(([campusId, campusGardens]) => {
        for (let month = 0; month < 12; month++) {
          // 2 evaluations per month
          for (let evalNum = 0; evalNum < 2; evalNum++) {
            // Pick a random garden from this campus
            const garden = campusGardens[Math.floor(Math.random() * campusGardens.length)];
            
            // Create a date in the middle of the month
            const day = evalNum === 0 ? 10 : 25;
            const evalDate = new Date(year, month, day);
            
            const topics = INSPECTION_TOPICS.map(t => ({
              topicId: t.id,
              topicName: t.name,
              status: STATUS_OPTIONS[Math.floor(Math.random() * 3)] as TopicStatus,
              note: `${t.name}: ${getRandomNoteHelper()}`,
              photoUrl: Math.random() > 0.5 ? "/placeholder.svg" : undefined,
              score: Math.floor(Math.random() * 35) + 55, // 55-90 range
            }));
            
            const cycle: InspectionCycle = {
              id: `yearly-${campusId}-${year}-${month}-${evalNum}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              gardenId: garden.id,
              state: "SUBMITTED",
              consultantSubmissionDate: new Date(evalDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              evaluationDate: evalDate.toISOString(),
              topics,
              gardenScore: calculateGardenScore(topics),
              criticalWarnings: [],
            };
            
            newCycles.push(cycle);
          }
        }
      });
      
      return [...prev, ...newCycles];
    });
  }, []);

  /**
   * Backend API'den başlangıç verilerini yükle
   * 
   * Bu fonksiyon şu verileri backend'den çeker:
   * - Kampüsler (campuses) - şimdilik kullanılmıyor ama gelecekte kullanılabilir
   * - Bahçeler (gardens) - backend'den çekilip state'e set edilir
   * 
   * Not: Inspection cycles ve critical warnings şimdilik backend'de yok,
   * bu yüzden sadece kampüs ve bahçe verileri yükleniyor.
   */
  const loadInitialDataFromApi = useCallback(async (): Promise<void> => {
    // Defensive check: do not make API calls if there is no auth token
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }

    try {
      setIsInitialDataLoading(true);

      // Backend'den kampüs ve bahçe verilerini paralel olarak çek
      const [campusesFromApi, gardensFromApi] = await Promise.all([
        apiFetch<Array<{
          id: string;
          name: string;
          weight: number;
          createdAt: string;
          updatedAt: string;
          openCriticalWarningCount?: number;
        }>>("/campuses"),
        apiFetch<Array<{
          id: number;
          name: string;
          status: "ACTIVE" | "INACTIVE";
          campusId: string;
          campus: {
            id: string;
            name: string;
            weight: number;
          };
          openCriticalWarningCount?: number;
        }>>("/gardens"),
      ]);

      // Backend'den gelen bahçe verilerini frontend Garden tipine map et
      const mappedGardens: Garden[] = gardensFromApi.map(g => ({
        id: g.id,
        name: g.name,
        campusId: g.campusId,
        campusName: g.campus.name,
        status: g.status,
        openCriticalWarningCount: Number(g.openCriticalWarningCount ?? 0),
      }));

      // State'leri güncelle
      setGardens(mappedGardens);
      setIsUsingMockBackend(false);

      // Kampüs verileri şimdilik kullanılmıyor ama gelecekte kullanılabilir
      // Örn: Campus listesi için veya campus weight'leri için

      // TODO: Inspection cycles ve critical warnings backend'de hazır olduğunda:
      // const inspectionCyclesFromApi = await apiFetch<InspectionCycle[]>("/inspection-cycles");
      // const warningsFromApi = await apiFetch<CriticalWarning[]>("/critical-warnings");
      // setInspectionCycles(inspectionCyclesFromApi);
      // 
      // Not: Critical warnings muhtemelen inspection cycles içinde gelecek,
      // ayrı bir endpoint gerekebilir veya gerekmeyebilir.
    } catch (error) {
      console.error("loadInitialDataFromApi error", error);
      // Hata durumunda gardens state boş kalır ([] ile başlatıldı)
      // İleride kullanıcıya toast ile gösterebiliriz:
      // toast({ title: "Hata", description: "Veriler yüklenemedi", variant: "destructive" });
    } finally {
      setIsInitialDataLoading(false);
    }
  }, []);

  /**
   * Sadece gardens verisini backend'den yeniden yükle.
   * Kritik uyarı eklendi/kapatıldığında openCriticalWarningCount güncellemesi için kullanılır.
   */
  const loadGardens = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const gardensFromApi = await apiFetch<Array<{
        id: number;
        name: string;
        status: "ACTIVE" | "INACTIVE";
        campusId: string;
        campus: {
          id: string;
          name: string;
          weight: number;
        };
        openCriticalWarningCount?: number;
      }>>("/gardens");
      const mappedGardens: Garden[] = gardensFromApi.map(g => ({
        id: g.id,
        name: g.name,
        campusId: g.campusId,
        campusName: g.campus.name,
        status: g.status,
        openCriticalWarningCount: Number(g.openCriticalWarningCount ?? 0),
      }));
      setGardens(mappedGardens);
    } catch (error) {
      console.error("loadGardens error", error);
    }
  }, []);

  /**
   * Tüm inspections'ları backend'den yükle
   */
  const loadAllInspections = useCallback(async (): Promise<void> => {
    try {
      const allInspections = await apiFetch<BackendInspection[]>("/inspections");
      setInspections(allInspections);
    } catch (error) {
      console.error("Failed to load all inspections", error);
      // Hata durumunda mevcut state korunur
    }
  }, []);

  /**
   * Belirli bir bahçe için backend'den inspections yükle
   * @param gardenId - Bahçe ID'si
   */
  const loadInspectionsForGarden = useCallback(async (gardenId: number): Promise<void> => {
    try {
      const gardenInspections = await apiFetch<BackendInspection[]>(
        `/inspections?gardenId=${gardenId}`
      );

      // Mevcut inspections listesini güncelle (bu bahçe için olanları değiştir, diğerlerini koru)
      setInspections(prev => {
        const otherGardensInspections = prev.filter(i => i.gardenId !== gardenId);
        return [...otherGardensInspections, ...gardenInspections];
      });
    } catch (error) {
      console.error(`loadInspectionsForGarden error for garden ${gardenId}:`, error);
      // Hata durumunda mevcut state korunur
    }
  }, []);

  /**
   * Yeni inspection oluştur
   * @param gardenId - Bahçe ID'si
   * @param options - Optional status and topics
   * @returns Oluşturulan inspection
   */
  const createInspection = useCallback(async (
    gardenId: number,
    options?: { status?: BackendInspection["status"]; topics?: any; score?: number }
  ): Promise<BackendInspection> => {
    const payload: any = { gardenId };
    if (options?.status) payload.status = options.status;
    if (options?.topics) payload.topics = options.topics;
    if (options?.score !== undefined) payload.score = options.score;

    const newInspection = await apiFetch<BackendInspection>("/inspections", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // State'e ekle
    setInspections(prev => [...prev, newInspection]);

    return newInspection;
  }, []);

  /**
   * Inspection güncelle (status, score, ve/veya topics)
   * @param inspectionId - Inspection ID'si
   * @param data - Güncellenecek alanlar
   * @returns Güncellenmiş inspection
   */
  const updateInspection = useCallback(async (
    inspectionId: string,
    data: { 
      status?: BackendInspection["status"]; 
      score?: number;
      topics?: any; // JSON array of topic objects
    }
  ): Promise<BackendInspection> => {
    const updatedInspection = await apiFetch<BackendInspection>(`/inspections/${inspectionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    // State'i güncelle
    setInspections(prev =>
      prev.map(i => (i.id === inspectionId ? updatedInspection : i))
    );

    return updatedInspection;
  }, []);

  /**
   * Inspection sil (backend'den kaldır)
   * @param inspectionId - Inspection ID'si
   */
  const deleteInspection = useCallback(async (inspectionId: string): Promise<void> => {
    await apiFetch<void>(`/inspections/${inspectionId}`, {
      method: "DELETE",
    });

    // State'den kaldır
    setInspections(prev => prev.filter(i => i.id !== inspectionId));
  }, []);

  /**
   * Backend inspections içinden SUBMITTED olanları gardenId bazında grupla
   * Her gardenId için score listesini createdAt ascending (chronological) sıralı döndür
   * Chart'lar için eski skorlar önce, yeni skorlar sonra gösterilmeli
   */
  const getBackendScoresByGarden = useCallback((): Map<number, number[]> => {
    const scoresMap = new Map<number, number[]>();
    
    inspections
      .filter(i => i.status === "SUBMITTED" && typeof i.score === "number")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach(inspection => {
        const arr = scoresMap.get(inspection.gardenId) ?? [];
        arr.push(inspection.score!);
        scoresMap.set(inspection.gardenId, arr);
      });
    
    return scoresMap;
  }, [inspections]);

  /**
   * Belirli bir bahçe için en son SUBMITTED inspection'ın score'unu döndür
   * @param gardenId - Bahçe ID'si
   * @returns Score değeri veya null
   */
  const getLatestBackendScoreForGarden = useCallback((gardenId: number): number | null => {
    const latestScored = inspections
      .filter(i => i.gardenId === gardenId && i.status === "SUBMITTED" && i.score !== null && i.score !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    return latestScored?.score ?? null;
  }, [inspections]);

  /**
   * Belirli bir bahçe için en son SUBMITTED inspection'ın score'unu döndür (chronological order)
   * Uses ascending sort and returns the last (newest) score
   * @param gardenId - Bahçe ID'si
   * @returns Score değeri veya null
   */
  const getLatestScoreForGarden = useCallback((gardenId: number): number | null => {
    const scored = inspections
      .filter(
        (i) =>
          i.gardenId === gardenId &&
          i.status === "SUBMITTED" &&
          typeof i.score === "number"
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    if (scored.length === 0) return null;
    return scored[scored.length - 1].score ?? null;
  }, [inspections]);

  /**
   * Load all prescriptions for a campus
   */
  const loadPrescriptionsByCampus = useCallback(async (campusId: string): Promise<void> => {
    try {
      const list = await apiListPrescriptionsByCampus(campusId);
      setPrescriptions(list);
    } catch (error) {
      console.error(`Failed to load prescriptions for campus ${campusId}:`, error);
      setPrescriptions([]);
    }
  }, []);

  /**
   * Load latest approved prescription for a campus.
   * Missing prescription (404/empty) is normal — set null, no error. Only log real network/5xx.
   */
  const loadLatestPrescriptionForCampus = useCallback(async (campusId: string): Promise<void> => {
    try {
      const raw = await apiGetLatestPrescriptionByCampus(campusId);
      if (raw == null || typeof raw.id !== 'number') {
        setLatestPrescriptionByCampus(prev => ({ ...prev, [campusId]: null }));
        return;
      }
      // Normalize API response to Prescription type
      // Backend may return createdat/updatedat (lowercase) or createdAt/updatedAt (camelCase)
      const normalized: Prescription = {
        id: raw.id,
        campusId: raw.campusId,
        createdById: raw.createdById,
        ventilation: raw.ventilation,
        irrigation: raw.irrigation,
        fertilization: raw.fertilization,
        status: raw.status,
        approvedById: raw.approvedById,
        // Map date fields - try lowercase first (Neon DB), then camelCase
        approvedAt: (raw as any).approvedAt ?? (raw as any).approvedat ?? (raw as any).approved_at ?? null,
        createdAt: (raw as any).createdat ?? (raw as any).createdAt ?? (raw as any).created_at ?? null,
        updatedAt: (raw as any).updatedat ?? (raw as any).updatedAt ?? (raw as any).updated_at ?? null,
        createdBy: raw.createdBy,
        approvedBy: raw.approvedBy,
        campus: raw.campus,
      };
      setLatestPrescriptionByCampus(prev => ({ ...prev, [campusId]: normalized }));
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 404) {
        setLatestPrescriptionByCampus(prev => ({ ...prev, [campusId]: null }));
      } else {
        if (import.meta.env.DEV) {
          console.debug(`Load latest prescription for campus ${campusId}:`, error);
        }
        // Diğer hatalarda state korunur (arka plandan dönünce kaybolmasın)
      }
    }
  }, []);

  /**
   * Load pending prescription for a specific campus
   */
  const loadPendingPrescriptionForCampus = useCallback(async (campusId: string): Promise<void> => {
    try {
      const { getPendingPrescriptionByCampus } = await import('@/lib/prescriptions');
      const pending = await getPendingPrescriptionByCampus(campusId);
      setPendingPrescriptionByCampus(prev => ({ ...prev, [campusId]: pending }));
    } catch (error) {
      console.error(`Failed to load pending prescription for campus ${campusId}:`, error);
      setPendingPrescriptionByCampus(prev => ({ ...prev, [campusId]: null }));
    }
  }, []);

  /**
   * Load pending prescriptions
   */
  const loadPendingPrescriptions = useCallback(async (): Promise<void> => {
    try {
      const { listPendingReviewPrescriptions } = await import('@/lib/prescriptions');
      const allPending = await listPendingReviewPrescriptions();
      setPendingPrescriptions(allPending);
      // Also update campus-specific pending state
      const campusMap: Record<string, Prescription | null> = {};
      allPending.forEach(p => {
        if (!campusMap[p.campusId]) {
          campusMap[p.campusId] = p;
        }
      });
      setPendingPrescriptionByCampus(prev => ({ ...prev, ...campusMap }));
    } catch (error) {
      console.error('Failed to load pending prescriptions:', error);
      setPendingPrescriptions([]);
    }
  }, []);

  /**
   * Create prescription (directly as PENDING, no draft)
   */
  const createPrescription = useCallback(async (
    campusId: string,
    data: { ventilation?: string; irrigation?: string; fertilization?: string }
  ): Promise<Prescription> => {
    // Backend creates prescription directly as PENDING
    const prescription = await apiCreatePrescription({
      campusId,
      ventilation: data.ventilation,
      irrigation: data.irrigation,
      fertilization: data.fertilization,
    });

    // Reload prescriptions and latest for this campus
    await loadPrescriptionsByCampus(campusId);
    await loadLatestPrescriptionForCampus(campusId);
    await loadPendingPrescriptionForCampus(campusId);
    await loadPendingPrescriptions();

    return prescription;
  }, [loadPrescriptionsByCampus, loadLatestPrescriptionForCampus, loadPendingPrescriptionForCampus, loadPendingPrescriptions]);

  /**
   * Update prescription
   */
  const updatePrescription = useCallback(async (
    id: number,
    data: { ventilation?: string; irrigation?: string; fertilization?: string }
  ): Promise<Prescription> => {
    const prescription = await apiUpdatePrescription(id, data);

    // Reload prescriptions and latest for this campus
    if (prescription.campusId) {
      await loadPrescriptionsByCampus(prescription.campusId);
      await loadLatestPrescriptionForCampus(prescription.campusId);
      await loadPendingPrescriptionForCampus(prescription.campusId);
    }

    return prescription;
  }, [loadPrescriptionsByCampus, loadLatestPrescriptionForCampus, loadPendingPrescriptionForCampus]);

  /**
   * Submit prescription for review
   */
  const submitPrescription = useCallback(async (id: number): Promise<Prescription> => {
    const prescription = await apiSubmitPrescriptionForReview(id);

    // Reload prescriptions and latest for this campus
    if (prescription.campusId) {
      await loadPrescriptionsByCampus(prescription.campusId);
      await loadLatestPrescriptionForCampus(prescription.campusId);
      await loadPendingPrescriptionForCampus(prescription.campusId);
      await loadPendingPrescriptions();
    }

    return prescription;
  }, [loadPrescriptionsByCampus, loadLatestPrescriptionForCampus, loadPendingPrescriptionForCampus, loadPendingPrescriptions]);

  /**
   * Review prescription (approve or delete)
   */
  const reviewPrescription = useCallback(async (
    id: number,
    decision: 'approved' | 'rejected'
  ): Promise<Prescription | null> => {
    // Get prescription first to know campusId (before deletion)
    const { getPrescription } = await import('@/lib/prescriptions');
    let campusId: string;
    try {
      const prescription = await getPrescription(id);
      campusId = prescription.campusId;
    } catch (error) {
      console.error('Failed to get prescription before review:', error);

      // Fallback: load pending prescriptions directly from the API
      const { listPendingReviewPrescriptions } = await import('@/lib/prescriptions');
      const allPending = await listPendingReviewPrescriptions();

      const found = allPending.find(p => p.id === id);
      if (!found) {
        throw new Error('Prescription not found');
      }

      campusId = found.campusId;
    }

    const result = await apiReviewPrescription(id, { status: decision });

    // If rejected/deleted, backend returns { message: '...', deleted: true }
    // TypeScript might complain, so we check the structure
    if (result && typeof result === 'object' && 'deleted' in (result as any)) {
      // Prescription was deleted
      await loadPrescriptionsByCampus(campusId);
      await loadLatestPrescriptionForCampus(campusId);
      await loadPendingPrescriptionForCampus(campusId);
      await loadPendingPrescriptions();
      return null;
    }

    // If approved, result is the prescription
    const prescription = result as Prescription;
    if (prescription && prescription.campusId) {
      await loadPrescriptionsByCampus(prescription.campusId);
      await loadLatestPrescriptionForCampus(prescription.campusId);
      await loadPendingPrescriptionForCampus(prescription.campusId);
      await loadPendingPrescriptions();
    }

    return prescription;
  }, [loadPrescriptionsByCampus, loadLatestPrescriptionForCampus, loadPendingPrescriptionForCampus, loadPendingPrescriptions]);

  /**
   * Delete prescription
   */
  const deletePrescription = useCallback(async (id: number): Promise<void> => {
    // Get prescription first to know campusId
    const { getPrescription } = await import('@/lib/prescriptions');
    let campusId: string;
    try {
      const prescription = await getPrescription(id);
      campusId = prescription.campusId;
    } catch (error) {
      console.error('Failed to get prescription before delete:', error);

      // Fallback: load pending prescriptions directly from the API
      const { listPendingReviewPrescriptions } = await import('@/lib/prescriptions');
      const allPending = await listPendingReviewPrescriptions();

      const found = allPending.find(p => p.id === id);
      if (!found) {
        throw new Error('Prescription not found');
      }

      campusId = found.campusId;
    }

    await apiDeletePrescription(id);

    // Reload prescriptions and latest for this campus
    await loadPrescriptionsByCampus(campusId);
    await loadLatestPrescriptionForCampus(campusId);
    await loadPendingPrescriptionForCampus(campusId);
    await loadPendingPrescriptions();
  }, [loadPrescriptionsByCampus, loadLatestPrescriptionForCampus, loadPendingPrescriptionForCampus, loadPendingPrescriptions]);

  /**
   * Create or update prescription (legacy helper)
   */
  const createOrUpdatePrescription = useCallback(async (
    campusId: string,
    data: { ventilation?: string; irrigation?: string; fertilization?: string; submit?: boolean }
  ): Promise<Prescription> => {
    const prescription = await apiCreatePrescription({
      campusId,
      ventilation: data.ventilation,
      irrigation: data.irrigation,
      fertilization: data.fertilization,
    });

    // If submit is true, submit for review
    if (data.submit) {
      await apiSubmitPrescriptionForReview(prescription.id);
    }

    // Reload prescriptions and latest for this campus
    await loadPrescriptionsByCampus(campusId);
    await loadLatestPrescriptionForCampus(campusId);
    await loadPendingPrescriptionForCampus(campusId);

    return prescription;
  }, [loadPrescriptionsByCampus, loadLatestPrescriptionForCampus, loadPendingPrescriptionForCampus]);

  // Restore user from token on page refresh
  useEffect(() => {
    const restoreUserFromToken = async () => {
      // If we have a token but no currentUser, try to restore user via /me endpoint
      if (authToken && !currentUser) {
        try {
          const response = await apiFetch<BackendAuthResponse["user"]>("/auth/me");
          
          // Map backend user response to UserCredentials
          const mappedUser: UserCredentials = {
            id: response.id,
            username: response.username,
            password: "", // Password is never stored
            role: response.role as UserRole,
            displayName: response.displayName,
          };
          
          setCurrentUser(mappedUser);
          setActiveRole(mappedUser.role);
          setIsUsingMockBackend(false);
          
          // Load data from API after restoring user
          await loadInitialDataFromApi();
        } catch (error) {
          // Token is invalid or expired, clear it
          console.error("Failed to restore user from token:", error);
          setAuthToken(null);
          setCurrentUser(null);
          setIsUsingMockBackend(true);
        }
      }
    };
    
    restoreUserFromToken();
  }, [authToken, currentUser, loadInitialDataFromApi]);

  // Load all inspections when user is authenticated
  useEffect(() => {
    if (authToken && currentUser) {
      loadAllInspections();
    }
  }, [authToken, currentUser, loadAllInspections]);

  // Load initial data (campuses, gardens) on first render if authenticated
  // If authenticated, data is loaded after user restoration in the restoreUserFromToken effect
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }
    
    if (!isInitialDataLoading && gardens.length === 0) {
      // Only load if we have a token and haven't loaded yet
      // Authenticated users load data after token restoration
      loadInitialDataFromApi();
    }
  }, []); // Empty deps - only run once on mount

  // Refresh tedbiri: kampüsler (gardens) yüklendikten sonra bir defaya mahsus güncel reçeteleri toplu yükle
  useEffect(() => {
    if (!currentUser) return;
    if (!gardens || gardens.length === 0) return;
    if (initialPrescriptionsLoaded) return;

    const run = async () => {
      const campusIds = [...new Set(gardens.map((g) => g.campusId))];
      await Promise.allSettled(
        campusIds.map((campusId) => loadLatestPrescriptionForCampus(campusId))
      );
      setInitialPrescriptionsLoaded(true);
    };

    run();
  }, [currentUser, gardens, initialPrescriptionsLoaded, loadLatestPrescriptionForCampus]);

  // Arka plandan dönünce (visibility/pageshow/focus) güncel reçeteleri otomatik yenile
  useEffect(() => {
    if (!currentUser) return;

    const refreshLatest = async () => {
      try {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/hasat")) return;
        if (!gardens || gardens.length === 0) return;
        await Promise.allSettled(
          gardens.map((g) => loadLatestPrescriptionForCampus(g.campusId))
        );
      } catch (e) {
        console.error("refreshLatest prescriptions failed:", e);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshLatest();
      }
    };

    const onPageShow = () => {
      refreshLatest();
    };

    const onFocus = () => {
      refreshLatest();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUser, gardens, loadLatestPrescriptionForCampus]);

  // Logout veya kullanıcı temizlendiğinde initial flag sıfırla
  useEffect(() => {
    if (!currentUser) {
      setInitialPrescriptionsLoaded(false);
    }
  }, [currentUser]);

  // Memoize context value to prevent unnecessary re-renders and ensure hook stability
  const contextValue = useMemo(() => ({
    activeRole,
    setActiveRole,
    inspectionCycles,
    setInspectionCycles,
    gardens,
    setGardens,
    selectedGardenId,
    setSelectedGardenId,
    viewingInspectionId,
    setViewingInspectionId,
    // Legacy compatibility
    selectedInspectionId,
    setSelectedInspectionId,
    addCompletedInspection,
    addPendingEvaluation,
    addTestCriticalWarnings,
    addCompletedEvaluation,
    addYearlyTestData,
    getCompletedCyclesForGarden,
    getLatestCompletedCycleForGarden,
    getPreviousCompletedCycleForGarden,
    getPendingEvaluationForGarden,
    getDraftForGarden,
    findDraftForGarden,
    getOpenCriticalWarningsCount,
    getAllOpenCriticalWarnings,
    // Garden management
    addGarden,
    toggleGardenStatus,
    getActiveGardens,
    // Backend API entegrasyonu için merkezi veri yükleme
    isInitialDataLoading,
    loadInitialDataFromApi,
    loadGardens,
    // Backend Inspection API entegrasyonu
    inspections,
    loadInspectionsForGarden,
    loadAllInspections,
    createInspection,
    updateInspection,
    deleteInspection,
    // Backend score helper fonksiyonları
    getBackendScoresByGarden,
    getLatestBackendScoreForGarden,
    getLatestScoreForGarden,
    // Prescriptions state and functions
    prescriptions,
    setPrescriptions,
    latestPrescriptionByCampus,
    pendingPrescriptionByCampus,
    pendingPrescriptions,
    loadPrescriptionsByCampus,
    loadLatestPrescriptionForCampus,
    loadPendingPrescriptionForCampus,
    loadPendingPrescriptions,
    createPrescription,
    updatePrescription,
    submitPrescription,
    reviewPrescription,
    deletePrescription,
    createOrUpdatePrescription,
    // Legacy aliases for backward compatibility
    listPrescriptionsByCampus: loadPrescriptionsByCampus,
    // Auth token ve current user yönetimi
    authToken,
    setAuthToken,
    currentUser,
    setCurrentUser,
    // Mock backend tracking
    isUsingMockBackend,
    setIsUsingMockBackend,
    // Backend/DB bağlantı koptu popup
    backendConnectionLost,
    markBackendDown,
    clearBackendDown,
    logout,
  }), [
    activeRole,
    inspectionCycles,
    gardens,
    selectedGardenId,
    viewingInspectionId,
    inspections,
    isInitialDataLoading,
    prescriptions,
    latestPrescriptionByCampus,
    authToken,
    currentUser,
    isUsingMockBackend,
    getCompletedCyclesForGarden,
    getLatestCompletedCycleForGarden,
    getPreviousCompletedCycleForGarden,
    getPendingEvaluationForGarden,
    getDraftForGarden,
    findDraftForGarden,
    getOpenCriticalWarningsCount,
    getAllOpenCriticalWarnings,
    addCompletedInspection,
    addPendingEvaluation,
    addTestCriticalWarnings,
    addCompletedEvaluation,
    addYearlyTestData,
    addGarden,
    toggleGardenStatus,
    getActiveGardens,
    loadInitialDataFromApi,
    loadGardens,
    loadInspectionsForGarden,
    loadAllInspections,
    createInspection,
    updateInspection,
    deleteInspection,
    getBackendScoresByGarden,
    getLatestBackendScoreForGarden,
    getLatestScoreForGarden,
    loadPrescriptionsByCampus,
    loadLatestPrescriptionForCampus,
    loadPendingPrescriptionForCampus,
    loadPendingPrescriptions,
    createPrescription,
    updatePrescription,
    submitPrescription,
    reviewPrescription,
    deletePrescription,
    createOrUpdatePrescription,
    backendConnectionLost,
    markBackendDown,
    clearBackendDown,
    logout,
  ]);

  // Return provider - no conditionals before this
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * OUTER provider component - minimal, handles auth/loading if needed
 * Currently just a pass-through, but structured to allow auth/loading logic without affecting hook order
 */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  // OUTER component has no hooks (or minimal auth hooks if needed in future)
  // Just render the internal provider
  return <AppProviderInternal>{children}</AppProviderInternal>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
