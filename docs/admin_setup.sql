-- ============================================================
-- Admin Setup: Tambah kolom yang dibutuhkan untuk admin panel
-- Jalankan ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uksucknmlisquakjsyef/sql/new
-- ============================================================

-- 1. Kolom moderasi untuk tabel recipes
alter table public.recipes
  add column if not exists status text not null default 'pending',
  add column if not exists is_approved boolean not null default false,
  add column if not exists rejected_reason text;

-- Index supaya query moderasi lebih cepat
create index if not exists recipes_status_idx on public.recipes (status);

-- 2. Kolom is_hidden untuk tabel reviews
alter table public.reviews
  add column if not exists is_hidden boolean not null default false;

-- Index supaya filter hidden reviews lebih cepat
create index if not exists reviews_is_hidden_idx on public.reviews (is_hidden);

-- 3. Tabel audit_logs untuk mencatat aksi admin (opsional tapi direkomendasikan)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_admin_id_idx on public.audit_logs (admin_id, created_at desc);

-- ============================================================
-- Selesai! Refresh halaman admin setelah menjalankan SQL ini.
-- ============================================================
