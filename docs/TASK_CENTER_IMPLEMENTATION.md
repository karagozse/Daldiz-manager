# Görev Merkezi – Uygulama Özeti

## 1. Mevcut yapı analizi

- **Header:** `src/components/Header.tsx` – Sağ üstte Bell ikonu (kritik uyarılar / bildirimler) → `GlobalWarningsModal`.
- **Rol:** `useApp()` → `activeRole`; `mapBackendRoleToSemantic` + `can` → `src/lib/permissions.ts`.
- **Pending reçeteler:** `listPendingReviewPrescriptions()` → `src/lib/prescriptions.ts`, `GET /prescriptions/pending`.
- **Pending denetimler:** `GET /inspections` → `BackendInspection[]`; filtre `status === "SUBMITTED" || "REVIEW"`.

## 2. Ortak görev modeli

**Dosya:** `src/lib/reviewTasks.ts`

- `TaskType = "prescription" | "inspection"`
- `ReviewTask`: `id`, `type`, `gardenId?`, `inspectionId?`, `prescriptionId?`, `campusId?`, `campusName?`, `gardenName?`, `createdAt?`, `statusLabel`
- `mapPendingPrescriptionsToTasks(rows: Prescription[]): ReviewTask[]`
- `mapPendingInspectionsToTasks(rows: BackendInspection[]): ReviewTask[]` (SUBMITTED/REVIEW filtresi)

## 3. Görev Merkezi modal

**Dosya:** `src/components/ReviewTasksModal.tsx`

- **Props:** `open`, `onClose`
- **Rol:** `can.seeTaskCenter(role)` değilse `null` döner.
- **Veri:** Açılışta `listPendingReviewPrescriptions` + `apiFetch("/inspections")`; mapping ile `ReviewTask[]`.
- **UI:** İki bölüm – “Değerlendirme bekleyen denetimler”, “Onay bekleyen reçeteler”. Loading / hata durumları.
- **Tıklama:**
  - **inspection:** `onClose` → `navigate(/bahce/${gardenId})` → Bahçe Detay sayfası (değerlendirme formu açılmaz).
  - **prescription:** `onClose` → `navigate(/bahceler?kampus=${campusId})` → Kampüs sayfası (Bahçeler + ilgili sekme; reçete onay modalı açılmaz).

## 4. Header güncellemesi

**Dosya:** `src/components/Header.tsx`

- `useApp` → `activeRole`; `role = mapBackendRoleToSemantic(activeRole)`; `showTaskCenter = can.seeTaskCenter(role)`.
- Kritik alarm (Bell) ikonunun **soluna** `ClipboardList` ikonu eklendi; yalnızca `showTaskCenter` iken render.
- Tıklanınca `ReviewTasksModal` açılıyor (`reviewTasksOpen` state).

## 5. Gardens – reçete inceleme URL parametreleri

**Dosya:** `src/pages/Gardens.tsx`

- `useEffect`: `?kampus` + `?openPrescription` varsa `activeTab` = kampus, `reviewingPrescriptionId` = id, `prescriptionReviewModalOpen` = true.
- Görev Merkezi’nden reçete satırına tıklanınca `/bahceler?kampus=X&openPrescription=Y` ile Gardens’a gidilir ve reçete inceleme modalı açılır.

## 6. Yetki kuralları

- **İkon + modal:** Sadece `root` ve `denetci` (`can.seeTaskCenter`). `danisman`, `yonetici` görmez.
- **Modal içi:** Zaten sadece root/denetci açabildiği için ek rol kontrolü yok; tıklama ile değerlendirme / reçete onay ekranlarına gidilir.
- **Backend:** `GET /prescriptions/pending` → CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN; `GET /inspections` → tüm authenticate kullanıcı. Root ve denetci erişebilir.

## 7. Kullanılan API’ler

| Veri | Fonksiyon / endpoint |
|------|----------------------|
| Pending reçeteler | `listPendingReviewPrescriptions()` → `GET /prescriptions/pending` |
| Pending denetimler | `apiFetch("/inspections")` → `GET /inspections` (frontend’te SUBMITTED/REVIEW filtresi) |

## 8. Değişen / eklenen dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/lib/reviewTasks.ts` | **Yeni** – `ReviewTask`, mapping helpers |
| `src/lib/permissions.ts` | `can.seeTaskCenter` eklendi |
| `src/components/ReviewTasksModal.tsx` | **Yeni** – Görev Merkezi modalı |
| `src/components/Header.tsx` | Görev Merkezi ikonu (ClipboardList), `ReviewTasksModal`, `useApp` + `can.seeTaskCenter` |
| `src/pages/Gardens.tsx` | `?kampus` + `?openPrescription` ile reçete inceleme modalı açma |
| `docs/TASK_CENTER_STEP1_ANALYSIS.md` | **Yeni** – Adım 1 analiz özeti |

## 9. Test senaryoları (manuel)

1. **root:** Görev Merkezi ikonu görünür; tıklanınca modal açılır; pending denetim/reçete listelenir. **Inspection** satırına tıklayınca **Bahçe Detay** (`/bahce/:id`) açılır (değerlendirme formu değil). **Prescription** satırına tıklayınca **kampüs sayfası** (`/bahceler?kampus=...`) açılır (reçete onay modalı değil).
2. **denetci:** Aynı davranış; navigation root ile aynı.
3. **danisman / yonetici:** Görev Merkezi ikonu **görünmez**; modal açılamaz.

Badge (bekleyen görev sayısı) opsiyonel bırakıldı; öncelik modal ve navigasyon üzerindeydi.
