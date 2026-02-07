# Adım 0: Proje ve Kullanıcı/Rol Yapısı Analizi

## 1. Proje yapısı

- **Backend:** `backend/` – NestJS + Prisma, PostgreSQL (Neon)
- **Frontend:** `src/` – React + Vite, TypeScript (tek repo kökü: `c:\DALDIZ-Frontend`)

## 2. Backend – Kullanıcı ve roller

| Dosya | Açıklama |
|-------|----------|
| `backend/prisma/schema.prisma` | User modeli, `role` alanı, `Role` enum |
| `backend/src/users/dto/user.dto.ts` | `UserDto`, `role: Role` |
| `backend/src/auth/auth.service.ts` | Login; JWT payload’da `role` |
| `backend/src/auth/strategies/jwt.strategy.ts` | JWT validate → `user` (id, username, role, …) request’e eklenir |
| `backend/src/auth/guards/roles.guard.ts` | `@Roles(...)` ile rol kontrolü |
| `backend/src/auth/decorators/roles.decorator.ts` | `Roles(...roles)` metadata |

**Mevcut `Role` enum (Prisma):**

- `CONSULTANT`
- `LEAD_AUDITOR`
- `ADMIN`
- `SUPER_ADMIN`

**Denetim / reçete ile ilgili controller’lar:**

| Controller | Endpoint’ler | Rol kullanımı |
|------------|-------------|----------------|
| `inspections/inspections.controller.ts` | POST /, GET, GET :id, PATCH :id, DELETE :id | Sadece `JwtAuthGuard`; rol guard yok |
| `prescriptions/prescriptions.controller.ts` | POST, PUT :id, POST :id/submit, POST :id/review, GET campus/:id/list, GET campus/:id/latest, GET pending, GET :id, DELETE :id | `RolesGuard` + `@Roles(...)` |
| `critical-warnings/critical-warnings.controller.ts` | POST inspections/:id/critical-warnings, PATCH critical-warnings/:id, GET critical-warnings, GET gardens/:id/critical-warnings | Sadece `JwtAuthGuard` |
| `gardens/gardens.controller.ts` | POST, GET, GET :id, GET :id/inspections, PATCH :id/status | POST / PATCH :id/status → `@Roles(ADMIN, SUPER_ADMIN)` |

**Kritik aksiyonlar (mevcut):**

- **Denetim başlat:** `POST /inspections` – herhangi authenticate kullanıcı
- **Reçete yaz / gönder:** `POST /prescriptions`, `PUT /prescriptions/:id`, `POST /prescriptions/:id/submit` – CONSULTANT, ADMIN, SUPER_ADMIN
- **Reçete onaylama / geri gönderme:** `POST /prescriptions/:id/review` – LEAD_AUDITOR, ADMIN, SUPER_ADMIN; `prescriptions.service` delete’te LEAD_AUDITOR, ADMIN, SUPER_ADMIN
- **Denetim skor / sonuçlandırma:** `PATCH /inspections/:id` – rol kısıtı yok
- **Kritik uyarı aç/kapat:** `POST .../critical-warnings`, `PATCH /critical-warnings/:id` – rol kısıtı yok

## 3. Frontend – Auth ve UI

| Dosya | Açıklama |
|-------|----------|
| `src/contexts/AppContext.tsx` | `currentUser`, `activeRole`, `authToken`; `UserRole` = CONSULTANT \| LEAD_AUDITOR \| ADMIN \| SUPER_ADMIN; login → backend `/auth/login`, restore → `/auth/me` |
| `src/services/auth.ts` | `login`, `getCurrentUser` (API wrapper) |
| `src/lib/api.ts` | `apiFetch`, token Authorization header, 401 → logout + redirect |

**Buton / sayfa eşlemesi:**

| UI öğesi | Bileşen | Mevcut rol mantığı |
|----------|---------|---------------------|
| Denetim Başlat | `GardenDetail.tsx` | CONSULTANT veya SUPER_ADMIN; draft/pending yoksa |
| Denetim formu sayfası | `InspectionForm.tsx` | `canStartInspection` → CONSULTANT veya SUPER_ADMIN; yetki yoksa mesaj |
| Bekleyen değerlendirme kartı | `GardenDetail.tsx` | LEAD_AUDITOR veya SUPER_ADMIN; “Değerlendir” ile EvaluationForm’a |
| Değerlendirme formu | `EvaluationForm.tsx` | `canStartEvaluation` → LEAD_AUDITOR veya SUPER_ADMIN |
| Reçete Yaz / Onay Bekliyor | `Gardens.tsx` | CONSULTANT: PENDING varsa “Onay Bekliyor” disabled; yoksa “Reçete Yaz”. LEAD_AUDITOR/ADMIN/SUPER_ADMIN: PENDING varsa review, yoksa yaz |
| Güncel Reçete | `Gardens.tsx` + `PrescriptionViewModal.tsx` | Tüm roller; modal salt okunur |
| Onaya düşen reçeteler | `Gardens.tsx` | “Onay Bekliyor” → `PrescriptionReviewModal`; `loadPendingPrescriptions` sadece LEAD_AUDITOR, ADMIN, SUPER_ADMIN |

**Sayfalar:**

- Dashboard: `Index.tsx` → `Dashboard.tsx`
- Bahçeler: `Gardens.tsx`
- Bahçe detay: `GardenDetail.tsx`
- Analiz: `Analysis.tsx`

**Routing:** `App.tsx` – `ProtectedRoute`; `/bahce/:id/denetim` → `requiredRoles: [CONSULTANT, ADMIN, SUPER_ADMIN]`; `/bahce/:id/degerlendirme/:inspectionId` → `requiredRoles: [LEAD_AUDITOR, ADMIN, SUPER_ADMIN]`.

## 4. users.csv

- Proje içinde `users.csv` **yok**. Neon’daki kullanıcıları içeren dosya kullanıcı tarafında.
- Adım 5’te örnek `users.csv` ve rol eşleme tablosu eklenecek.

## 5. Rol uyumluluğu (mevcut → yeni)

Yeni rol modeli: `root` | `yonetici` | `danisman` | `denetci`.

| Backend (Prisma) | Yeni semantic rol | Açıklama |
|------------------|-------------------|----------|
| `SUPER_ADMIN` | `root` | Süper admin |
| `ADMIN` | `yonetici` | Kampüs/bahçe yöneticisi |
| `CONSULTANT` | `danisman` | Ziraat danışmanı |
| `LEAD_AUDITOR` | `denetci` | Denetçi |

Veritabanı enum’u değiştirilmeyecek; kod tarafında bu 4 semantic rol üzerinden yetki kuralları uygulanacak.

---

**Özet:** Backend’de inspections ve critical-warnings için rol kısıtı yok; prescriptions ve gardens kısmen var. Frontend’de sayfa/buton görünürlüğü rollerle kısıtlı. Yeni yetki matrisine göre endpoint’ler ve UI güncellenecek.
