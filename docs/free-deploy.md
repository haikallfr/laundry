# Deploy Gratis

Stack gratis yang dipakai:

- Vercel Free untuk hosting Next.js.
- Supabase Free untuk menyimpan data aplikasi.

## Supabase

Buat tabel berikut di Supabase SQL editor:

```sql
create table if not exists public.app_store (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
```

Environment variable yang harus ada di Vercel:

```env
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key
# Fallback jika service role key tidak tersedia:
SUPABASE_ANON_KEY=anon-key
SUPABASE_STORE_TABLE=app_store
APP_STORE_KEY=default
JWT_SECRET=ganti-dengan-secret-minimal-32-karakter
```

`SUPABASE_SERVICE_ROLE_KEY` atau `SUPABASE_ANON_KEY` hanya dipakai di server. Jangan memakai prefix `NEXT_PUBLIC_`.
