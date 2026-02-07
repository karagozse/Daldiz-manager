# Değişiklik Özeti – Rol ve Yetki Güncellemesi

## 0. Analiz

- **Dosya:** `docs/STEP0_ANALYSIS.md`
- Proje yapısı, backend/frontend roller, denetim/reçete endpoint’leri ve UI bileşenleri analiz edildi.

---

## 1. Rol modeli

- **Backend:** `backend/src/auth/roles.helper.ts`  
  - `SemanticRole`: `root` | `yonetici` | `danisman` | `denetci`  
  - `backendRoleToSemantic(role)`, `hasSemanticRole(user, allowed)`  
  - Prisma `Role` enum’u aynı kaldı: `CONSULTANT`, `LEAD_AUDITOR`, `ADMIN`, `SUPER_ADMIN`.

- **Frontend:** `src/lib/permissions.ts`  
  - `Role` tipi, `mapBackendRoleToSemantic(backendRole)`, `can` helper’ları  
  - `can.startAudit`, `seeStartAuditBtn`, `writeRecipe`, `seeWriteRecipeBtn`,  
    `seePendingAudits`, `openPendingAudit`, `seePendingRecipes`, `openPendingRecipe`,  
    `viewCurrentPrescription`, `editCurrentPrescription`

---

## 2. Backend yetkilendirme (API)

### Endpoint → roller

| Endpoint | İzin verilen roller (Prisma) | Semantic |
|----------|------------------------------|----------|
| **Inspections** | | |
| `POST /inspections` | CONSULTANT, SUPER_ADMIN | root, danisman |
| `PATCH /inspections/:id` | CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN | root, danisman, denetci |
| `DELETE /inspections/:id` | CONSULTANT (own DRAFT), LEAD_AUDITOR, SUPER_ADMIN | root, danisman (own draft), denetci |
| **Prescriptions** | | |
| `POST /prescriptions` | CONSULTANT, SUPER_ADMIN | root, danisman |
| `PUT /prescriptions/:id` | CONSULTANT, SUPER_ADMIN | root, danisman |
| `POST /prescriptions/:id/submit` | CONSULTANT, SUPER_ADMIN | root, danisman |
| `POST /prescriptions/:id/review` | LEAD_AUDITOR, SUPER_ADMIN | root, denetci |
| `GET /prescriptions/pending` | CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN | root, danisman, denetci |
| `GET /prescriptions/*` (list, latest, one) | Tümü (mevcut) | Tümü |
| `DELETE /prescriptions/:id` | CONSULTANT, LEAD_AUDITOR, SUPER_ADMIN | root, danisman (own DRAFT), denetci (PENDING) |
| **Critical warnings** | | |
| `POST .../critical-warnings` | LEAD_AUDITOR, SUPER_ADMIN | root, denetci |
| `PATCH /critical-warnings/:id` | LEAD_AUDITOR, SUPER_ADMIN | root, denetci |
| **Gardens** | | |
| `POST /gardens`, `PATCH /gardens/:id/status` | SUPER_ADMIN | root |

### Güncellenen dosyalar

- `backend/src/inspections/inspections.controller.ts`: Rol guard’ları eklendi; DELETE’e `CurrentUser` ve service’e `userId`/`userRole` iletimi.
- `backend/src/inspections/inspections.service.ts`: `delete` artık CONSULTANT için sadece kendi DRAFT’ını silebiliyor.
- `backend/src/prescriptions/prescriptions.controller.ts`: Create/update/submit için ADMIN kaldırıldı; review/pending/delete için ADMIN kaldırıldı; pending list’e CONSULTANT eklendi.
- `backend/src/prescriptions/prescriptions.service.ts`: Delete’te “auditor” = LEAD_AUDITOR | SUPER_ADMIN (ADMIN çıkarıldı).
- `backend/src/critical-warnings/critical-warnings.controller.ts`: POST ve PATCH’e `RolesGuard` + `@Roles(LEAD_AUDITOR, SUPER_ADMIN)` eklendi.
- `backend/src/gardens/gardens.controller.ts`: Create ve status güncellemesi yalnızca `SUPER_ADMIN`.

---

## 3. Frontend yetkilendirme (UI)

### Buton / bölüm görünürlüğü

| Öğe | Görünen roller | Tıklanabilir / aksiyon |
|-----|----------------|--------------------------|
| Denetim Başlat | root, danisman | Evet |
| Taslak devam et | root, danisman | Evet |
| Bekleyen değerlendirme (kart) | root, danisman, denetci | root, denetci tıklayabilir; danisman disabled + “Yetkiniz yok” tooltip |
| Reçete Yaz | root, danisman | Evet |
| Onay Bekliyor (reçete) | root, danisman, denetci | root, denetci açabilir; danisman disabled + “Yetkiniz yok” tooltip |
| Güncel Reçete | Tümü | Tümü görüntüleyebilir |

- **Yönetici (yonetici):** Denetim Başlat / Reçete Yaz yok; onaya düşen denetim/reçete bölümleri yok; Güncel Reçete ve diğer sayfalar okunabilir.

### Güncellenen bileşenler

- `src/App.tsx`: `/bahce/:id/denetim` → `requiredRoles: [CONSULTANT, SUPER_ADMIN]`; `/bahce/:id/degerlendirme/:inspectionId` → `[LEAD_AUDITOR, SUPER_ADMIN]` (ADMIN kaldırıldı).
- `src/pages/GardenDetail.tsx`: `can` + `mapBackendRoleToSemantic`; draft/pending/Denetim Başlat koşulları ve tooltip.
- `src/pages/InspectionForm.tsx`: `can.seeStartAuditBtn` ile sayfa erişim kontrolü.
- `src/pages/EvaluationForm.tsx`: `can.openPendingAudit` ile sayfa erişim kontrolü.
- `src/pages/Gardens.tsx`: Reçete Yaz / Onay Bekliyor / Güncel Reçete için `can`; `loadPendingPrescriptions` / `loadPendingPrescriptionForCampus` yalnızca `can.seePendingRecipes` rollerinde çağrılıyor.
- `src/pages/Profile.tsx`: Bahçe yönetimi yalnızca root (SUPER_ADMIN); rol etiketleri güncellendi.
- `src/components/ProfileMenuSheet.tsx`: Rol açıklamaları güncellendi.

---

## 4. users.csv ve script

- **`docs/users.csv.example`:** Örnek CSV (email, username, displayName, role, campusId).
- **`docs/ROLE_MAPPING.md`:** Rol eşleme tablosu ve CSV formatı.
- **`backend/scripts/update-user-roles-from-csv.ts`:** Opsiyonel örnek script; CSV’den okuyup kullanıcı rollerini günceller. Varsayılan: `backend/scripts/users.csv`.

---

## 5. Build / lint

- Frontend: `npm run build` başarılı.
- Backend: `npm run build` başarılı.
- Mevcut ESLint uyarıları (ör. `no-explicit-any`) ve proje lint konfigürasyonu değiştirilmedi.

---

## 6. Kısa özet

- **Yeni permission helper:** `src/lib/permissions.ts` (`can.*`, `mapBackendRoleToSemantic`).
- **Backend rol helper:** `backend/src/auth/roles.helper.ts` (şu an doğrudan kullanılmıyor; ileride guard/service’lerde kullanılabilir).
- **Endpoint kısıtlamaları:** Denetim oluşturma root/danisman; reçete oluşturma root/danisman; denetim skor/reçete onayı root/denetci; kritik uyarı create/update root/denetci; bahçe create/status yalnızca root.
- **UI:** Denetim Başlat ve Reçete Yaz root/danisman; onaya düşen denetim/reçete listesi root/danisman/denetci (açma yalnızca root/denetci); yönetici salt okunur, ilgili aksiyon butonları ve pending bölümleri gizlendi.
