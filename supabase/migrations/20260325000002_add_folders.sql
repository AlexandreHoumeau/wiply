-- supabase/migrations/20260325000002_add_folders.sql

create table folders (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table folders enable row level security;

create policy "agency members can read their folders"
  on folders for select
  using (agency_id in (select agency_id from profiles where id = auth.uid()));

create policy "agency members can insert folders"
  on folders for insert
  with check (agency_id in (select agency_id from profiles where id = auth.uid()));

create policy "agency members can update their folders"
  on folders for update
  using (agency_id in (select agency_id from profiles where id = auth.uid()));

create policy "agency members can delete their folders"
  on folders for delete
  using (agency_id in (select agency_id from profiles where id = auth.uid()));

-- Add folder_id to files. NULL = root (no folder).
-- on delete set null: deleting a folder moves its files to root automatically.
alter table files add column folder_id uuid references folders(id) on delete set null;

create index on folders (agency_id);
create index on files (folder_id);
