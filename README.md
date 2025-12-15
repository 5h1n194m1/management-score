# Management Score (Vue 3 + Vite + Supabase)

Proyek ini adalah aplikasi manajemen skor berbasis Vue 3 yang menggunakan Supabase sebagai backend untuk autentikasi dan database.

## Setup
- Node 18+ dan npm
- Buat file `.env.local` berdasarkan `.env.example`:
  - `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
- Jalankan:
  - `npm install`
  - `npm run dev`

## Integrasi Supabase
- Klien di `src/supabaseClient.js` dengan opsi `persistSession` dan `autoRefreshToken`.
- Status autentikasi tersinkronisasi ke Pinia melalui `src/services/authListener.js` yang diinisialisasi di `src/main.js`.
- Store: `src/stores/auth.js` menyimpan `userData` dan `isLoggedIn`.

## RLS (Row Level Security)
Aktifkan RLS untuk semua tabel dan tambahkan policy yang sesuai.

Contoh tabel publik baca-only (mis. `scores` untuk leaderboard):
```sql
-- Aktifkan RLS
alter table public.scores enable row level security;

-- Izinkan semua pengguna (termasuk anonim) melakukan SELECT
create policy "public read scores"
on public.scores
for select
to anon
using (true);
```

Contoh tabel `events` baca oleh semua, tulis hanya oleh role admin:
```sql
alter table public.events enable row level security;

-- Baca publik
create policy "public read events"
on public.events
for select
to anon
using (true);

-- Tulis oleh admin (misal custom claim 'role' pada user_metadata)
create policy "admin write events"
on public.events
for all
to authenticated
using (coalesce((auth.jwt() ->> 'role') = 'admin', false))
with check (coalesce((auth.jwt() ->> 'role') = 'admin', false));
```

Pastikan Anda tidak pernah menggunakan `service_role` key di frontend.

## Skrip
- `npm run dev` menjalankan server pengembangan
- `npm run build` membangun produksi
- `npm run preview` meninjau build

## Catatan
- Router guard menggunakan Pinia `isLoggedIn` melalui listener Supabase.
- Login via `src/views/LoginView.vue`; logout via `AppLayout.vue`.
