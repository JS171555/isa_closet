-- ISA CLOSET — SUPABASE PRODUCTION SETUP
-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- Depois crie o usuário administrador em Authentication > Users e execute
-- a instrução final para promovê-lo a administrador.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Conjuntos',
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  promo numeric(12,2) null check (promo is null or (promo >= 0 and promo <= price)),
  sizes text[] not null default '{}',
  images jsonb not null default '[]'::jsonb,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key check (id = 1),
  store_name text not null default 'Isa Closet',
  whatsapp text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id, store_name, whatsapp)
values (1, 'Isa Closet', '')
on conflict (id) do nothing;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists products_active_order_idx on public.products (active, display_order, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users enable row level security;

-- Products: público só enxerga produtos ativos; administrador tem CRUD completo.
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
on public.products for select
to anon, authenticated
using (active = true or (select public.is_admin()));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products for delete
to authenticated
using ((select public.is_admin()));

-- Settings: clientes só precisam ler nome/WhatsApp; somente admin pode alterar.
drop policy if exists "Public can view store settings" on public.store_settings;
create policy "Public can view store settings"
on public.store_settings for select
to anon, authenticated
using (id = 1 or (select public.is_admin()));

drop policy if exists "Admins can update store settings" on public.store_settings;
create policy "Admins can update store settings"
on public.store_settings for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- A tabela admin_users não fica disponível para leitura pública.
drop policy if exists "Admins can view admin users" on public.admin_users;
create policy "Admins can view admin users"
on public.admin_users for select
to authenticated
using ((select public.is_admin()));

-- Grants explícitos de menor privilégio.
revoke all on table public.products from anon, authenticated;
revoke all on table public.store_settings from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;

grant select on public.products to anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;
grant select on public.admin_users to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Storage: download público; upload/alteração/exclusão somente para administradores.
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()))
with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()));

-- Depois de criar o usuário em Authentication > Users:
-- substitua o e-mail e execute:
-- insert into public.admin_users (user_id, email)
-- select id, email from auth.users where lower(email) = lower('admin@seudominio.com')
-- on conflict (user_id) do nothing;
