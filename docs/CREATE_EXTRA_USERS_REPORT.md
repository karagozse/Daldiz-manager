# Yeni Kullanıcı Ekleme – Rapor

## 1. Script ve çalıştırma

| | |
|--|--|
| **Script** | `backend/scripts/create-extra-users.ts` |
| **Komut** | `cd backend` → `npx ts-node scripts/create-extra-users.ts` |

## 2. İlk çalıştırma çıktısı

```
🔐 create-extra-users: only adds dost1..dost10, danisman, denetci.
   Existing users (admin, root, consultant, auditor, etc.) are never modified.

  created: dost1 [ADMIN] dost1@daldiz.local
  created: dost2 [ADMIN] dost2@daldiz.local
  ... (dost3..dost9)
  created: dost10 [ADMIN] dost10@daldiz.local
  created: danisman [CONSULTANT] danisman@daldiz.local
  created: denetci [LEAD_AUDITOR] denetci@daldiz.local

✅ Done. Created: 12, Skipped: 0.
```

## 3. Kullanıcı listesi (username, role, email, created/skipped)

| username | role | email | durum |
|----------|------|-------|-------|
| dost1 | ADMIN | dost1@daldiz.local | created |
| dost2 | ADMIN | dost2@daldiz.local | created |
| dost3 | ADMIN | dost3@daldiz.local | created |
| dost4 | ADMIN | dost4@daldiz.local | created |
| dost5 | ADMIN | dost5@daldiz.local | created |
| dost6 | ADMIN | dost6@daldiz.local | created |
| dost7 | ADMIN | dost7@daldiz.local | created |
| dost8 | ADMIN | dost8@daldiz.local | created |
| dost9 | ADMIN | dost9@daldiz.local | created |
| dost10 | ADMIN | dost10@daldiz.local | created |
| danisman | CONSULTANT | danisman@daldiz.local | created |
| denetci | LEAD_AUDITOR | denetci@daldiz.local | created |

İkinci çalıştırmada hepsi **skip (already exists)** olarak es geçildi; parola veya diğer alanlar değiştirilmedi.

## 4. Örnek sorgu çıktısı

Eşdeğer SQL:

```sql
SELECT username, role, email FROM users
WHERE username IN ('dost1','dost2','dost3','dost4','dost5','dost6','dost7','dost8','dost9','dost10','danisman','denetci')
ORDER BY username;
```

Doğrulama script’i (`npx ts-node scripts/verify-extra-users.ts`) çıktısı:

```
--- New users (dost1..dost10, danisman, denetci) ---
┌─────────┬────────────┬────────────────┬─────────────────────────┐
│ (index) │  username  │      role      │          email          │
├─────────┼────────────┼────────────────┼─────────────────────────┤
│    0    │ 'danisman' │  'CONSULTANT'  │ 'danisman@daldiz.local' │
│    1    │ 'denetci'  │ 'LEAD_AUDITOR' │ 'denetci@daldiz.local'  │
│    2    │  'dost1'   │    'ADMIN'     │  'dost1@daldiz.local'   │
│   ...   │    ...     │      ...       │          ...            │
│   11    │  'dost9'   │    'ADMIN'     │  'dost9@daldiz.local'   │
└─────────┴────────────┴────────────────┴─────────────────────────┘
```

## 5. Mevcut kullanıcıların korunması

**admin, root, consultant, auditor** hiçbir şekilde değiştirilmez. Script yalnızca `NEW_USERS` listesindeki 12 kullanıcıyı oluşturmayı dener; bu kullanıcılar listede yok.

Doğrulama çıktısı:

```
--- Existing users (must be unchanged) ---
┌─────────┬──────────────┬────────────────┬────────────────────────────┐
│   username   │      role      │           email                      │
├──────────────┼────────────────┼─────────────────────────────────────┤
│   'admin'    │    'ADMIN'     │   'admin@dosttarim.com'              │
│  'auditor'   │ 'LEAD_AUDITOR' │  'auditor@dosttarim.com'             │
│ 'consultant' │  'CONSULTANT'  │ 'consultant@dosttarim.com'           │
│    'root'    │ 'SUPER_ADMIN'  │    'root@dosttarim.com'              │
└──────────────┴────────────────┴─────────────────────────────────────┘
```

Rolleri ve emailleri seed ile aynı; şifre alanına müdahale edilmedi.

## 6. Parolalar (6 haneli, sadece rakam)

| username | parola |
|----------|--------|
| dost1 … dost10 | 113819, 121035, 251056, 298704, 503893, 584671, 677744, 686213, 700858, 737152 |
| danisman | 758295 |
| denetci | 815057 |

Hash: `bcrypt.hash(plainPassword, 10)` (seed ve auth ile uyumlu).
