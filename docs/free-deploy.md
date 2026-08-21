# Deploy Gratis

Stack gratis yang dipakai:

- Vercel Free untuk hosting Next.js.
- Neon Free untuk PostgreSQL aplikasi.

## Neon

Salin connection string dari menu **Connect** pada project Neon, lalu simpan sebagai `DATABASE_URL` di environment Production Vercel.

```sql
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

Setelah environment tersedia, jalankan skema Prisma ke Neon:

```bash
npx prisma db push
```
