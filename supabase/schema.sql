-- MUFIT Sales Desk: database di Supabase
-- Jalankan sekali di Supabase > SQL Editor.

-- 1. Semua data aplikasi disimpan sebagai dokumen: (collection, id) -> data JSON
create table if not exists public.docs (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

-- 2. Peran tiap akun: 'owner' (Max) atau 'boss' (atasan)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null default '',
  role text not null check (role in ('owner','boss'))
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid()
$$;

alter table public.docs enable row level security;
alter table public.profiles enable row level security;

-- Semua akun yang login (Max + atasan) bisa membaca
drop policy if exists docs_read on public.docs;
create policy docs_read on public.docs for select to authenticated using (public.my_role() is not null);

-- Max bisa mengubah semua data
drop policy if exists docs_owner_write on public.docs;
create policy docs_owner_write on public.docs for all to authenticated
  using (public.my_role() = 'owner') with check (public.my_role() = 'owner');

-- Atasan hanya bisa menambah/mengubah/menghapus tugas untuk Max
drop policy if exists docs_boss_tasks on public.docs;
create policy docs_boss_tasks on public.docs for all to authenticated
  using (public.my_role() = 'boss' and collection = 'bossTasks')
  with check (public.my_role() = 'boss' and collection = 'bossTasks');

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (public.my_role() is not null);

-- Realtime: perubahan langsung muncul di semua layar
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
