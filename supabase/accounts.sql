-- Jalankan SETELAH 3 user dibuat di Authentication > Users > Add user (centang "Auto Confirm User"):
--   max@mufitsalesdesk.com, rinaldi@mufitsalesdesk.com, emilia@mufitsalesdesk.com

-- 1. Peran tiap akun + username untuk login
insert into public.profiles (user_id, username, name, role)
select id, 'maxwell', 'Max', 'owner' from auth.users where email = 'max@mufitsalesdesk.com'
on conflict (user_id) do update set username = excluded.username, name = excluded.name, role = excluded.role;

insert into public.profiles (user_id, username, name, role)
select id, 'rinaldi', 'Rinaldi', 'boss' from auth.users where email = 'rinaldi@mufitsalesdesk.com'
on conflict (user_id) do update set username = excluded.username, name = excluded.name, role = excluded.role;

insert into public.profiles (user_id, username, name, role)
select id, 'emilia', 'Emilia', 'boss' from auth.users where email = 'emilia@mufitsalesdesk.com'
on conflict (user_id) do update set username = excluded.username, name = excluded.name, role = excluded.role;

-- 2. Supaya layar login bisa mencari email dari username (mis. "maxwell" -> max@mufitsalesdesk.com)
create or replace function public.login_email(u text) returns text
language sql stable security definer set search_path = public, auth as $$
  select au.email from public.profiles p join auth.users au on au.id = p.user_id
  where lower(p.username) = lower(u) limit 1
$$;
grant execute on function public.login_email(text) to anon, authenticated;

-- 3. Cek hasilnya: harus muncul 3 baris
select username, name, role from public.profiles order by role desc, username;
