# Hasat (Harvest) Module

## Run locally

1. **Backend** (apply migration and start):
   ```bash
   cd backend
   npx prisma migrate deploy   # apply harvest tables (or: npx prisma db push)
   npx prisma generate
   npm run start:dev
   ```

2. **Frontend**:
   ```bash
   npm run dev
   ```
   Ensure `VITE_API_URL` (or `VITE_API_BASE_URL`) points to the backend (e.g. `http://localhost:3100`).

## Manual test checklist

- [ ] **Create draft**: Hasat → "Yeni Hasat Gir" → pick date + bahçe → Kaydet. Taslak oluşur, isim "DD.MM.YYYY - 1. Araba" olur.
- [ ] **Save with missing trader slip**: Aynı taslakta tüccar fişi fotoğrafı eklemeden Kaydet çalışır; Gönder pasif kalır.
- [ ] **General photos**: Taslak detayda "Fotoğraf ekle (kamyon / tartı fişleri)" ile birkaç fotoğraf yükle; listelenir.
- [ ] **Cannot submit**: Tüccar fişi fotoğrafı yokken Gönder disabled; gerekli alanlar (1. sınıf kg, 2. sınıf kg, fiyat > 0) dolu olsa bile.
- [ ] **Trader slip photo**: "Tüccar fişi fotoğrafı ekle" ile en az 1 fotoğraf yükle.
- [ ] **Submit**: Tüm zorunlular + en az 1 tüccar fişi fotoğrafı sonrası Gönder aktif; tıkla → "Hasat kapanmıştır" görünür, düzenleme kilitlenir.
- [ ] **List**: Hasat listesinde kartlarda "Taslak" / "Kapanmış" badge, toplam kg, 2. oran % görünür.
- [ ] **2. oran yüksek**: 2. sınıf / toplam > %5 ise kartta "2. oran yüksek" badge çıkar.
- [ ] **Özet**: Formda grade1+grade2 (ve varsa 3.) girilince Özet tablosunda total_kg, 2. oran %, tahmini gelir görünür.

## Files changed

### Backend
- `prisma/schema.prisma` – HarvestEntry, HarvestPhoto modelleri; Garden’a relation.
- `prisma/migrations/20250207_rename_completed_to_submitted/migration.sql` – Eksik dosya eklendi (no-op).
- `prisma/migrations/20260209020000_add_harvest/migration.sql` – Yeni migration.
- `src/harvest/dto/create-harvest.dto.ts`, `update-harvest.dto.ts` – DTO’lar.
- `src/harvest/harvest.service.ts` – CRUD, draft name, submit validation.
- `src/harvest/harvest.controller.ts` – GET/POST/PUT/DELETE, POST :id/submit.
- `src/harvest/harvest.module.ts` – Harvest modülü.
- `src/uploads/uploads.controller.ts` – POST `uploads/harvest-photo/:harvestId?category=GENERAL|TRADER_SLIP`, multi-file.
- `src/app.module.ts` – HarvestModule import.

### Frontend
- `src/lib/harvest.ts` – API client, types, computed helpers (totalKg, secondRatio, revenue).
- `src/pages/HarvestList.tsx` – Hasat listesi, "Yeni Hasat Gir", kartlarda badge ve özet.
- `src/pages/HarvestFormPage.tsx` – Form (tarih, bahçe, fiyat, tüccar fişi, 3. sınıf, kantar, fotoğraflar, Özet, Kaydet/Gönder).
- `src/App.tsx` – Routes: `/hasat`, `/hasat/yeni`, `/hasat/:id`.
- `src/components/BottomNav.tsx` – "Hasat" sekmesi eklendi.
