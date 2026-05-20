# LaundryPro POS

Aplikasi mesin kasir laundry profesional berbasis web untuk kasir dan owner. Stack utama:

- Next.js + TypeScript + Tailwind CSS
- Prisma ORM dengan schema PostgreSQL
- JWT cookie session untuk autentikasi
- Role-based access control: `OWNER` dan `CASHIER`
- Recharts untuk dashboard
- Browser print dengan CSS thermal 58mm / 80mm

## Akun Demo

- Owner: `owner@laundrypro.test`
- Kasir: `kasir@laundrypro.test`
- Password demo: `password`

## Cara Menjalankan

1. Install dependency:

```bash
npm install
```

2. Salin env:

```bash
cp .env.example .env
```

3. Isi `DATABASE_URL` PostgreSQL di `.env`.

4. Generate Prisma client dan migrasi database:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Jalankan aplikasi:

```bash
npm run dev
```

6. Buka `http://localhost:3000`.

## Halaman Utama

- `/login`
- `/dashboard-owner`
- `/cashier`
- `/transactions`
- `/transactions/[id]`
- `/customers`
- `/customers/[id]`
- `/services`
- `/expenses`
- `/reports`
- `/settings/store`
- `/settings/qris`
- `/settings/users`
- `/print/receipt/[transaction_id]`

## API Endpoint

Endpoint REST yang tersedia:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET|POST /api/customers`
- `GET|PUT /api/customers/:id`
- `GET|POST /api/services`
- `PUT|DELETE /api/services/:id`
- `GET|POST /api/transactions`
- `GET|PUT /api/transactions/:id`
- `POST /api/transactions/:id/cancel`
- `POST /api/transactions/:id/payments`
- `PATCH /api/transactions/:id/laundry-status`
- `GET /api/payments`
- `GET|POST /api/expenses`
- `PUT|DELETE /api/expenses/:id`
- `GET /api/reports/summary`
- `GET /api/reports/revenue`
- `GET /api/reports/profit-loss`
- `GET /api/reports/payment-methods`
- `GET /api/reports/customers`
- `GET /api/reports/services`
- `GET /api/reports/export`
- `GET|PUT /api/settings/store`
- `GET /api/settings/qris`
- `POST /api/settings/qris/upload`
- `GET|POST /api/users`
- `PUT|DELETE /api/users/:id`

## Catatan Implementasi

UI saat ini memakai data demo di `src/lib/mock-data.ts` agar aplikasi bisa langsung diuji tanpa database lokal. Schema PostgreSQL lengkap ada di `prisma/schema.prisma`; langkah produksi berikutnya adalah mengganti operasi demo pada API route dengan Prisma repository/service layer.

QRIS adalah upload gambar statis owner. API upload memvalidasi MIME JPG/PNG/WEBP dan ukuran maksimal 2 MB, lalu menyimpan file ke `public/uploads/qris`.

Nota thermal memakai `@media print`, menyembunyikan elemen non-print, dan menyediakan pilihan layout 58mm atau 80mm.

Rumus laporan owner berada di `src/lib/finance.ts`:

- Pendapatan kotor = total `grandTotal`
- Pendapatan bersih = total transaksi lunas
- Piutang = total tagihan belum lunas/sebagian bayar dikurangi `paidAmount`
- Modal layanan = total `cost * quantity`
- Laba kotor = pendapatan bersih - modal layanan
- Laba bersih = pendapatan bersih - modal layanan - pengeluaran
