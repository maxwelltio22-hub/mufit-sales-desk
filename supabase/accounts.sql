-- Jalankan SETELAH membuat 3 user di Supabase > Authentication > Users > Add user
-- (centang "Auto Confirm User"). Email-nya: max@mufitsalesdesk.com, atasan1@mufitsalesdesk.com, atasan2@mufitsalesdesk.com
-- Ganti nama atasan di bawah sesuai nama asli.
insert into public.profiles (user_id, username, name, role)
select id, 'max', 'Max', 'owner' from auth.users where email = 'max@mufitsalesdesk.com'
on conflict (user_id) do update set role = excluded.role, name = excluded.name;
insert into public.profiles (user_id, username, name, role)
select id, 'atasan1', 'Atasan 1', 'boss' from auth.users where email = 'atasan1@mufitsalesdesk.com'
on conflict (user_id) do update set role = excluded.role, name = excluded.name;
insert into public.profiles (user_id, username, name, role)
select id, 'atasan2', 'Atasan 2', 'boss' from auth.users where email = 'atasan2@mufitsalesdesk.com'
on conflict (user_id) do update set role = excluded.role, name = excluded.name;
