# Adım 1 – User modeli ve auth özeti

## User modeli

- **Dosya:** `backend/prisma/schema.prisma`
- **User alanları:**
  - `id`, `username` (unique), `passwordHash`, `displayName`, `role` (Role enum),
  - `email` (opsiyonel, unique), `isActive`, `createdAt`, `updatedAt`
- **Role enum:** `CONSULTANT` | `LEAD_AUDITOR` | `ADMIN` | `SUPER_ADMIN`

## Şifre hashing

- **Kullanım:** `bcrypt.hash(plainPassword, 10)` (salt rounds: 10)
- **Doğrulama:** `bcrypt.compare(plain, user.passwordHash)` → `backend/src/auth/auth.service.ts`
- **Örnek:** `backend/prisma/seed.ts` satır 101 – `bcrypt.hash('123123', 10)`

## Mevcut kullanıcılar (değiştirilmeyecek)

- `admin`, `root`, `consultant`, `auditor` — seed ile oluşturuluyor; script bu kullanıcılara dokunmayacak.
