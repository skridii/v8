-- IRONLOG – Közösségi fal (posztok, hozzászólások, lájkok)
-- Futtatás: Supabase dashboard → SQL Editor → New query → ezt az egészet bemásolni → Run.
-- Többször is lefuttatható (nem töröl adatot).
--
-- Láthatóság: pontosan az láthatja egy tag posztjait / az edzései alatti hozzászólásokat,
-- aki az edzésnaplóját (user_state) is láthatja – vagyis ugyanaz a szabály, mint a Barátok oldalon
-- (jóváhagyott tag, bekapcsolt megosztás). Ezt a user_state saját sorszintű védelme (RLS) dönti el.

create extension if not exists pgcrypto;

-- jóváhagyott tag-e a bejelentkezett felhasználó
create or replace function public.feed_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved)
$$;

-- láthatja-e a bejelentkezett felhasználó a megadott tag dolgait (saját maga, vagy látja a naplóját)
-- FIGYELEM: szándékosan NEM security definer, hogy a user_state saját RLS-e döntsön.
create or replace function public.feed_can_see(owner uuid) returns boolean
language sql stable set search_path = public as $$
  select owner = auth.uid() or exists (select 1 from public.user_state us where us.user_id = owner)
$$;

-- 1) Posztok (szöveg, opcionálisan egy saját edzés csatolva: workout = {"key": "ciklus-hét-nap"})
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  workout jsonb,
  created_at timestamptz not null default now()
);
create index if not exists feed_posts_created_idx on public.feed_posts (created_at desc);

-- 2) Hozzászólások: egy tag egy edzése ('w:ciklus-hét-nap') vagy egy poszt ('p:<id>') alá
create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  target_user uuid not null references auth.users(id) on delete cascade,
  target_key text not null check (char_length(target_key) between 3 and 80),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists feed_comments_target_idx on public.feed_comments (target_user, target_key);
create index if not exists feed_comments_created_idx on public.feed_comments (created_at desc);

-- 3) Lájkok (egy tag egyszer lájkolhat egy dolgot)
create table if not exists public.feed_likes (
  target_user uuid not null references auth.users(id) on delete cascade,
  target_key text not null check (char_length(target_key) between 3 and 80),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (target_user, target_key, user_id)
);

alter table public.feed_posts enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_likes enable row level security;

-- posztok
drop policy if exists feed_posts_select on public.feed_posts;
create policy feed_posts_select on public.feed_posts for select to authenticated
  using (public.feed_member() and public.feed_can_see(user_id));
drop policy if exists feed_posts_insert on public.feed_posts;
create policy feed_posts_insert on public.feed_posts for insert to authenticated
  with check (user_id = auth.uid() and public.feed_member());
drop policy if exists feed_posts_delete on public.feed_posts;
create policy feed_posts_delete on public.feed_posts for delete to authenticated
  using (user_id = auth.uid());

-- hozzászólások: aki látja a célpontot, az olvashat és írhat; törölni a szerző és a célpont gazdája tud
drop policy if exists feed_comments_select on public.feed_comments;
create policy feed_comments_select on public.feed_comments for select to authenticated
  using (public.feed_member() and public.feed_can_see(target_user));
drop policy if exists feed_comments_insert on public.feed_comments;
create policy feed_comments_insert on public.feed_comments for insert to authenticated
  with check (user_id = auth.uid() and public.feed_member() and public.feed_can_see(target_user));
drop policy if exists feed_comments_delete on public.feed_comments;
create policy feed_comments_delete on public.feed_comments for delete to authenticated
  using (user_id = auth.uid() or target_user = auth.uid());

-- lájkok
drop policy if exists feed_likes_select on public.feed_likes;
create policy feed_likes_select on public.feed_likes for select to authenticated
  using (public.feed_member() and public.feed_can_see(target_user));
drop policy if exists feed_likes_insert on public.feed_likes;
create policy feed_likes_insert on public.feed_likes for insert to authenticated
  with check (user_id = auth.uid() and public.feed_member() and public.feed_can_see(target_user));
drop policy if exists feed_likes_delete on public.feed_likes;
create policy feed_likes_delete on public.feed_likes for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.feed_posts, public.feed_comments, public.feed_likes to authenticated;
grant execute on function public.feed_member(), public.feed_can_see(uuid) to authenticated;

-- a PostgREST azonnal lássa az új táblákat
notify pgrst, 'reload schema';
