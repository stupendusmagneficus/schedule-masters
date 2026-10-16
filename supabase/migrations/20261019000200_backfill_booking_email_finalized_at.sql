-- Keep existing terminal outbox rows for another 30 days after this migration.
-- Their exact terminal time was not recorded before finalized_at was added.
update public.booking_decision_email_outbox
   set finalized_at = case
     when status = 'accepted_by_provider'
       then coalesce(provider_accepted_at, now())
     else now()
   end
 where status in ('accepted_by_provider', 'failed')
   and finalized_at is null;
