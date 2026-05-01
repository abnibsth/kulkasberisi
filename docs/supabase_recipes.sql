create table if not exists public.recipes (
  id uuid primary key,
  user_id uuid not null,
  name text not null,
  description text not null,
  prep_time integer not null,
  cook_time integer not null,
  servings integer not null,
  difficulty text not null,
  calories integer,
  instructions jsonb not null,
  ingredients jsonb,
  image_url text,
  source text,
  match_percentage integer,
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_id_created_at_idx on public.recipes (user_id, created_at desc);

alter table public.recipes enable row level security;

create policy "recipes_select_own" on public.recipes
for select
using (auth.uid() = user_id);

create policy "recipes_insert_own" on public.recipes
for insert
with check (auth.uid() = user_id);

create policy "recipes_update_own" on public.recipes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "recipes_delete_own" on public.recipes
for delete
using (auth.uid() = user_id);

