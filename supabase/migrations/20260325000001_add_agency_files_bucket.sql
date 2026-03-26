-- supabase/migrations/20260325000001_add_agency_files_bucket.sql
-- Creates the agency-files storage bucket and its RLS policies.
-- Separated from the files table migration because db push had already applied
-- that migration before bucket creation was added to it.

insert into storage.buckets (id, name, public)
values ('agency-files', 'agency-files', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'agency members can upload files'
  ) then
    execute $pol$
      create policy "agency members can upload files"
        on storage.objects for insert
        to authenticated
        with check (
          bucket_id = 'agency-files'
          and (storage.foldername(name))[1] in (
            select agency_id::text from profiles where id = auth.uid()
          )
        )
    $pol$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'agency members can read files'
  ) then
    execute $pol$
      create policy "agency members can read files"
        on storage.objects for select
        to authenticated
        using (
          bucket_id = 'agency-files'
          and (storage.foldername(name))[1] in (
            select agency_id::text from profiles where id = auth.uid()
          )
        )
    $pol$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'agency members can delete files'
  ) then
    execute $pol$
      create policy "agency members can delete files"
        on storage.objects for delete
        to authenticated
        using (
          bucket_id = 'agency-files'
          and (storage.foldername(name))[1] in (
            select agency_id::text from profiles where id = auth.uid()
          )
        )
    $pol$;
  end if;
end $$;
