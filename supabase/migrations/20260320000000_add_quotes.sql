-- Create quotes table
create table quotes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  opportunity_id uuid references opportunities(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft',
  token text not null unique,
  valid_until date,
  currency text not null default 'EUR',
  discount_type text,
  discount_value numeric,
  tax_rate numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_status_check check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  constraint quotes_discount_type_check check (discount_type in ('percentage', 'fixed') or discount_type is null),
  constraint quotes_discount_invariant check (
    (discount_type is null and discount_value is null) or
    (discount_type is not null and discount_value is not null)
  )
);

-- Create quote_items table
create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  type text not null,
  label text not null,
  description text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  constraint quote_items_type_check check (type in ('fixed', 'hourly', 'expense'))
);

-- Indexes
create index quotes_agency_id_idx on quotes(agency_id);
create index quotes_token_idx on quotes(token);
create index quote_items_quote_id_idx on quote_items(quote_id);

-- RLS
alter table quotes enable row level security;
alter table quote_items enable row level security;

-- RLS policies for quotes (authenticated agency members)
create policy "Agency members can select their quotes"
  on quotes for select
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "Agency members can insert quotes"
  on quotes for insert
  with check (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "Agency members can update their quotes"
  on quotes for update
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "Agency members can delete their quotes"
  on quotes for delete
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

-- RLS policies for quote_items (via quote's agency_id)
create policy "Agency members can select their quote items"
  on quote_items for select
  using (
    quote_id in (
      select id from quotes where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

create policy "Agency members can insert quote items"
  on quote_items for insert
  with check (
    quote_id in (
      select id from quotes where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

create policy "Agency members can update their quote items"
  on quote_items for update
  using (
    quote_id in (
      select id from quotes where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

create policy "Agency members can delete their quote items"
  on quote_items for delete
  using (
    quote_id in (
      select id from quotes where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );
