create table public.platform_integration_budgets (
  provider text primary key check (provider in ('openai_translation', 'resend_email')),
  usage_unit text not null check (usage_unit in ('usd', 'email')),
  enabled boolean not null default false,
  kill_switch boolean not null default true,
  daily_limit numeric(14, 6),
  monthly_limit numeric(14, 6),
  updated_at timestamptz not null default now(),
  check (daily_limit is null or daily_limit > 0),
  check (monthly_limit is null or monthly_limit > 0)
);

insert into public.platform_integration_budgets (provider, usage_unit, daily_limit, monthly_limit)
values
  ('openai_translation', 'usd', null, null),
  -- Reserve 4 daily / 128 monthly emails for budget alerts at both thresholds.
  ('resend_email', 'email', 96, 2872);

create table public.platform_integration_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.platform_integration_budgets(provider),
  reserved_amount numeric(14, 6) not null check (reserved_amount > 0),
  actual_amount numeric(14, 6),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  check (actual_amount is null or actual_amount >= 0),
  check ((actual_amount is null) = (settled_at is null))
);

create index platform_integration_usage_provider_created_idx
  on public.platform_integration_usage (provider, created_at desc);

create table public.platform_integration_budget_alerts (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.platform_integration_budgets(provider),
  period_type text not null check (period_type in ('day', 'month')),
  period_start date not null,
  threshold integer not null check (threshold in (80, 100)),
  used_amount numeric(14, 6) not null,
  limit_amount numeric(14, 6) not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent')),
  attempts integer not null default 0 check (attempts >= 0),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (provider, period_type, period_start, threshold)
);

create index platform_integration_budget_alerts_pending_idx
  on public.platform_integration_budget_alerts (created_at)
  where status = 'pending';

alter table public.platform_integration_budgets enable row level security;
alter table public.platform_integration_usage enable row level security;
alter table public.platform_integration_budget_alerts enable row level security;
revoke all on public.platform_integration_budgets from public, anon, authenticated;
revoke all on public.platform_integration_usage from public, anon, authenticated;
revoke all on public.platform_integration_budget_alerts from public, anon, authenticated;
grant select on public.platform_integration_budgets to service_role;

create function public.reserve_platform_integration_usage(p_provider text, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget public.platform_integration_budgets%rowtype;
  v_reservation_id uuid;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  v_used_day numeric(14, 6);
  v_used_month numeric(14, 6);
begin
  if p_provider not in ('openai_translation', 'resend_email') or p_amount is null or p_amount <= 0 then
    raise exception 'Invalid platform usage reservation';
  end if;

  select * into v_budget
    from public.platform_integration_budgets
   where provider = p_provider
   for update;

  if not found or not v_budget.enabled or v_budget.kill_switch
     or v_budget.daily_limit is null or v_budget.monthly_limit is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_configured');
  end if;

  select coalesce(sum(coalesce(actual_amount, reserved_amount)), 0)
    into v_used_day
    from public.platform_integration_usage
   where provider = p_provider and created_at >= v_day_start;

  select coalesce(sum(coalesce(actual_amount, reserved_amount)), 0)
    into v_used_month
    from public.platform_integration_usage
   where provider = p_provider and created_at >= v_month_start;

  if v_used_day + p_amount > v_budget.daily_limit or v_used_month + p_amount > v_budget.monthly_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'limit_reached',
      'usedToday', v_used_day,
      'dailyLimit', v_budget.daily_limit,
      'usedThisMonth', v_used_month,
      'monthlyLimit', v_budget.monthly_limit,
      'resetsAt', case
        when v_used_day + p_amount > v_budget.daily_limit then v_day_start + interval '1 day'
        else v_month_start + interval '1 month'
      end
    );
  end if;

  insert into public.platform_integration_usage (provider, reserved_amount)
  values (p_provider, p_amount)
  returning id into v_reservation_id;

  return jsonb_build_object(
    'allowed', true,
    'reservationId', v_reservation_id,
    'usedToday', v_used_day + p_amount,
    'dailyLimit', v_budget.daily_limit,
    'usedThisMonth', v_used_month + p_amount,
    'monthlyLimit', v_budget.monthly_limit,
    'resetsAt', v_month_start + interval '1 month'
  );
end;
$$;

create function public.settle_platform_integration_usage(p_reservation_id uuid, p_actual_amount numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usage public.platform_integration_usage%rowtype;
  v_budget public.platform_integration_budgets%rowtype;
  v_amount numeric(14, 6);
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_day_used numeric(14, 6);
  v_month_used numeric(14, 6);
begin
  select * into v_usage
    from public.platform_integration_usage
   where id = p_reservation_id
   for update;
  if not found then raise exception 'Usage reservation not found'; end if;
  if v_usage.actual_amount is not null then
    return jsonb_build_object('settled', true, 'duplicate', true);
  end if;

  v_amount := coalesce(p_actual_amount, v_usage.reserved_amount);
  if v_amount < 0 then raise exception 'Invalid settled usage amount'; end if;
  update public.platform_integration_usage
     set actual_amount = v_amount, settled_at = now()
   where id = p_reservation_id;

  select * into v_budget
    from public.platform_integration_budgets
   where provider = v_usage.provider
   for update;
  v_day_start := date_trunc('day', v_usage.created_at at time zone 'UTC') at time zone 'UTC';
  v_month_start := date_trunc('month', v_usage.created_at at time zone 'UTC') at time zone 'UTC';

  select coalesce(sum(coalesce(actual_amount, reserved_amount)), 0)
    into v_day_used
    from public.platform_integration_usage
   where provider = v_usage.provider and created_at >= v_day_start and created_at < v_day_start + interval '1 day';
  select coalesce(sum(coalesce(actual_amount, reserved_amount)), 0)
    into v_month_used
    from public.platform_integration_usage
   where provider = v_usage.provider and created_at >= v_month_start and created_at < v_month_start + interval '1 month';

  if v_budget.daily_limit is not null then
    if v_day_used >= v_budget.daily_limit * 0.8 then
      insert into public.platform_integration_budget_alerts (provider, period_type, period_start, threshold, used_amount, limit_amount)
      values (v_usage.provider, 'day', v_day_start::date, 80, v_day_used, v_budget.daily_limit)
      on conflict (provider, period_type, period_start, threshold) do nothing;
    end if;
    if v_day_used >= v_budget.daily_limit then
      insert into public.platform_integration_budget_alerts (provider, period_type, period_start, threshold, used_amount, limit_amount)
      values (v_usage.provider, 'day', v_day_start::date, 100, v_day_used, v_budget.daily_limit)
      on conflict (provider, period_type, period_start, threshold) do nothing;
    end if;
  end if;

  if v_budget.monthly_limit is not null then
    if v_month_used >= v_budget.monthly_limit * 0.8 then
      insert into public.platform_integration_budget_alerts (provider, period_type, period_start, threshold, used_amount, limit_amount)
      values (v_usage.provider, 'month', v_month_start::date, 80, v_month_used, v_budget.monthly_limit)
      on conflict (provider, period_type, period_start, threshold) do nothing;
    end if;
    if v_month_used >= v_budget.monthly_limit then
      insert into public.platform_integration_budget_alerts (provider, period_type, period_start, threshold, used_amount, limit_amount)
      values (v_usage.provider, 'month', v_month_start::date, 100, v_month_used, v_budget.monthly_limit)
      on conflict (provider, period_type, period_start, threshold) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'settled', true,
    'usedToday', v_day_used,
    'usedThisMonth', v_month_used,
    'alertsPending', exists (
      select 1 from public.platform_integration_budget_alerts where status = 'pending'
    )
  );
end;
$$;

create function public.claim_platform_integration_budget_alerts(p_batch_size integer default 10)
returns setof public.platform_integration_budget_alerts
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_batch_size < 1 or p_batch_size > 50 then raise exception 'Invalid integration budget alert batch size'; end if;
  return query
  with candidates as (
    select id from public.platform_integration_budget_alerts
     where status = 'pending'
        or (status = 'sending' and claimed_at < now() - interval '10 minutes')
     order by created_at
     limit p_batch_size
     for update skip locked
  )
  update public.platform_integration_budget_alerts as alert
     set status = 'sending', attempts = attempts + 1, claimed_at = now()
    from candidates
   where alert.id = candidates.id
  returning alert.*;
end;
$$;

create function public.finish_platform_integration_budget_alert(p_alert_id uuid, p_sent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.platform_integration_budget_alerts
     set status = case when p_sent then 'sent' else 'pending' end,
         sent_at = case when p_sent then now() else null end,
         claimed_at = null
   where id = p_alert_id and status = 'sending';
  if not found then raise exception 'Integration budget alert is not sending'; end if;
end;
$$;

create function public.defer_booking_decision_email_for_budget(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.booking_decision_email_outbox
     set status = 'pending',
         attempts = greatest(attempts - 1, 0),
         processing_at = null,
         next_attempt_at = now() + interval '1 hour',
         last_error = null
   where id = p_id and status = 'processing';
  if not found then raise exception 'Booking notification is not processing'; end if;
end;
$$;

revoke all on function public.reserve_platform_integration_usage(text, numeric) from public, anon, authenticated;
revoke all on function public.settle_platform_integration_usage(uuid, numeric) from public, anon, authenticated;
revoke all on function public.claim_platform_integration_budget_alerts(integer) from public, anon, authenticated;
revoke all on function public.finish_platform_integration_budget_alert(uuid, boolean) from public, anon, authenticated;
revoke all on function public.defer_booking_decision_email_for_budget(uuid) from public, anon, authenticated;
grant execute on function public.reserve_platform_integration_usage(text, numeric) to service_role;
grant execute on function public.settle_platform_integration_usage(uuid, numeric) to service_role;
grant execute on function public.claim_platform_integration_budget_alerts(integer) to service_role;
grant execute on function public.finish_platform_integration_budget_alert(uuid, boolean) to service_role;
grant execute on function public.defer_booking_decision_email_for_budget(uuid) to service_role;
