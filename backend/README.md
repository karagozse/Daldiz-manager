# DALDIZ Backend API

Backend API for the DALDIZ agricultural inspection and scoring application.

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Relational database
- **JWT** - Authentication
- **TypeScript** - Type-safe development

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/daldiz_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### 3. Setup Database

Create a PostgreSQL database (if not exists):
```sql
CREATE DATABASE daldiz_db;
```

Run migrations:
```bash
npx prisma migrate dev --name init
```

### 4. Seed Database

```bash
npx prisma db seed
```

This will create:
- 3 campuses (Belek, Çandır, Manavgat)
- 4 users (consultant, auditor, admin, root)
- Default password for all users: `123123`

### 5. Start Development Server

```bash
npm run start:dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /auth/login` - Login with username and password
- `GET /auth/me` - Get current user (protected)

### Campuses

- `GET /campuses` - List all campuses (protected)
- `GET /campuses/:id` - Get campus by ID (protected)

### Gardens

- `GET /gardens` - List gardens (optional filters: `?campusId=belek&status=ACTIVE`) (protected)
- `GET /gardens/:id` - Get garden by ID (protected)
- `POST /gardens` - Create garden (admin only)
- `PATCH /gardens/:id/status` - Update garden status (admin only)

### Users

- `GET /users` - List all users (protected)

## Authentication

All endpoints except `/auth/login` require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Default Users

After seeding, you can login with:

- **consultant** / `123123` (CONSULTANT role)
- **auditor** / `123123` (LEAD_AUDITOR role)
- **admin** / `123123` (ADMIN role)
- **root** / `123123` (SUPER_ADMIN role)

## Development

- `npm run start:dev` - Start in watch mode
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Database

- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma generate` - Generate Prisma Client
