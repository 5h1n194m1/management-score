# Management Score v3.0 – Blueprint Teknis

## Tujuan
- Sistem manajemen turnamen event-centric dengan kontrol akses kuat, konfigurasi fleksibel, dan live score realtime.

## Data Model (Supabase)
- `events(id, title, status[draft|live|completed], admin_id, created_at)`
- `pots(id, event_id, name, display_order, is_hidden, created_at)`
- `games(id, pot_id, game_number, screenshot_url, created_at)`
- `teams(id, event_id, name, members[text[]], created_at)`
- `team_pot_mapping(id, team_id, pot_id, is_finalist, created_at)`
- `raw_scores(id, game_id, team_id, rank, kill, p_rank, created_at)`
- `point_mapping(id, event_id, rank_position, points, created_at)`
- `profiles(id, username, is_admin, role, created_at)` terkait `auth.users`
- `event_settings(event_id, input_columns jsonb, hidden_action bool, sorting_mode text, allow_public_recaps bool, updated_at)`
- Views:
  - `v_scores_by_game`: join raw_scores + mapping poin rank
  - `v_pot_leaderboard`: agregasi per pot (total_points=sum(rank_points), total_kill)

## Batasan Skala
- Tim per event: maks 30
- Game per pot: maks 20
- Terapkan di service API saat create (atau trigger), bukan hard constraint agar fleksibel.

## RLS (Ringkas)
- Publik: hanya baca event `live/completed` dan data terkait (pots non-hidden, games, teams, mapping, leaderboard).
- Operator: boleh tulis `raw_scores` dan mengelola `team_pot_mapping`.
- Admin: CRUD penuh untuk master data (events, pots, teams, games, point_mapping, event_settings).
- Detail SQL: lihat `supabase/blueprint_v3.sql`.

## Realtime
- Aktifkan Realtime pada tabel `raw_scores`, `games`, `team_pot_mapping`.
- Channel: `postgres_changes` dengarkan INSERT/UPDATE/DELETE lalu refresh leaderboard front-end.

## Fungsi dan Automasi
- `ensure_grand_final_pot(event_id)`: membuat pot “GRAND FINAL” jika belum ada.
- `move_team_to_grand_final(event_id, team_id)`: memetakan tim ke pot grand final dengan `is_finalist=true`.
- `reset_scores_values(event_id)`: set rank/p_rank null dan kill=0 untuk semua skor event.
- `reset_all_data(event_id)`: hapus semua `raw_scores` untuk event.

## Penyimpanan Screenshot
- Bucket `screenshots`:
  - Path: `event/{event_id}/game_{game_number}/{uuid}.png`
  - Akses: publik-read atau signed-url; rekomendasi signed-url untuk kontrol.

## Endpoints (Edge Functions atau langsung Supabase client)
- `POST /events`: create event (admin)
- `PATCH /events/:id/status`: ubah status event (admin)
- `GET /events/public`: daftar event `live/completed` (publik)
- `POST /pots`: create pot (admin)
- `PATCH /pots/:id/hide`: toggle `is_hidden` (admin)
- `POST /teams`: tambah tim (admin)
- `POST /team-transfer/grand-final`: body `{event_id, team_id}` (operator/admin)
- `POST /games`: tambah game (admin)
- `POST /raw-scores/bulk`: insert bulk skor (operator/admin)
- `POST /settings/event`: set `event_settings` (admin)
- `POST /export/excel`: hasilkan file excel dengan header merged (server function)
- `GET /recap?event_id&pot_id`: halaman recap bersih (publik jika `allow_public_recaps=true`)

## Aturan Sortir
- Leaderboard pot:
  - Urutan: `total_points desc, total_kill desc, team_name asc`
  - `total_points` = sum(rank_points) dari mapping; kill hanya tie-breaker.

## UX Halaman
- Dashboard (landing): ringkasan event aktif, tombol Login/Logout.
- Halaman Event:
  - Split-screen: Panel kontrol (tambah/kurangi game/pot/tim, reset, transfer), Spreadsheet input.
  - Overlay screenshot: upload + resize/zoom, toggle tampil.
  - Checklist kolom input: `event_settings.input_columns`.
  - Hidden Action: sembunyikan kolom aksi via `event_settings.hidden_action`.
  - Pot visibility: `pots.is_hidden`.
  - Sorting toggle: UI memilih `points_then_kill` (default).
- Recap: halaman bersih, seleksi pot, opsi unduh Excel.

## Ekspor Excel
- Struktur header:
  - Kolom per game: merged cell `Game N` dengan sub-header `Rank | P. Rank | Kill`.
  - Baris tim dan total agregat.
- Implementasi:
  - Client-side (xlsx) atau Edge Function (Deno) yang menghasilkan stream.

## Kinerja
- Gunakan index yang disediakan.
- Hindari materialized view jika realtime diperlukan; gunakan view biasa.
- Pagination untuk daftar besar jika diperlukan.

## Keamanan
- Jangan pernah expose `service_role` di frontend.
- Verify JWT `role` via `has_role`/`has_any_role`.
- Views mengandalkan RLS tabel dasar.

