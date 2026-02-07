# Adım 1 Analiz Özeti – Görev Merkezi

## 1. Header / kritik ikon

- **Bileşen:** `src/components/Header.tsx`
- **Sağ üst:** `showNotification` true iken **Bell** ikonu render ediliyor (satır 34–41). Tıklanınca `GlobalWarningsModal` (kritik uyarılar) açılıyor.
- **JSX:** Bell, `<div className="w-10 flex justify-end">` içinde; `showProfile` solda (User ikonu), başlık ortada, sağda Bell.
- Görev Merkezi ikonu **Bell’in soluna** eklenecek (aynı sağ div içinde, Bell’den önce).

## 2. Rol bilgisi

- **Helper:** `src/lib/permissions.ts` – `mapBackendRoleToSemantic`, `can`
- **Kullanıcı:** `useApp()` → `currentUser`, `activeRole` (backend rol: CONSULTANT, LEAD_AUDITOR, ADMIN, SUPER_ADMIN)
- **Semantic rol:** `const role = mapBackendRoleToSemantic(activeRole ?? "");`
- Header şu an `useApp` kullanmıyor; Görev Merkezi için `activeRole` alınıp `mapBackendRoleToSemantic` ile role çevrilecek. İkon yalnızca `role === "root" || role === "denetci"` iken gösterilecek.

## 3. Pending veri kaynakları

### Pending reçeteler

- **API:** `GET /prescriptions/pending`
- **Client:** `listPendingReviewPrescriptions()` – `src/lib/prescriptions.ts`
- **Dönen tip:** `Prescription[]` (id, campusId, campus?: { id, name, weight }, createdAt, updatedAt, status, …)
- **Kullanım:** `Gardens.tsx` – `loadPendingPrescriptions` (AppContext) içinde `listPendingReviewPrescriptions` çağrılıyor.

### Pending denetimler (değerlendirme bekleyen)

- **API:** `GET /inspections` (tümü) veya `GET /inspections?gardenId=...`
- **Client:** AppContext `loadAllInspections` → `apiFetch<BackendInspection[]>("/inspections")`
- **Filtre:** `status === "SUBMITTED" || status === "REVIEW"`
- **Tip:** `BackendInspection` – id, gardenId, garden: { id, name, campusId, campus: { id, name, weight } }, createdAt, createdBy, …
- **Kullanım:** `GardenDetail.tsx`, `EvaluationForm.tsx` – `inspections` state’i ve `getPendingEvaluationForGarden` benzeri mantık.

Görev Merkezi modalı:

- Pending reçeteler için: `listPendingReviewPrescriptions`
- Pending denetimler için: `apiFetch<BackendInspection[]>("/inspections")` sonrası SUBMITTED/REVIEW filtresi (veya AppContext `inspections` + aynı filtre).
