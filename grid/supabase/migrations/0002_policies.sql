-- Row-level security, roles, first-admin bootstrap, and public token RPCs.
-- Run after 0001_schema.sql.

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_tech_id() returns uuid
language sql stable security definer set search_path = public as $$
  select tech_id from public.profiles where id = auth.uid();
$$;

-- First person to sign in becomes admin. Later sign-ins become techs and are linked by email.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id, new.email,
    case when not exists (select 1 from public.profiles where role = 'admin') then 'admin' else 'tech' end
  )
  on conflict (id) do nothing;

  update public.techs t set user_id = new.id
  where t.user_id is null and lower(t.email) = lower(new.email);

  update public.profiles p set tech_id = t.id
  from public.techs t
  where p.id = new.id and p.tech_id is null and t.user_id = new.id;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Techs may edit their own row but not their status, rating, or counters.
create or replace function public.guard_tech_update() returns trigger
language plpgsql as $$
begin
  if not public.is_admin() then
    new.status := old.status;
    new.rating := old.rating;
    new.jobs_completed := old.jobs_completed;
    new.gmv_total := old.gmv_total;
    new.category_ids := old.category_ids;
    new.notes := old.notes;
    new.stripe_account_id := old.stripe_account_id;
  end if;
  return new;
end $$;
drop trigger if exists techs_guard on public.techs;
create trigger techs_guard before update on public.techs for each row execute function public.guard_tech_update();

-- ---------------------------------------------------------------- enable RLS
alter table public.categories        enable row level security;
alter table public.techs             enable row level security;
alter table public.profiles          enable row level security;
alter table public.tech_applications enable row level security;
alter table public.leads             enable row level security;
alter table public.lead_events       enable row level security;
alter table public.dispatch_offers   enable row level security;
alter table public.quotes            enable row level security;
alter table public.invoices          enable row level security;
alter table public.payouts           enable row level security;
alter table public.settings          enable row level security;
alter table public.achievements      enable row level security;
alter table public.notifications     enable row level security;

-- ---------------------------------------------------------------- admin: everything
do $$
declare t text;
begin
  foreach t in array array['categories','techs','profiles','tech_applications','leads','lead_events',
                           'dispatch_offers','quotes','invoices','payouts','settings','achievements','notifications']
  loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- public (anon) access
drop policy if exists anon_read_active_categories on public.categories;
create policy anon_read_active_categories on public.categories
  for select to anon using (status = 'active');

drop policy if exists anon_insert_lead on public.leads;
create policy anon_insert_lead on public.leads
  for insert to anon
  with check (
    status = 'new'
    and assigned_tech_id is null
    and exists (select 1 from public.categories c where c.id = category_id and c.status = 'active')
  );

drop policy if exists anon_insert_application on public.tech_applications;
create policy anon_insert_application on public.tech_applications
  for insert to anon
  with check (status = 'new' and exists (select 1 from public.categories c where c.id = category_id and c.status = 'active'));

-- ---------------------------------------------------------------- tech portal access
drop policy if exists tech_read_self on public.techs;
create policy tech_read_self on public.techs for select to authenticated using (id = public.my_tech_id());
drop policy if exists tech_update_self on public.techs;
create policy tech_update_self on public.techs for update to authenticated
  using (id = public.my_tech_id()) with check (id = public.my_tech_id());

drop policy if exists profile_read_self on public.profiles;
create policy profile_read_self on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists tech_read_categories on public.categories;
create policy tech_read_categories on public.categories for select to authenticated using (true);

drop policy if exists tech_offers on public.dispatch_offers;
create policy tech_offers on public.dispatch_offers for select to authenticated using (tech_id = public.my_tech_id());
drop policy if exists tech_offers_respond on public.dispatch_offers;
create policy tech_offers_respond on public.dispatch_offers for update to authenticated
  using (tech_id = public.my_tech_id()) with check (tech_id = public.my_tech_id());

-- Full lead visible only once assigned to this tech. Offered leads are read through the masked RPC below.
drop policy if exists tech_read_assigned_leads on public.leads;
create policy tech_read_assigned_leads on public.leads for select to authenticated using (assigned_tech_id = public.my_tech_id());
drop policy if exists tech_update_assigned_leads on public.leads;
create policy tech_update_assigned_leads on public.leads for update to authenticated
  using (assigned_tech_id = public.my_tech_id()) with check (assigned_tech_id = public.my_tech_id());

drop policy if exists tech_events on public.lead_events;
create policy tech_events on public.lead_events for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id and l.assigned_tech_id = public.my_tech_id()));
drop policy if exists tech_events_insert on public.lead_events;
create policy tech_events_insert on public.lead_events for insert to authenticated
  with check (exists (select 1 from public.leads l where l.id = lead_id and l.assigned_tech_id = public.my_tech_id()));

drop policy if exists tech_quotes on public.quotes;
create policy tech_quotes on public.quotes for select to authenticated using (tech_id = public.my_tech_id());
drop policy if exists tech_quotes_update on public.quotes;
create policy tech_quotes_update on public.quotes for update to authenticated
  using (tech_id = public.my_tech_id() and status = 'draft') with check (tech_id = public.my_tech_id());

drop policy if exists tech_invoices on public.invoices;
create policy tech_invoices on public.invoices for select to authenticated using (tech_id = public.my_tech_id());
drop policy if exists tech_invoices_insert on public.invoices;
create policy tech_invoices_insert on public.invoices for insert to authenticated
  with check (tech_id = public.my_tech_id() and status = 'uploaded'
              and exists (select 1 from public.leads l where l.id = lead_id and l.assigned_tech_id = public.my_tech_id()));

drop policy if exists tech_payouts on public.payouts;
create policy tech_payouts on public.payouts for select to authenticated using (tech_id = public.my_tech_id());

-- ---------------------------------------------------------------- masked offer feed for techs
create or replace function public.my_offers() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'offer', to_jsonb(o),
    'lead', jsonb_build_object(
      'id', l.id, 'category_id', l.category_id, 'city', l.city, 'zip', l.zip,
      'service_slug', l.service_slug, 'equipment', l.equipment, 'description', l.description,
      'urgency', l.urgency, 'photos', l.photos, 'created_at', l.created_at
    )
  ) order by o.offered_at desc), '[]'::jsonb)
  from public.dispatch_offers o join public.leads l on l.id = o.lead_id
  where o.tech_id = public.my_tech_id();
$$;

-- Accept an offer: first accepted wins, others withdrawn, lead assigned.
create or replace function public.accept_offer(offer_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.dispatch_offers; l public.leads;
begin
  select * into o from public.dispatch_offers where id = offer_id and tech_id = public.my_tech_id() for update;
  if o is null then raise exception 'offer not found'; end if;
  if o.status <> 'offered' then raise exception 'offer is %', o.status; end if;
  select * into l from public.leads where id = o.lead_id for update;
  if l.assigned_tech_id is not null then
    update public.dispatch_offers set status = 'expired', responded_at = now() where id = offer_id;
    raise exception 'job already taken';
  end if;
  update public.dispatch_offers set status = 'accepted', responded_at = now() where id = offer_id;
  update public.dispatch_offers set status = 'withdrawn', responded_at = now()
    where lead_id = o.lead_id and id <> offer_id and status = 'offered';
  update public.leads set status = 'assigned', assigned_tech_id = o.tech_id where id = o.lead_id;
  insert into public.lead_events (lead_id, type, actor, payload)
    values (o.lead_id, 'accepted', 'tech:' || o.tech_id, jsonb_build_object('offer_id', offer_id));
  return jsonb_build_object('ok', true, 'lead_id', o.lead_id);
end $$;

create or replace function public.decline_offer(offer_id uuid, reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.dispatch_offers;
begin
  select * into o from public.dispatch_offers where id = offer_id and tech_id = public.my_tech_id() for update;
  if o is null then raise exception 'offer not found'; end if;
  update public.dispatch_offers set status = 'declined', responded_at = now(), note = reason where id = offer_id;
  insert into public.lead_events (lead_id, type, actor, payload)
    values (o.lead_id, 'declined', 'tech:' || o.tech_id, jsonb_build_object('offer_id', offer_id, 'reason', reason));
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- customer token RPCs (no login)
create or replace function public.quote_by_token(t text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'quote', (to_jsonb(q) - 'tech_id' - 'lead_id'),
    'lead',  jsonb_build_object('customer_name', l.customer_name, 'city', l.city,
                                'service_slug', l.service_slug, 'equipment', l.equipment),
    'tech',  jsonb_build_object('business_name', tk.business_name),
    'brand', jsonb_build_object('name', c.brand_name, 'phone', c.phone, 'email', c.email, 'site_url', c.site_url)
  )
  from public.quotes q
  join public.leads l on l.id = q.lead_id
  left join public.techs tk on tk.id = q.tech_id
  join public.categories c on c.id = l.category_id
  where q.public_token = t;
$$;

create or replace function public.accept_quote(t text, note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q public.quotes;
begin
  select * into q from public.quotes where public_token = t for update;
  if q is null then raise exception 'quote not found'; end if;
  if q.status <> 'sent' then raise exception 'quote is %', q.status; end if;
  if q.valid_until is not null and q.valid_until < current_date then
    update public.quotes set status = 'expired' where id = q.id;
    raise exception 'quote expired';
  end if;
  update public.quotes set status = 'accepted', accepted_at = now(), customer_note = note where id = q.id;
  update public.leads set status = 'quoted', estimated_value = q.total where id = q.lead_id and status in ('assigned','quoted','offered','approved');
  insert into public.lead_events (lead_id, type, actor, payload)
    values (q.lead_id, 'quote_accepted', 'customer', jsonb_build_object('quote_id', q.id, 'total', q.total));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.invoice_by_token(t text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', i.id, 'line_items', i.line_items, 'subtotal', i.subtotal, 'tax', i.tax, 'total', i.total,
      'status', i.status, 'payment_link_url', i.payment_link_url, 'payment_link_card_url', i.payment_link_card_url,
      'card_fee_pct', i.card_fee_pct, 'paid_at', i.paid_at, 'created_at', i.created_at),
    'lead',  jsonb_build_object('customer_name', l.customer_name, 'city', l.city, 'service_slug', l.service_slug, 'equipment', l.equipment),
    'tech',  jsonb_build_object('business_name', tk.business_name),
    'brand', jsonb_build_object('name', c.brand_name, 'phone', c.phone, 'email', c.email, 'site_url', c.site_url)
  )
  from public.invoices i
  join public.leads l on l.id = i.lead_id
  join public.techs tk on tk.id = i.tech_id
  join public.categories c on c.id = l.category_id
  where i.public_token = t;
$$;

grant execute on function public.quote_by_token(text) to anon, authenticated;
grant execute on function public.accept_quote(text, text) to anon, authenticated;
grant execute on function public.invoice_by_token(text) to anon, authenticated;
grant execute on function public.my_offers() to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.decline_offer(uuid, text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_tech_id() to authenticated;

-- ---------------------------------------------------------------- storage policies
-- Create buckets 'invoices' (private) and 'lead-photos' (private) in the dashboard first.
drop policy if exists admin_storage_all on storage.objects;
create policy admin_storage_all on storage.objects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists anon_upload_lead_photos on storage.objects;
create policy anon_upload_lead_photos on storage.objects for insert to anon
  with check (bucket_id = 'lead-photos');

drop policy if exists tech_upload_invoices on storage.objects;
create policy tech_upload_invoices on storage.objects for insert to authenticated
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = public.my_tech_id()::text);

drop policy if exists tech_read_own_invoices on storage.objects;
create policy tech_read_own_invoices on storage.objects for select to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = public.my_tech_id()::text);
