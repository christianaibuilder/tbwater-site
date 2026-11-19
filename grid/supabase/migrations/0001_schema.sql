-- Grid platform schema. Run in the Supabase SQL editor, then 0002_policies.sql.
-- Postgres 15+. All money is numeric(12,2) in dollars; cents live only inside Stripe calls.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- categories (verticals)
create table if not exists public.categories (
  id               text primary key,                 -- 'marine', 'golf_cart', 'rv', 'auto'
  name             text not null,
  brand_name       text,
  site_url         text,
  phone            text,
  email            text,
  status           text not null default 'locked' check (status in ('locked','active','paused')),
  unlock_rule      jsonb not null default '{}'::jsonb,
  services         jsonb not null default '[]'::jsonb,
  equipment_brands jsonb not null default '[]'::jsonb,
  default_tax_rate numeric(6,4) not null default 0.0700,
  service_area     jsonb not null default '{}'::jsonb,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- techs (contractors)
create table if not exists public.techs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete set null,
  category_ids         text[] not null default '{}',
  business_name        text not null,
  contact_name         text,
  phone                text,
  email                text,
  home_zip             text,
  service_zips         text[] not null default '{}',
  service_radius_miles numeric(5,1),
  lat                  numeric(9,6),
  lng                  numeric(9,6),
  specialties          text[] not null default '{}',
  brands               text[] not null default '{}',
  certifications       text[] not null default '{}',
  years_experience     int,
  hourly_rate          numeric(8,2),
  trip_fee             numeric(8,2),
  insurance_carrier    text,
  insurance_expires    date,
  coi_path             text,
  w9_path              text,
  btr_number           text,
  payout_method        text not null default 'ach_manual'
                       check (payout_method in ('stripe_connect','ach_manual','zelle','check')),
  payout_details       jsonb not null default '{}'::jsonb,   -- masked bank/zelle info, admin only
  stripe_account_id    text,
  status               text not null default 'applied'
                       check (status in ('applied','approved','paused','rejected')),
  agreement_version    text,
  agreement_signed_at  timestamptz,
  rating               numeric(3,2),
  jobs_completed       int not null default 0,
  gmv_total            numeric(12,2) not null default 0,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists techs_status_idx on public.techs (status);
create index if not exists techs_zips_idx on public.techs using gin (service_zips);

-- ---------------------------------------------------------------- profiles (login → role)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'tech' check (role in ('admin','tech')),
  tech_id    uuid references public.techs(id) on delete set null,
  full_name  text,
  email      text,
  phone      text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- tech applications (public form)
create table if not exists public.tech_applications (
  id               uuid primary key default gen_random_uuid(),
  category_id      text not null references public.categories(id),
  business_name    text not null,
  contact_name     text not null,
  phone            text not null,
  email            text not null,
  home_zip         text,
  service_area_text text,
  specialties      text[] not null default '{}',
  brands           text[] not null default '{}',
  years_experience int,
  has_insurance    boolean,
  insurance_carrier text,
  notes            text,
  agreement_accepted boolean not null default false,
  status           text not null default 'new' check (status in ('new','contacted','approved','rejected')),
  tech_id          uuid references public.techs(id),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- leads (jobs)
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  category_id       text not null references public.categories(id),
  source            text not null default 'site',
  customer_name     text not null,
  phone             text not null,
  email             text,
  address           text,
  city              text,
  zip               text,
  county            text,
  lat               numeric(9,6),
  lng               numeric(9,6),
  equipment         jsonb not null default '{}'::jsonb,
  service_slug      text,
  description       text,
  photos            text[] not null default '{}',
  urgency           text not null default 'this_week' check (urgency in ('asap','this_week','flexible')),
  sms_consent       boolean not null default false,
  status            text not null default 'new' check (status in
                    ('new','contacted','approved','offered','assigned','quoted','scheduled',
                     'in_progress','completed','paid','dead')),
  assigned_tech_id  uuid references public.techs(id),
  first_response_at timestamptz,
  scheduled_at      timestamptz,
  estimated_value   numeric(12,2),
  lost_reason       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_cat_created_idx on public.leads (category_id, created_at desc);
create index if not exists leads_tech_idx on public.leads (assigned_tech_id);

-- ---------------------------------------------------------------- lead events (timeline, XP source)
create table if not exists public.lead_events (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  type       text not null,   -- created, call, text, note, status, offer, accepted, declined,
                              -- quote_sent, quote_accepted, invoice_uploaded, invoice_sent, paid, payout
  actor      text not null default 'admin',  -- 'admin' | 'tech:<uuid>' | 'system' | 'customer'
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at);
create index if not exists lead_events_type_idx on public.lead_events (type, created_at);

-- ---------------------------------------------------------------- dispatch offers
create table if not exists public.dispatch_offers (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  tech_id      uuid not null references public.techs(id) on delete cascade,
  status       text not null default 'offered' check (status in ('offered','accepted','declined','expired','withdrawn')),
  offered_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 minutes',
  responded_at timestamptz,
  note         text,
  unique (lead_id, tech_id)
);
create index if not exists offers_tech_status_idx on public.dispatch_offers (tech_id, status);

-- ---------------------------------------------------------------- quotes
create table if not exists public.quotes (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads(id) on delete cascade,
  tech_id          uuid references public.techs(id),
  line_items       jsonb not null default '[]'::jsonb,  -- [{description, qty, unit_price, taxable, kind}]
  subtotal         numeric(12,2) not null default 0,
  tax_rate         numeric(6,4) not null default 0,
  tax              numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  deposit_required numeric(12,2),
  status           text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  valid_until      date,
  public_token     text not null unique default encode(gen_random_bytes(16), 'hex'),
  sent_at          timestamptz,
  accepted_at      timestamptz,
  customer_note    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists quotes_lead_idx on public.quotes (lead_id);
create index if not exists quotes_tech_idx on public.quotes (tech_id, status);

-- ---------------------------------------------------------------- invoices
create table if not exists public.invoices (
  id                     uuid primary key default gen_random_uuid(),
  lead_id                uuid not null references public.leads(id) on delete cascade,
  tech_id                uuid not null references public.techs(id),
  quote_id               uuid references public.quotes(id),
  file_path              text,
  extracted              jsonb,
  line_items             jsonb not null default '[]'::jsonb,
  subtotal               numeric(12,2) not null default 0,
  tax                    numeric(12,2) not null default 0,
  total                  numeric(12,2) not null default 0,
  status                 text not null default 'uploaded' check (status in
                         ('uploaded','review','approved','sent','processing','paid','void')),
  payment_link_url       text,
  payment_link_card_url  text,
  stripe_session_id      text,
  stripe_payment_intent  text,
  paid_at                timestamptz,
  paid_amount            numeric(12,2),
  payment_method         text check (payment_method in ('ach','card','cash','check','other')),
  platform_fee_pct       numeric(5,2) not null default 10,
  platform_fee_min       numeric(8,2) not null default 25,
  platform_fee_amount    numeric(12,2),
  processing_fee_amount  numeric(12,2),
  card_fee_pct           numeric(5,2) not null default 3,
  card_fee_charged       numeric(12,2) not null default 0,
  tech_share_amount      numeric(12,2),
  public_token           text not null unique default encode(gen_random_bytes(16), 'hex'),
  sent_at                timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_tech_idx on public.invoices (tech_id, status);

-- ---------------------------------------------------------------- payouts
create table if not exists public.payouts (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  tech_id    uuid not null references public.techs(id),
  amount     numeric(12,2) not null,
  method     text not null default 'ach_manual' check (method in ('stripe_connect','ach_manual','zelle','check')),
  status     text not null default 'owed' check (status in ('owed','scheduled','paid','failed')),
  paid_at    timestamptz,
  reference  text,
  tax_year   int not null default extract(year from now())::int,
  created_at timestamptz not null default now()
);
create index if not exists payouts_tech_idx on public.payouts (tech_id, status);

-- ---------------------------------------------------------------- settings, achievements, outbox
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  key         text primary key,
  unlocked_at timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null check (channel in ('email','sms')),
  to_addr    text not null,
  subject    text,
  body       text not null,
  ref_type   text,
  ref_id     uuid,
  status     text not null default 'queued' check (status in ('queued','sent','failed')),
  error      text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists techs_updated on public.techs;
create trigger techs_updated before update on public.techs for each row execute function public.set_updated_at();
drop trigger if exists leads_updated on public.leads;
create trigger leads_updated before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists quotes_updated on public.quotes;
create trigger quotes_updated before update on public.quotes for each row execute function public.set_updated_at();
drop trigger if exists invoices_updated on public.invoices;
create trigger invoices_updated before update on public.invoices for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- 1099 helper view
create or replace view public.tech_ytd_paid
with (security_invoker = true) as
select tech_id, tax_year, sum(amount) as paid, count(*) as payouts
from public.payouts
where status = 'paid'
group by tech_id, tax_year;

-- ---------------------------------------------------------------- default settings
insert into public.settings (key, value) values
  ('platform_fee_pct',   '10'),
  ('platform_fee_min',   '25'),
  ('card_fee_pct',       '3'),
  ('speed_sla_minutes',  '5'),
  ('offer_expiry_minutes','30'),
  ('payout_rail',        '"ach_manual"'),
  ('county_tax_rates',   '{"Pinellas":0.07,"Hillsborough":0.075,"Pasco":0.07,"Manatee":0.07,"Hernando":0.065}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------- explicit grants
-- Supabase (since Oct 2026) requires explicit grants for the Data API; RLS (0002) narrows them.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.categories to anon;
grant insert on public.leads, public.tech_applications to anon;
grant select on public.tech_ytd_paid to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
