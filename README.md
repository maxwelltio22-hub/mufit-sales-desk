# MUFIT Sales Desk (versi website)

Website Sales Desk dengan login username/password, di-host di Netlify, data di Supabase.

- `src/app.html`: aplikasi (sama dengan versi Claude).
- `src/shim.js`, `src/shim.css`: login + penghubung ke Supabase.
- `build.py`: menggabungkan semuanya menjadi `site/index.html` (Netlify menjalankannya otomatis).
- `site/config.js`: alamat dan anon key Supabase.
- `supabase/schema.sql`: tabel dan aturan akses. `supabase/accounts.sql`: peran 3 akun.

Peran: `owner` (Max) melihat dan mengubah semua. `boss` (atasan) hanya melihat tab Tugas Max dan Ringkasan sales, dan hanya bisa menambah tugas.
