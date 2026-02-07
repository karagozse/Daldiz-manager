# DALDIZ-Manager — Tarımsal Denetim Platformu (Manager dalı)

## Bu repo hakkında

**Bu repo DALDIZ-Manager'dır; DALDIZ prod'dan ayrıdır.** Aynı kod tabanından türetilmiş olup ayrı klasör, ayrı git repo ve **ayrı Neon DB** kullanır. DALDIZ ana projesinde hiçbir değişiklik yapılmaz.

## Proje Hakkında

Daldız, sera ve tarımsal alanlar için kapsamlı denetim ve reçete yönetim platformudur. Platform, bahçe denetimleri, skorlama, kritik uyarılar ve reçete yönetimi gibi özellikler sunar.

## Teknolojiler

Bu proje şu teknolojilerle geliştirilmiştir:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Router
- TanStack Query

## Geliştirme

### Gereksinimler

- Node.js 18+ (tercihen 20+) & npm - [nvm ile kurulum](https://github.com/nvm-sh/nvm#installing-and-updating)
- Lokal geliştirme için: Backend (NestJS) + Frontend (Vite) ayrı portlarda çalışır.
- **Not:** Kök `.env` ve `backend/.env` ayrıdır. Backend sadece `backend/.env` dosyasını kullanır; DATABASE_URL, JWT_SECRET vb. bu dosyada olmalıdır.

### Lokal çalıştırma (Backend + Frontend)

Proje monorepo yapısındadır: kök = frontend (Vite), `backend/` = NestJS API.

**Portlar:**
- Backend API: **http://localhost:3000** (env: `PORT`, varsayılan 3000). **DALDIZ ile aynı anda çalıştırıyorsanız** çakışmayı önlemek için `backend/.env` içinde `PORT=3100` kullanın.
- Frontend: **http://localhost:8080** (Vite varsayılan)

**1. Backend**

```sh
cd backend
npm install
# .env: backend/.env.example'tan kopyalayıp DATABASE_URL (Neon), JWT_SECRET, PORT doldurun
cp .env.example .env   # veya Windows: copy .env.example .env
npx prisma generate
# Migrations varsa: npx prisma migrate deploy
# Yoksa: npx prisma db push
npm run start:dev       # Backend http://localhost:3000 (veya PORT ile 3100)
```

**Neon DB kurulumu:** Neon panelinden connection string alın. `backend/.env` içine `DATABASE_URL="postgresql://..."` olarak yapıştırın. Sonra:
- `npx prisma generate`
- Migrations varsa: `npx prisma migrate deploy`; yoksa: `npx prisma db push`
- (Opsiyonel) `npx prisma studio` ile DB tarayıcıda açılır.

Backend ayakta mı: tarayıcıda veya `curl http://localhost:3000/health` → `{"status":"ok"}` dönmeli.

**2. Frontend**

```sh
# Kök dizinde
npm install
npm run dev                 # Frontend http://localhost:8080
```

Frontend, hostname localhost/127.0.0.1 ise API adresini otomatik `http://localhost:3000` yapar. Override: `.env` içinde `VITE_API_BASE_URL=http://localhost:3000`.

**3. CORS**

Backend CORS'ta şu origin'ler tanımlı: prod (daldiz.app, Render) + **http://localhost:8080**, **http://127.0.0.1:8080**. Ek origin (örn. LAN): `CORS_ORIGIN=http://192.168.x.x:8080` (backend `.env`).

**Tek komutla her ikisi (opsiyonel):**

```sh
npm install          # Kökte (concurrently yüklenir)
npm run dev:all      # Backend (3000) + Frontend (8080) aynı anda
```

**Sorun giderme:**
- "Failed to fetch" / CORS hatası → Backend çalışıyor mu? `http://localhost:3000/health` açılıyor mu? CORS listesinde frontend origin var mı?
- DB hatası → `backend/.env` içinde `DATABASE_URL` doğru mu? `npx prisma migrate status` çalıştırın.
- Windows'ta `prisma generate` EPERM verirse: diğer terminalleri/IDE'yi kapatıp tekrar deneyin veya backend'i bir kez çalıştırıp durdurun.

### Kurulum ve Çalıştırma (sadece frontend)

```sh
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Production build oluştur
npm run build

# Build önizlemesi
npm run preview

# Kod kalitesi kontrolü
npm run lint
```

## Proje Yapısı

- `src/components/` - React bileşenleri
- `src/pages/` - Sayfa bileşenleri
- `src/contexts/` - React context'leri
- `src/lib/` - Yardımcı fonksiyonlar ve API client'ları
- `public/` - Statik dosyalar ve ikonlar

## Lisans

Bu proje özel bir projedir.
