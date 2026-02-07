# Prescriptions API Endpoints

## Frontend Kullanılan Endpoint'ler (src/lib/prescriptions.ts)

1. **POST /prescriptions** - Yeni reçete oluştur
   - `createPrescription(data: CreatePrescriptionRequest)`
   - Body: `{ campusId, ventilation?, irrigation?, fertilization? }`

2. **PUT /prescriptions/:id** - Reçete güncelle
   - `updatePrescription(id: number, data: UpdatePrescriptionRequest)`
   - Body: `{ ventilation?, irrigation?, fertilization? }`

3. **POST /prescriptions/:id/submit** - Reçeteyi onaya gönder
   - `submitPrescriptionForReview(id: number)`
   - Body: `{}`

4. **POST /prescriptions/:id/review** - Denetçi onayla/geri gönder
   - `reviewPrescription(id: number, data: ReviewPrescriptionRequest)`
   - Body: `{ status: 'APPROVED' | 'RETURNED', reviewNote? }`

5. **GET /prescriptions/campus/:campusId/latest** - En son onaylanmış reçete
   - `getLatestPrescriptionByCampus(campusId: string)`
   - Returns: `Prescription | null`

6. **GET /prescriptions/campus/:campusId/list** - Kampüs bazlı reçete listesi
   - `listPrescriptionsByCampus(campusId: string)`
   - Returns: `Prescription[]`

7. **GET /prescriptions/:id** - Reçete detayı
   - `getPrescription(id: number)`
   - Returns: `Prescription`

8. **DELETE /prescriptions/:id** - Reçete sil
   - `deletePrescription(id: number)`
   - Returns: `void`

9. **GET /prescriptions/pending** - Onay bekleyen reçeteler
   - `listPendingReviewPrescriptions()`
   - Returns: `Prescription[]`

## Backend Controller Mapping

Tüm endpoint'ler `prescriptions.controller.ts` içinde tanımlı:
- ✅ POST /prescriptions → `create()`
- ✅ PUT /prescriptions/:id → `update()`
- ✅ POST /prescriptions/:id/submit → `submitForReview()`
- ✅ POST /prescriptions/:id/review → `review()`
- ✅ GET /prescriptions/campus/:campusId/latest → `getLatestApproved()`
- ✅ GET /prescriptions/campus/:campusId/list → `listForConsultant()`
- ✅ GET /prescriptions/pending → `listPendingReview()`
- ✅ GET /prescriptions/:id → `findOne()`
- ✅ DELETE /prescriptions/:id → `delete()`

## Notlar

- Tüm endpoint'ler JWT authentication gerektirir (`@UseGuards(JwtAuthGuard, RolesGuard)`)
- Rol bazlı erişim kontrolü mevcut
- Prisma schema'da `Prescription` modeli ve `PrescriptionStatus` enum'ı tanımlı
- Migration çalıştırılmalı: `npx prisma migrate dev`
