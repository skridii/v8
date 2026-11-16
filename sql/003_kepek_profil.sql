-- IRONLOG – Képek a posztokban + profilkép
-- Futtatás: Supabase dashboard → SQL Editor → New query → ezt az egészet bemásolni → Run.
-- FELTÉTEL: a 002_kozossegi_fal.sql már le van futtatva. Többször is lefuttatható.

-- 1) a poszthoz tartozó kép (a tárhelyen lévő fájl útvonala) és a profilkép útvonala
alter table public.feed_posts add column if not exists photo text check (photo is null or char_length(photo) <= 200);
alter table public.profiles add column if not exists avatar_path text;

-- a profilkép beállítása csak a saját profilra, csak a saját mappából
create or replace function public.set_my_avatar(p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if p_path is not null and p_path not like auth.uid()::text || '/%' then raise exception 'bad path'; end if;
  update public.profiles set avatar_path = p_path where id = auth.uid();
end $$;
grant execute on function public.set_my_avatar(text) to authenticated;

-- 2) privát tárhely a képeknek (NEM nyilvános: csak bejelentkezett, jóváhagyott tag tölthet le,
--    és csak annak a képeit, akinek a naplóját is láthatja). Mappák: <felhasználó-id>/posts/…, <felhasználó-id>/avatar-….jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ironlog', 'ironlog', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ironlog_read on storage.objects;
create policy ironlog_read on storage.objects for select to authenticated
  using (bucket_id = 'ironlog' and public.feed_member() and public.feed_can_see(((storage.foldername(name))[1])::uuid));
drop policy if exists ironlog_insert on storage.objects;
create policy ironlog_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ironlog' and (storage.foldername(name))[1] = auth.uid()::text and public.feed_member());
drop policy if exists ironlog_update on storage.objects;
create policy ironlog_update on storage.objects for update to authenticated
  using (bucket_id = 'ironlog' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists ironlog_delete on storage.objects;
create policy ironlog_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ironlog' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
