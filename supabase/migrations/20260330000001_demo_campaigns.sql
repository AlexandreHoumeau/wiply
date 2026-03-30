-- supabase/migrations/20260330000001_demo_campaigns.sql
create table demo_campaigns (
  code        text primary key,
  demo_days   integer not null,
  active      boolean not null default true,
  expires_at  timestamptz,
  max_uses    integer,
  uses_count  integer not null default 0 check (uses_count >= 0)
);

-- Enable RLS — accessible only via service role (which bypasses RLS)
alter table demo_campaigns enable row level security;
create policy "service role only" on demo_campaigns
  for all
  using (false)
  with check (false);

-- Seed a first campaign
insert into demo_campaigns (code, demo_days, active)
values ('spring25', 14, true);

create or replace function increment_campaign_uses(campaign_code text)
returns void language plpgsql
security definer
set search_path = public
as $$
begin
  update demo_campaigns
  set uses_count = uses_count + 1
  where code = campaign_code;
end;
$$;
