-- SCH-123: retain appointment and financial history while erasing customer PII.
create function public.anonymize_master_customer(
  p_workspace_id uuid,
  p_customer_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  perform 1
    from public.customers c
   where c.id = p_customer_id
     and c.workspace_id = p_workspace_id
   for update;

  -- Missing or already anonymized customers are a successful no-op. This keeps
  -- retries safe and does not reveal whether an ID belongs to another tenant.
  if not found then
    return;
  end if;

  update public.customers
     set name = 'Anonymized customer',
         email = null,
         phone = null,
         normalized_email = null,
         normalized_phone = null,
         notes = null,
         marketing_consent_at = null,
         auth_user_id = null,
         anonymized_at = coalesce(anonymized_at, now()),
         updated_at = now()
   where id = p_customer_id
     and workspace_id = p_workspace_id
     and anonymized_at is null;

  if not found then
    return;
  end if;

  -- Wait-list records duplicate the customer's name and contact details. They
  -- are no longer actionable once their contact is erased, so remove them.
  delete from public.waiting_list_entries
   where workspace_id = p_workspace_id
     and customer_id = p_customer_id;

  -- Preserve appointment IDs, statuses, dates, services, and amounts while
  -- removing free-text fields which may contain customer PII.
  update public.appointments
     set customer_note = null,
         master_note = null,
         cancellation_reason = null
   where workspace_id = p_workspace_id
     and customer_id = p_customer_id;

  update public.appointment_events e
     set reason = null
    from public.appointments a
   where a.id = e.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id;

  -- Prevent stale contact links and queued messages from exposing or sending
  -- the erased contact data. Appointment lifecycle remains in appointment_events.
  update public.appointment_access_tokens t
     set revoked_at = coalesce(t.revoked_at, now())
    from public.appointments a
   where a.id = t.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id
     and t.revoked_at is null;

  delete from public.notification_jobs n
   using public.appointments a
   where a.id = n.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id;

  delete from public.booking_decision_email_outbox e
   using public.appointments a
   where a.id = e.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id;
end;
$$;

revoke all on function public.anonymize_master_customer(uuid, uuid)
  from public, anon;
grant execute on function public.anonymize_master_customer(uuid, uuid)
  to authenticated;

-- Keep actionable requests visible to the master without returning erased PII.
create or replace function public.list_master_pending_booking_requests(
  p_workspace_id uuid
)
returns table (
  id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  service_name text,
  duration_minutes integer,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  return query
  select a.id,
         case when c.anonymized_at is null then c.name else 'Anonymized customer' end,
         case when c.anonymized_at is null then c.email else null end,
         case when c.anonymized_at is null then c.phone else null end,
         a.service_name_snapshot,
         a.duration_minutes_snapshot,
         a.starts_at,
         a.ends_at,
         a.status,
         a.created_at
    from public.appointments a
    join public.customers c
      on c.id = a.customer_id
     and c.workspace_id = a.workspace_id
   where a.workspace_id = p_workspace_id
     and a.source = 'public_booking'
     and a.status = 'pending'
   order by a.starts_at, a.created_at, a.id;
end;
$$;

revoke all on function public.list_master_pending_booking_requests(uuid)
  from public, anon;
grant execute on function public.list_master_pending_booking_requests(uuid)
  to authenticated;
