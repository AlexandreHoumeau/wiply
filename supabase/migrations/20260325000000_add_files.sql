-- supabase/migrations/20260325000000_add_files.sql

-- ─── files ──────────────────────────────────────────────────────────────────

create type file_type as enum ('upload', 'link');

create table files (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies(id) on delete cascade,
  project_id    uuid references projects(id) on delete cascade,
  type          file_type not null,
  name          text not null,
  storage_path  text,
  url           text,
  size          bigint,
  mime_type     text,
  uploaded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- uploads must have storage_path; links must have url; never both
alter table files add constraint files_upload_has_path
  check (type != 'upload' or storage_path is not null);
alter table files add constraint files_link_has_url
  check (type != 'link' or url is not null);
alter table files add constraint files_upload_no_url
  check (type != 'upload' or url is null);

-- RLS: read/write scoped to agency_id only
alter table files enable row level security;

create policy "agency members can read their files"
  on files for select
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "agency members can insert files"
  on files for insert
  with check (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "agency members can update their files"
  on files for update
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "agency members can delete their files"
  on files for delete
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

-- ─── task_files ──────────────────────────────────────────────────────────────

create table task_files (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  file_id     uuid not null references files(id) on delete cascade,
  linked_by   uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (task_id, file_id)
);

-- RLS for task_files
alter table task_files enable row level security;

-- SELECT: users can read task_files rows when task belongs to their agency
create policy "agency members can read task_files"
  on task_files for select
  using (
    task_id in (
      select id from tasks where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

-- INSERT: users can insert task_files rows when task belongs to their agency
create policy "agency members can insert task_files"
  on task_files for insert
  with check (
    task_id in (
      select id from tasks where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

-- DELETE: users can delete task_files rows when task belongs to their agency
create policy "agency members can delete task_files"
  on task_files for delete
  using (
    task_id in (
      select id from tasks where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

-- ─── Storage ─────────────────────────────────────────────────────────────────
-- NOTE: The 'agency-files' bucket (private) must be created separately via:
--   npx supabase storage create agency-files --no-public
-- Path convention:
--   Project files:      {agency_id}/{project_id}/{file_id}
--   Agency-wide files:  {agency_id}/workspace/{file_id}
