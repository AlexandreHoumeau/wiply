-- supabase/migrations/20260330_demo_campaigns.sql
create table demo_campaigns (
  code        text primary key,
  demo_days   integer not null,
  active      boolean not null default true,
  expires_at  timestamptz,
  max_uses    integer,
  uses_count  integer not null default 0
);

-- Disable RLS — only accessed server-side via service role
alter table demo_campaigns enable row level security;
create policy "service role only" on demo_campaigns
  using (false);

-- Seed a first campaign
insert into demo_campaigns (code, demo_days, active)
values ('spring25', 14, true);

create or replace function increment_campaign_uses(campaign_code text)
returns void language plpgsql security definer as $$
begin
  update demo_campaigns
  set uses_count = uses_count + 1
  where code = campaign_code;
end;
$$;
