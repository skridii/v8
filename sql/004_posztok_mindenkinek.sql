-- IRONLOG – a posztok MINDEN jóváhagyott tagnak látszanak (nem csak annak, aki a szerző naplóját is látja)
-- Futtatás: Supabase dashboard → SQL Editor → New query → ezt az egészet bemásolni → Run.
-- FELTÉTEL: a 002 és a 003 már le van futtatva. Többször is lefuttatható, adatot nem töröl.
--
-- Mi változik:
--  • a posztokat, a hozzászólásokat és a lájkokat minden jóváhagyott tag látja és írhatja (a posztot a szerzője rakta ki, ezért nyilvános a tagoknak);
--  • a képeket (poszt-képek, profilképek) minden jóváhagyott tag letöltheti – kívülállók továbbra sem;
--  • új függvény: feed_authors() – a tagok neve és profilképe a falhoz (akkor is, ha valaki nem osztja meg a naplóját).
-- Az edzésnapló (user_state) láthatósága NEM változik.

drop policy if exists feed_posts_select on public.feed_posts;
create policy feed_posts_select on public.feed_posts for select to authenticated
  using (public.feed_member());

drop policy if exists feed_comments_select on public.feed_comments;
create policy feed_comments_select on public.feed_comments for select to authenticated
  using (public.feed_member());
drop policy if exists feed_comments_insert on public.feed_comments;
create policy feed_comments_insert on public.feed_comments for insert to authenticated
  with check (user_id = auth.uid() and public.feed_member());

drop policy if exists feed_likes_select on public.feed_likes;
create policy feed_likes_select on public.feed_likes for select to authenticated
  using (public.feed_member());
drop policy if exists feed_likes_insert on public.feed_likes;
create policy feed_likes_insert on public.feed_likes for insert to authenticated
  with check (user_id = auth.uid() and public.feed_member());

drop policy if exists ironlog_read on storage.objects;
create policy ironlog_read on storage.objects for select to authenticated
  using (bucket_id = 'ironlog' and public.feed_member());

-- a tagok neve + profilképe (csak jóváhagyott tag kérdezheti le, és csak jóváhagyott tagokat ad vissza)
create or replace function public.feed_authors()
returns table (id uuid, display_name text, avatar_path text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_path
  from public.profiles p
  where public.feed_member() and p.approved
$$;
grant execute on function public.feed_authors() to authenticated;

notify pgrst, 'reload schema';
