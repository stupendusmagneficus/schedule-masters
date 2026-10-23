-- SCH-147: additive, forward-only. Keep sending paused while deploying matching workers.
-- A new provider tag changes the idempotent HTTP payload. Previously prepared,
-- nonterminal jobs must finish with the old worker before crossing this release.
do $$
begin
  if exists (select 1 from public.booking_decision_email_outbox
    where first_prepared_at is not null and status in ('pending','processing','not_configured')) then
    raise exception 'Drain prepared email jobs with the existing worker before the tracking upgrade';
  end if;
end;
$$;

alter table public.booking_decision_email_outbox
  add column provider_message_id uuid unique,
  add column delivery_status text check (delivery_status in ('sent','delayed','delivered','failed','suppressed','bounced','complained')),
  add column delivery_occurred_at timestamptz;
create table private.booking_email_webhook_events (
  event_id text primary key check (length(event_id) between 1 and 200),
  outbox_id uuid not null references public.booking_decision_email_outbox(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null
);
revoke all on private.booking_email_webhook_events from public,anon,authenticated,service_role;

create function private.email_delivery_rank(p_state text)
returns integer language sql immutable set search_path = '' as $$
  select case p_state when 'sent' then 1 when 'delayed' then 2 when 'delivered' then 3 when 'failed' then 4 when 'suppressed' then 5 when 'bounced' then 6 when 'complained' then 7 else 0 end;
$$;
revoke all on function private.email_delivery_rank(text) from public,anon,authenticated,service_role;

create function public.record_booking_email_webhook(p_event_id text,p_message_id uuid,p_event_type text,p_occurred_at timestamptz,p_outbox_id uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_job public.booking_decision_email_outbox%rowtype; v_state text;
begin
  v_state := case p_event_type when 'email.delivery_delayed' then 'delayed' else split_part(p_event_type,'.',2) end;
  if p_event_id is null or length(p_event_id) not between 1 and 200 or p_event_type is null or p_event_type not in ('email.sent','email.delivery_delayed','email.delivered','email.failed','email.suppressed','email.bounced','email.complained') or p_message_id is null or p_occurred_at is null or p_occurred_at > now()+interval '5 minutes' then raise exception 'Invalid delivery event'; end if;
  -- A signed outbox tag handles callbacks racing the send HTTP response. Never
  -- insert an outbox/appointment/customer from an unmatched or deleted callback.
  select * into v_job from public.booking_decision_email_outbox
   where (p_outbox_id is not null and id=p_outbox_id) or (p_outbox_id is null and provider_message_id=p_message_id)
   for update;
  if v_job.id is null or v_job.status='superseded' or v_job.first_prepared_at is null
     or p_occurred_at < v_job.first_prepared_at - interval '5 minutes'
     or (v_job.provider_message_id is not null and v_job.provider_message_id<>p_message_id)
     or exists(select 1 from public.booking_decision_email_outbox where provider_message_id=p_message_id and id<>v_job.id) then return 'ignored'; end if;
  insert into private.booking_email_webhook_events(event_id,outbox_id,event_type,occurred_at)
    values(p_event_id,v_job.id,p_event_type,p_occurred_at) on conflict(event_id) do nothing;
  if not found then return 'duplicate'; end if;
  if private.email_delivery_rank(v_state) > private.email_delivery_rank(v_job.delivery_status)
     or (v_state=v_job.delivery_status and p_occurred_at>v_job.delivery_occurred_at) then
    update public.booking_decision_email_outbox set delivery_status=v_state,delivery_occurred_at=p_occurred_at where id=v_job.id;
  end if;
  update public.booking_decision_email_outbox set provider_message_id=p_message_id,status='accepted_by_provider',provider_accepted_at=coalesce(provider_accepted_at,now()),finalized_at=coalesce(finalized_at,now()),processing_at=null,last_error=null where id=v_job.id;
  return 'applied';
end;
$$;
revoke all on function public.record_booking_email_webhook(text,uuid,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.record_booking_email_webhook(text,uuid,text,timestamptz,uuid) to service_role;

create function public.finish_booking_email_delivery(p_id uuid,p_attempt integer,p_success boolean,p_provider_message_id uuid default null,p_retryable boolean default false,p_error text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_job public.booking_decision_email_outbox%rowtype;
begin
  select * into v_job from public.booking_decision_email_outbox where id=p_id for update;
  if v_job.status='accepted_by_provider' and v_job.provider_message_id is not null and (p_provider_message_id is null or v_job.provider_message_id=p_provider_message_id) then return 'accepted_by_provider'; end if;
  if v_job.id is null or v_job.status<>'processing' or p_attempt is null or v_job.attempts<>p_attempt then return 'stale_claim'; end if;
  if p_success and p_provider_message_id is null then raise exception 'Provider id required'; end if;
  if v_job.provider_message_id is not null and p_provider_message_id is not null and v_job.provider_message_id<>p_provider_message_id then raise exception 'Provider correlation mismatch'; end if;
  update public.booking_decision_email_outbox set provider_message_id=coalesce(provider_message_id,p_provider_message_id) where id=p_id;
  -- An authenticated webhook is evidence of provider acceptance even if the
  -- send response was lost. Do not enqueue another send after that callback.
  return public.finish_booking_decision_email(p_id,p_success or v_job.provider_message_id is not null,p_retryable,p_error);
end;
$$;
revoke all on function public.finish_booking_email_delivery(uuid,integer,boolean,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.finish_booking_email_delivery(uuid,integer,boolean,uuid,boolean,text) to service_role;

create function public.list_master_appointment_emails(p_workspace_id uuid,p_appointment_id uuid)
returns table(id uuid,event_type text,state text,created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_workspace_member(p_workspace_id) then raise exception 'Workspace access denied'; end if;
  return query select e.id,e.decision,coalesce(e.delivery_status,e.status),e.created_at
    from public.booking_decision_email_outbox e
    join public.appointments a on a.id=p_appointment_id and a.workspace_id=p_workspace_id
   where e.workspace_id=p_workspace_id and e.decision not like 'master_%'
     and (e.appointment_id=p_appointment_id or e.occurrences @> jsonb_build_array(jsonb_build_object('id',p_appointment_id)))
   order by e.created_at desc,e.id limit 5;
end;
$$;
revoke all on function public.list_master_appointment_emails(uuid,uuid) from public,anon;
grant execute on function public.list_master_appointment_emails(uuid,uuid) to authenticated;
