# Finance report range contract (SCH-153)

`get_master_finance_report(workspace, from, to)` returns one sanitized
aggregate. Both dates are inclusive **workspace-local visit dates**. The query
uses the workspace timezone to form `[from midnight, midnight after to)`, so
visits close to midnight and daylight-saving changes stay in the correct period.
The server clock decides which uncompleted bookings are still upcoming.

- **Received** sums `paid_amount` recorded by the master for completed visits
  whose start is in the range. The value belongs to the visit date, even if the
  master entered payment later. It is not bank cash flow or profit: expenses and
  payment transaction dates are not stored by this model. Partial payments count
  only their recorded amount.
- **Expected** sums the snapshot service price of future pending and confirmed
  bookings in the range. It does not imply payment or subtract a deposit.
  Canceled and no-show bookings are excluded.
- **New/returning clients** are distinct customers with completed visits in
  the selected range. A client is returning if a completed visit exists before
  the first local day of that range; otherwise the client is new. A customer
  with several visits in one range is counted once.
- **Weekly income** groups completed-visit payments into consecutive seven-day
  buckets anchored at the selected `from` date. Currencies remain separate.
  Zero-value weeks are filled by the client for the chart.

The RPC checks workspace membership before reading data. It returns counts and
per-currency totals only, never customer IDs, names, contact details, notes or
individual visits. This avoids the PostgREST row limit that truncated large
client-side reports. The old appointment list remains available for calendar
flows; the finance screen no longer loads it.

To verify changes, compare the report for one month and a cross-month custom
range, including the local midnight boundary, partial payment, mixed currencies,
canceled/no-show bookings and a workspace with more than 1,000 visits. The
integration contract exercises these cases and tenant isolation.

The migration only creates a read-only RPC and changes no rows or table schema.
If it must be retired, deploy a new forward migration that revokes execution
and drops `public.get_master_finance_report(uuid,date,date,timestamptz)` after
the mobile client has stopped calling it. Do not edit the deployed migration.
