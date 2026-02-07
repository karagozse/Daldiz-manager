# Backend Setup Instructions

## ✅ Project Structure Created

The backend has been initialized with the following structure:

```
backend/
├── src/
│   ├── auth/              # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── guards/        # JWT & Roles guards
│   │   ├── strategies/    # Passport JWT strategy
│   │   └── decorators/    # @Roles(), @CurrentUser()
│   ├── users/             # User management
│   ├── campuses/          # Campus CRUD
│   ├── gardens/           # Garden CRUD (with RBAC)
│   ├── prisma/            # Prisma service & module
│   ├── app.module.ts      # Root module
│   └── main.ts            # Bootstrap
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Seed script
├── package.json
├── tsconfig.json
└── .env.example
```

## 📋 Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/daldiz_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### 3. Create PostgreSQL Database

Make sure PostgreSQL is running and create the database:

```sql
CREATE DATABASE daldiz_db;
```

### 4. Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create the database tables (users, campuses, gardens)
- Generate Prisma Client

### 5. Seed Initial Data

```bash
npx prisma db seed
```

This creates:
- **3 Campuses:**
  - `belek` (Belek Kampüsü, weight: 0.60)
  - `candir` (Çandır Kampüsü, weight: 0.20)
  - `manavgat` (Manavgat Kampüsü, weight: 0.20)

- **4 Users** (password: `123123`):
  - `consultant` → CONSULTANT role
  - `auditor` → LEAD_AUDITOR role
  - `admin` → ADMIN role
  - `root` → SUPER_ADMIN role

### 6. Start Development Server

```bash
npm run start:dev
```

The server will start on `http://localhost:3000`

## 🔑 Key Files Overview

### `prisma/schema.prisma`
Defines the database schema with:
- User model (with Role enum)
- Campus model
- Garden model (with GardenStatus enum)

### `src/app.module.ts`
Root module that imports:
- ConfigModule (global env vars)
- PrismaModule (global DB service)
- AuthModule, UsersModule, CampusesModule, GardensModule

### `src/auth/auth.module.ts`
Authentication module with:
- JWT configuration
- Passport JWT strategy
- Login & profile endpoints

### `src/auth/guards/jwt-auth.guard.ts`
Protects routes requiring authentication

### `src/auth/guards/roles.guard.ts`
Enforces role-based access control (RBAC)

### `src/auth/decorators/roles.decorator.ts`
`@Roles(Role.ADMIN, Role.SUPER_ADMIN)` decorator for controllers

## 🧪 Test the API

### 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"consultant","password":"123123"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "consultant",
    "displayName": "Ziraat Danışmanı",
    "role": "CONSULTANT",
    "email": "consultant@dosttarim.com"
  }
}
```

### 2. Get Current User

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <your-token>"
```

### 3. List Campuses

```bash
curl http://localhost:3000/campuses \
  -H "Authorization: Bearer <your-token>"
```

### 4. List Gardens

```bash
curl http://localhost:3000/gardens \
  -H "Authorization: Bearer <your-token>"
```

### 5. Create Garden (Admin Only)

```bash
curl -X POST http://localhost:3000/gardens \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Belek-1","campusId":"belek"}'
```

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] PostgreSQL database created
- [ ] Migrations run (`npx prisma migrate dev`)
- [ ] Database seeded (`npx prisma db seed`)
- [ ] Server starts without errors (`npm run start:dev`)
- [ ] Login endpoint works
- [ ] Protected endpoints require JWT token
- [ ] Admin-only endpoints enforce RBAC

## 🚀 Next Steps

Once everything is working, you can proceed to implement:
- Inspections module
- Scoring service
- Dashboard endpoints
- Analysis endpoints
- Critical warnings module
