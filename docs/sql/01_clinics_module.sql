-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ENUMS
do $$ begin
    create type public.whatsapp_permission_type as enum ('ignore', 'warn', 'execute');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.staff_role_type as enum ('assistant', 'receptionist', 'accounting', 'manager', 'other');
exception
    when duplicate_object then null;
end $$;

-- 2. CLINICS
create table if not exists public.clinics (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    commercial_name text not null,
    legal_name text,
    nif text unique,
    email text,
    phone text,
    logo_url text,
    website text,
    hq_address text,
    hq_zip_code text,
    hq_city text,
    hq_country text default 'Portugal',
    hq_maps_link text,
    whatsapp_permission whatsapp_permission_type default 'execute',
    is_active boolean default true
);

-- 3. CLINIC CONTACTS
create table if not exists public.clinic_contacts (
    id uuid default gen_random_uuid() primary key,
    clinic_id uuid not null references public.clinics(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    description text not null,
    contact text not null
);

-- 4. DELIVERY POINTS
create table if not exists public.clinic_delivery_points (
    id uuid default gen_random_uuid() primary key,
    clinic_id uuid not null references public.clinics(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    address text,
    zip_code text,
    city text,
    maps_link text,
    distance_km numeric,
    is_hq boolean default false
);

-- 5. STAFF
create table if not exists public.clinic_staff (
    id uuid default gen_random_uuid() primary key,
    clinic_id uuid not null references public.clinics(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    role staff_role_type default 'assistant',
    phone text,
    email text
);

-- 6. DISCOUNTS
create table if not exists public.clinic_discounts (
    id uuid default gen_random_uuid() primary key,
    clinic_id uuid not null references public.clinics(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    value numeric not null,
    is_percentage boolean default true,
    scope text check (scope in ('global', 'specific')),
    target_product_ids text[]
);

-- 7. ORG SETTINGS
create table if not exists public.organization_settings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    setting_key text unique not null,
    hq_maps_link text,
    hq_coordinates text,
    cost_per_km numeric default 0.36
);

-- 8. RLS
alter table public.clinics enable row level security;
alter table public.clinic_contacts enable row level security;
alter table public.clinic_delivery_points enable row level security;
alter table public.clinic_staff enable row level security;
alter table public.clinic_discounts enable row level security;
alter table public.organization_settings enable row level security;

-- 9. POLICIES
create policy "Enable all access for authenticated users" on public.clinics for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.clinic_contacts for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.clinic_delivery_points for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.clinic_staff for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.clinic_discounts for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.organization_settings for all to authenticated using (true) with check (true);

-- 10. SEED
insert into public.organization_settings (setting_key, cost_per_km)
values ('main_config', 0.36)
on conflict (setting_key) do nothing;
