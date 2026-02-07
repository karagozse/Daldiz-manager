/**
 * Mock Data - Backend entegrasyonu öncesi test verileri
 * Bu dosya, AppContext.tsx'ten izole edilmiş sabit mock verileri içerir.
 * Backend hazır olduğunda bu veriler API'den gelecek ve bu dosya kullanımdan kaldırılabilir.
 */

import type { UserCredentials, UserRole } from "./AppContext";
import type { Garden, InspectionCycle, CriticalWarning, TopicStatus } from "./AppContext";

// ============================================================================
// KULLANICI VERİLERİ
// ============================================================================

/**
 * Demo kullanıcılar - Production'da backend authentication kullanılacak
 * Not: Bu demo credentials sadece test amaçlıdır. Production ortamında kullanılmamalıdır.
 */
export const VALID_USERS: UserCredentials[] = [
  // Super Admin - highest privilege
  { username: "sysadmin", password: "Dt@2024!Sys", role: "SUPER_ADMIN", displayName: "Sistem Yöneticisi" },
  
  // Admin/Manager accounts with unique passwords
  { username: "yonetici", password: "Yn@Dost2024", role: "ADMIN", displayName: "Yönetici" },
  
  // Consultant - can start inspections
  { username: "ziraat.danisman", password: "Zd@Tarim2024", role: "CONSULTANT", displayName: "Ziraat Danışmanı" },
  
  // Lead Auditor - can start evaluations
  { username: "bas.denetci", password: "Bd@Audit2024", role: "LEAD_AUDITOR", displayName: "Baş Denetçi" },
];

// ============================================================================
// BAHÇE VERİLERİ
// ============================================================================

/**
 * Başlangıç bahçe verileri
 * Belek: 12 gardens, Çandır: 3 gardens, Manavgat: 5 gardens
 */
export const INITIAL_GARDENS: Garden[] = [
  // Belek - 12 gardens
  { id: 1, name: "Belek-1", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 2, name: "Belek-2", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 3, name: "Belek-3", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 4, name: "Belek-4", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 5, name: "Belek-5", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 6, name: "Belek-6", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 7, name: "Belek-7", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 8, name: "Belek-8", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 9, name: "Belek-9", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 10, name: "Belek-10", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 11, name: "Belek-11", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  { id: 12, name: "Belek-12", campusId: "belek", campusName: "Belek Kampüsü", status: "ACTIVE" },
  // Çandır - 3 gardens
  { id: 13, name: "Çandır-1", campusId: "candir", campusName: "Çandır Kampüsü", status: "ACTIVE" },
  { id: 14, name: "Çandır-2", campusId: "candir", campusName: "Çandır Kampüsü", status: "ACTIVE" },
  { id: 15, name: "Çandır-3", campusId: "candir", campusName: "Çandır Kampüsü", status: "ACTIVE" },
  // Manavgat - 5 gardens
  { id: 16, name: "Manavgat-1", campusId: "manavgat", campusName: "Manavgat Kampüsü", status: "ACTIVE" },
  { id: 17, name: "Manavgat-2", campusId: "manavgat", campusName: "Manavgat Kampüsü", status: "ACTIVE" },
  { id: 18, name: "Manavgat-3", campusId: "manavgat", campusName: "Manavgat Kampüsü", status: "ACTIVE" },
  { id: 19, name: "Manavgat-4", campusId: "manavgat", campusName: "Manavgat Kampüsü", status: "ACTIVE" },
  { id: 20, name: "Manavgat-5", campusId: "manavgat", campusName: "Manavgat Kampüsü", status: "ACTIVE" },
];

// ============================================================================
// DENETİM KONULARI VE AĞIRLIKLAR
// ============================================================================

/**
 * Denetim konuları ve ağırlıkları (toplam %100 olmalı)
 * Fide Ayarı: 25%, Sulama: 15%, Havalandırma: 15%, Gübreleme: 15%,
 * Budama/Bağlama: 10%, Bitki Hastalıkları: 10%, Yetiştirme Ortamı: 10%
 */
export const INSPECTION_TOPICS = [
  { id: 1, name: "Fide Ayarı", weight: 0.25 },
  { id: 2, name: "Sulama", weight: 0.15 },
  { id: 3, name: "Havalandırma & İklim", weight: 0.15 },
  { id: 4, name: "Gübreleme", weight: 0.15 },
  { id: 5, name: "Budama/Bağlama", weight: 0.10 },
  { id: 6, name: "Bitki Hastalıkları", weight: 0.10 },
  { id: 7, name: "Yetiştirme Ortamı", weight: 0.10 },
];

/**
 * Kampüs ağırlıkları - şirket geneli skor hesaplaması için (toplam %100 olmalı)
 * Belek: 60%, Çandır: 20%, Manavgat: 20%
 */
export const CAMPUS_WEIGHTS: Record<string, number> = {
  belek: 0.60,
  candir: 0.20,
  manavgat: 0.20,
};

// ============================================================================
// MOCK VERİ ÜRETİMİ İÇİN HELPER VERİLER
// ============================================================================

/**
 * Durum seçenekleri (not_started hariç, sadece değerlendirme yapılmış olanlar)
 */
export const STATUS_OPTIONS: TopicStatus[] = ["uygun", "kismen_uygun", "uygun_degil"];

/**
 * Not şablonları - rastgele not üretimi için
 */
export const NOTE_TEMPLATES = [
  "Genel durumu iyi, dikkat edilmeli.",
  "Kontrolde sorun tespit edilmedi.",
  "İyileştirme önerildi, takip edilecek.",
  "Stabil durumda, devam edilmeli.",
  "Hafif sorunlar var, müdahale edildi.",
  "Optimal seviyede, takip yeterli.",
];

/**
 * Kritik uyarı şablonları - test uyarıları üretimi için
 */
export const WARNING_TEMPLATES = [
  { topicId: 6, title: "Yaprak Yanıklığı", description: "Yapraklarda yanıklık tespit edildi. Müdahale gerekli." },
  { topicId: 6, title: "Küf Oluşumu", description: "Bitkilerde küf belirtileri görüldü. İlaçlama yapılmalı." },
  { topicId: 2, title: "Sulama Arızası", description: "Damlama sisteminde arıza var. Tamir edilmeli." },
  { topicId: 2, title: "Su Yetersizliği", description: "Sulama yetersiz, bitkiler stres altında." },
  { topicId: 3, title: "Sıcaklık Sorunu", description: "Sera sıcaklığı optimal aralığın dışında." },
  { topicId: 3, title: "Havalandırma Yetersiz", description: "Nem kontrolü için havalandırma artırılmalı." },
  { topicId: 4, title: "Gübre Eksikliği", description: "Bitkilerde besin eksikliği belirtileri var." },
  { topicId: 5, title: "Budama Gerekli", description: "Aşırı büyüme var, acil budama gerekli." },
  { topicId: 7, title: "Toprak pH Sorunu", description: "Toprak pH değeri optimal aralığın dışında." },
  { topicId: 1, title: "Fide Gelişim Sorunu", description: "Fideler beklenen gelişimi göstermiyor." },
];

/**
 * Kapatma notu şablonları - kapatılmış uyarılar için
 */
export const CLOSURE_NOTE_TEMPLATES = [
  "Sorun giderildi, tüm bitkiler sağlıklı durumda.",
  "İlaçlama yapıldı, hastalık kontrol altına alındı.",
  "Sulama sistemi tamiri tamamlandı, düzenli çalışıyor.",
  "Gübre takviyesi yapıldı, bitkiler toparlandı.",
  "Budama işlemi tamamlandı, gelişim normal seyrinde.",
  "Sıcaklık ayarları düzeltildi, iklim normalize edildi.",
  "Toprak pH'ı düzeltildi, optimal seviyeye getirildi.",
  "Havalandırma sistemi iyileştirildi, nem kontrol altında.",
  "Fide bakımı yapıldı, gelişim normale döndü.",
  "Acil müdahale yapıldı, kriz önlendi.",
];

// ============================================================================
// MOCK DENETİM DÖNGÜLERİ ÜRETİMİ
// ============================================================================

/**
 * Rastgele bahçe ID'si seç
 */
const getRandomGardenId = (gardens: Garden[]): number => {
  return gardens[Math.floor(Math.random() * gardens.length)].id;
};

/**
 * Rastgele not seç
 */
const getRandomNote = (): string => {
  return NOTE_TEMPLATES[Math.floor(Math.random() * NOTE_TEMPLATES.length)];
};

/**
 * Rastgele uyarı şablonu seç
 */
const getRandomWarning = () => {
  return WARNING_TEMPLATES[Math.floor(Math.random() * WARNING_TEMPLATES.length)];
};

/**
 * Tamamlanmış denetim döngüsü üret
 * @param gardenId - Bahçe ID'si
 * @param daysAgo - Kaç gün önce tamamlandığı
 * @param calculateGardenScore - Bahçe skorunu hesaplayan fonksiyon
 */
export const generateCompletedCycle = (
  gardenId: number,
  daysAgo: number,
  calculateGardenScore: (topics: any[]) => number
): InspectionCycle => {
  const topics = INSPECTION_TOPICS.map(t => ({
    topicId: t.id,
    topicName: t.name,
    status: STATUS_OPTIONS[Math.floor(Math.random() * 3)] as TopicStatus,
    note: `${t.name}: ${getRandomNote()}`,
    photoUrl: Math.random() > 0.5 ? "/placeholder.svg" : undefined,
    score: Math.floor(Math.random() * 40) + 50, // 50-90 range
  }));
  
  const cycle: InspectionCycle = {
    id: `cycle-${gardenId}-${daysAgo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    gardenId,
    state: "SUBMITTED",
    consultantSubmissionDate: new Date(Date.now() - (daysAgo + 2) * 24 * 60 * 60 * 1000).toISOString(),
    evaluationDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    topics,
    gardenScore: calculateGardenScore(topics),
    criticalWarnings: [],
  };
  
  return cycle;
};

/**
 * Başlangıç denetim döngülerini ve kritik uyarıları üret
 * @param gardens - Bahçe listesi
 * @param calculateGardenScore - Bahçe skorunu hesaplayan fonksiyon
 */
export const generateInitialCycles = (
  gardens: Garden[],
  calculateGardenScore: (topics: any[]) => number
): InspectionCycle[] => {
  const cycles: InspectionCycle[] = [];
  
  gardens.forEach(garden => {
    // Her bahçe için 2-3 tamamlanmış döngü ekle
    const cycle1 = generateCompletedCycle(garden.id, 5 + Math.floor(Math.random() * 10), calculateGardenScore);
    const cycle2 = generateCompletedCycle(garden.id, 20 + Math.floor(Math.random() * 10), calculateGardenScore);
    
    cycles.push(cycle1);
    cycles.push(cycle2);
    
    if (garden.id % 3 === 0) {
      cycles.push(generateCompletedCycle(garden.id, 35 + Math.floor(Math.random() * 10), calculateGardenScore));
    }
  });
  
  // Mock critical warnings generation removed - warnings now come from backend API
  // criticalWarnings array is kept in InspectionCycle type for compatibility but should remain empty
  
  return cycles;
};

/**
 * Rastgele bahçe ID'si seç (helper fonksiyonlar için)
 */
export const getRandomGardenIdHelper = (gardens: Garden[]): number => {
  return getRandomGardenId(gardens);
};

/**
 * Rastgele not al (helper fonksiyonlar için)
 */
export const getRandomNoteHelper = (): string => {
  return getRandomNote();
};

/**
 * Rastgele uyarı al (helper fonksiyonlar için)
 */
export const getRandomWarningHelper = () => {
  return getRandomWarning();
};
