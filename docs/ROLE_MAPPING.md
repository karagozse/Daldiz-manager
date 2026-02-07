# Rol eşleme: users.csv → Yeni model

Backend Prisma `Role` enum’u değiştirilmedi. Semantic roller kod içinde kullanılıyor.

## Eşleme tablosu

| E-posta (örnek)     | Eski rol (DB) | Yeni semantic rol | Açıklama                    |
|---------------------|---------------|-------------------|-----------------------------|
| root@dosttarim.com  | SUPER_ADMIN   | root              | Süper admin                 |
| admin@dosttarim.com | ADMIN         | yonetici          | Kampüs/bahçe yöneticisi     |
| consultant@...      | CONSULTANT    | danisman          | Ziraat danışmanı            |
| auditor@...         | LEAD_AUDITOR  | denetci           | Denetçi                     |

## users.csv formatı (örnek)

`users.csv` dosyasında aşağıdaki sütunlar kullanılabilir:

- `email`: Kullanıcı e-postası
- `username`: Giriş adı
- `displayName`: Görünen ad
- `role`: Backend rolü (`SUPER_ADMIN` | `ADMIN` | `CONSULTANT` | `LEAD_AUDITOR`)
- `campusId` (opsiyonel): Belek/Çandır/Manavgat ilişkisi

Örnek satırlar:

```csv
email,username,displayName,role,campusId
root@dosttarim.com,root,Sistem Yöneticisi,SUPER_ADMIN,
admin@dosttarim.com,admin,Yönetici,ADMIN,
consultant@dosttarim.com,consultant,Ziraat Danışmanı,CONSULTANT,
auditor@dosttarim.com,auditor,Baş Denetçi,LEAD_AUDITOR,
```

## Not

- Veritabanında rol alanı `Role` enum’u ile saklanır; `users.csv`’deki `role` değerleri bu enum ile uyumlu olmalıdır.
- Rol güncellemesi için opsiyonel script: `backend/scripts/update-user-roles-from-csv.ts`.
