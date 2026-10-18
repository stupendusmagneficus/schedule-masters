alter table public.services
  add column source_locale text not null default 'cz'
    check (source_locale in ('en', 'cz', 'sk', 'ru', 'uk')),
  add column translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object');

comment on column public.services.source_locale is
  'Language of the master-entered service content; generated translations require master review.';
comment on column public.services.translations is
  'Master-approved localized service name, description, and category by supported locale.';

create table public.service_translation_requests (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index service_translation_requests_workspace_created_at_idx
  on public.service_translation_requests (workspace_id, created_at);

alter table public.service_translation_requests enable row level security;
revoke all on public.service_translation_requests from anon, authenticated;
grant select, insert, delete on public.service_translation_requests to service_role;
grant usage, select on sequence public.service_translation_requests_id_seq to service_role;

create function public.claim_service_translation_request(
  p_workspace_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_count integer;
  v_month_start timestamptz :=
    date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  v_next_month_start timestamptz := v_month_start + interval '1 month';
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text, 0)
  );

  delete from public.service_translation_requests
   where workspace_id = p_workspace_id
     and created_at < v_month_start - interval '12 months';

  select count(*)::integer
    into v_request_count
    from public.service_translation_requests
   where workspace_id = p_workspace_id
     and created_at >= v_month_start
     and created_at < v_next_month_start;

  if v_request_count >= 20 then
    return jsonb_build_object(
      'allowed', false,
      'used', v_request_count,
      'limit', 20,
      'remaining', 0,
      'resetsAt', v_next_month_start
    );
  end if;

  insert into public.service_translation_requests (workspace_id, user_id)
  values (p_workspace_id, p_user_id);

  return jsonb_build_object(
    'allowed', true,
    'used', v_request_count + 1,
    'limit', 20,
    'remaining', 19 - v_request_count,
    'resetsAt', v_next_month_start
  );
end;
$$;

revoke all on function public.claim_service_translation_request(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_service_translation_request(uuid, uuid)
  to service_role;

create or replace function public.get_public_booking_context(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_workspace_name text;
  v_timezone text;
  v_slug text;
begin
  select w.id, w.name, w.timezone, bl.slug
    into v_workspace_id, v_workspace_name, v_timezone, v_slug
    from public.booking_links bl
    join public.workspaces w on w.id = bl.workspace_id
   where bl.slug = lower(trim(p_slug))
     and bl.is_active = true
     and w.status = 'active';

  if v_workspace_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'workspace', jsonb_build_object(
      'id', v_workspace_id,
      'name', v_workspace_name,
      'timezone', v_timezone,
      'slug', v_slug
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'category', s.category,
        'translations', s.translations,
        'durationMinutes', s.duration_minutes,
        'priceAmount', s.price_amount,
        'currency', s.currency
      ) order by s.sort_order, s.name)
        from public.services s
       where s.workspace_id = v_workspace_id
         and s.is_active = true
         and s.archived_at is null
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_public_booking_context(text)
  to anon, authenticated;

create function public.localize_booking_email_service_name()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_service_name text;
begin
  if new.locale not in ('en', 'cz', 'sk', 'ru', 'uk') then
    return new;
  end if;

  select string_agg(
           coalesce(nullif(trim(s.translations -> new.locale ->> 'name'), ''),
                    aps.service_name_snapshot),
           ' + ' order by aps.position
         )
    into v_service_name
    from public.appointment_services aps
    left join public.services s on s.id = aps.service_id
   where aps.appointment_id = new.appointment_id;

  if v_service_name is not null then
    new.service_name := v_service_name;
  end if;
  return new;
end;
$$;

revoke all on function public.localize_booking_email_service_name()
  from public, anon, authenticated;

create trigger booking_email_localize_service_name
  before update of service_name on public.booking_decision_email_outbox
  for each row execute function public.localize_booking_email_service_name();
