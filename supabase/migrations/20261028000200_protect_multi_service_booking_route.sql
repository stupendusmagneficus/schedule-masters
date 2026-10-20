-- SCH-142: both public booking routes share the existing per-IP budget.
-- Preserve quota, locking, grants and missing/malformed proxy header behavior.
-- The optional trailing slash prevents an alternate path spelling bypass.

create or replace function public.check_public_booking_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_method text := current_setting('request.method', true);
  v_path text := current_setting('request.path', true);
  v_headers json;
  v_forwarded_for text;
  v_ip inet;
  v_recent_requests integer;
  v_window interval := interval '5 minutes';
  v_max_requests integer := 30;
begin
  if coalesce(v_method, '') not in ('POST', 'PUT', 'PATCH', 'DELETE')
    or coalesce(v_path, '') !~ '/rpc/create_public_booking(_with_services)?/?$' then
    return;
  end if;

  begin
    v_headers := current_setting('request.headers', true)::json;
    v_forwarded_for := nullif(trim(split_part(v_headers->>'x-forwarded-for', ',', 1)), '');
    if v_forwarded_for is not null then
      v_ip := v_forwarded_for::inet;
    end if;
  exception
    when others then
      -- A missing or malformed proxy header must not break the booking API.
      -- The workspace quota below still protects the endpoint in that case.
      v_ip := null;
  end;

  if v_ip is null then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('public-booking-ip:' || v_ip::text, 0)
  );

  select count(*)::integer
  into v_recent_requests
  from private.public_booking_rate_limits
  where ip = v_ip
    and request_at >= now() - v_window;

  if v_recent_requests >= v_max_requests then
    raise sqlstate 'PGRST'
      using message = json_build_object(
              'code', 'PUBLIC_BOOKING_RATE_LIMIT',
              'message', 'Too many booking requests',
              'details', 'Rate limit exceeded')::text,
            detail = json_build_object(
              'status', 429,
              'headers', json_build_object(),
              'status_text', 'Too Many Requests')::text;
  end if;

  insert into private.public_booking_rate_limits (ip)
  values (v_ip);
end;
$$;

notify pgrst, 'reload config';
