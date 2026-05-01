create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  display_name text,
  role text,
  rating integer not null check (rating >= 1 and rating <= 5),
  message text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists reviews_is_public_created_at_idx on public.reviews (is_public, created_at desc);
create index if not exists reviews_user_id_created_at_idx on public.reviews (user_id, created_at desc);

alter table public.reviews enable row level security;

create policy "reviews_select_public" on public.reviews
for select
using (is_public = true);

create policy "reviews_insert_own" on public.reviews
for insert
with check (auth.uid() = user_id);

create policy "reviews_delete_own" on public.reviews
for delete
using (auth.uid() = user_id);

