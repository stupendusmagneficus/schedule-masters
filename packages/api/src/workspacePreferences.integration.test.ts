import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createSupabaseClient } from "./supabase/client";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

contract(
  "owner can change profile preferences without rewriting advanced availability or manage links",
  async () => {
    if (!url || !publishableKey || !serviceRoleKey) return;
    const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
    const anonymous = createSupabaseClient({ url, publishableKey });
    const workspaceId = randomUUID();
    const otherId = randomUUID();
    const slug = `preferences-${randomUUID()}`;
    const otherSlug = `${slug}-taken`;
    const users: string[] = [];
    try {
      expect(
        (
          await admin.from("workspaces").insert([
            {
              id: workspaceId,
              name: "Before",
              slug,
              timezone: "Europe/Prague",
            },
            {
              id: otherId,
              name: "Other",
              slug: otherSlug,
              timezone: "Europe/Prague",
            },
          ])
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("booking_links").insert([
            { workspace_id: workspaceId, slug },
            { workspace_id: otherId, slug: otherSlug },
          ])
        ).error,
      ).toBeNull();
      const owner = await createAuthenticatedTestUser({
        admin,
        url,
        publishableKey,
        email: `${slug}@example.test`,
        password: `Test-${slug}!`,
      });
      users.push(owner.user.id);
      const outsider = await createAuthenticatedTestUser({
        admin,
        url,
        publishableKey,
        email: `outsider-${slug}@example.test`,
        password: `Test-${slug}!`,
      });
      users.push(outsider.user.id);
      expect(
        (
          await admin.from("workspace_members").insert({
            workspace_id: workspaceId,
            user_id: owner.user.id,
            role: "owner",
          })
        ).error,
      ).toBeNull();
      const rules = await admin
        .from("availability_rules")
        .insert([
          {
            workspace_id: workspaceId,
            day_of_week: 1,
            start_local_time: "09:00",
            end_local_time: "12:00",
            valid_from: "2026-01-01",
          },
          {
            workspace_id: workspaceId,
            day_of_week: 1,
            start_local_time: "14:00",
            end_local_time: "18:00",
            valid_from: "2026-01-01",
          },
          {
            workspace_id: workspaceId,
            day_of_week: 3,
            start_local_time: "10:00",
            end_local_time: "16:00",
            valid_from: "2026-01-01",
          },
          {
            workspace_id: workspaceId,
            day_of_week: 6,
            start_local_time: "10:00",
            end_local_time: "15:00",
            valid_from: "2031-01-01",
          },
        ])
        .select("id");
      expect(rules.error).toBeNull();
      const ruleIds = rules.data?.map((rule) => rule.id) ?? [];
      expect(ruleIds).toHaveLength(4);
      expect(
        (
          await admin.from("availability_breaks").insert({
            availability_rule_id: ruleIds[0],
            start_local_time: "10:00",
            end_local_time: "10:15",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("availability_date_overrides").insert({
            workspace_id: workspaceId,
            override_kind: "closed",
            work_date: "2030-01-08",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("availability_exceptions").insert({
            workspace_id: workspaceId,
            kind: "blocked",
            starts_at: "2030-01-09T12:00:00Z",
            ends_at: "2030-01-09T13:00:00Z",
            reason: "Pause",
          })
        ).error,
      ).toBeNull();
      const customer = await admin
        .from("customers")
        .insert({
          workspace_id: workspaceId,
          name: "Test customer",
          email: "customer@example.test",
        })
        .select("id")
        .single();
      expect(customer.error).toBeNull();
      if (!customer.data) throw new Error("Test customer missing");
      const appointment = await admin
        .from("appointments")
        .insert({
          workspace_id: workspaceId,
          customer_id: customer.data.id,
          service_name_snapshot: "Service",
          duration_minutes_snapshot: 60,
          price_amount_snapshot: 500,
          currency_snapshot: "CZK",
          starts_at: "2030-01-07T10:00:00Z",
          ends_at: "2030-01-07T11:00:00Z",
          occupied_range: "[2030-01-07T10:00:00Z,2030-01-07T11:00:00Z)",
          source: "master_created",
          status: "pending",
        })
        .select("id")
        .single();
      expect(appointment.error).toBeNull();
      if (!appointment.data) throw new Error("Test appointment missing");
      const appointmentId = appointment.data.id;
      const link = await owner.client.rpc("create_customer_appointment_link", {
        p_appointment_id: appointmentId,
        p_customer_consent_confirmed: true,
      });
      expect(link.error).toBeNull();
      const token = (link.data as { token: string }).token;
      const snapshot = async () => {
        const rows = await Promise.all([
          admin
            .from("availability_rules")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("id"),
          admin
            .from("availability_breaks")
            .select("*")
            .in("availability_rule_id", ruleIds)
            .order("id"),
          admin
            .from("availability_date_overrides")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("id"),
          admin
            .from("availability_exceptions")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("id"),
          admin
            .from("appointment_access_tokens")
            .select("*")
            .eq("appointment_id", appointmentId)
            .order("id"),
        ]);
        rows.forEach((row) => {
          expect(row.error).toBeNull();
        });
        return rows.map((row) => row.data);
      };
      const before = await snapshot();
      const args = {
        p_workspace_id: workspaceId,
        p_name: "After",
        p_slug: `${slug}-new`,
        p_booking_interval_minutes: 75,
        p_notice_minutes: 120,
      };
      const ownerSession = (await owner.client.auth.getSession()).data.session;
      const outsiderSession = (await outsider.client.auth.getSession()).data
        .session;
      const save = (
        payload: Record<string, unknown>,
        bearer = ownerSession?.access_token,
      ) =>
        fetch(`${url}/rest/v1/rpc/update_master_workspace_preferences`, {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${bearer ?? publishableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      const saved = await save(args);
      expect(saved.status, JSON.stringify(await saved.clone().json())).toBe(
        200,
      );
      expect(await saved.json()).toMatchObject({
        name: "After",
        slug: args.p_slug,
        booking_interval_minutes: 75,
        public_booking_min_notice_minutes: 120,
      });
      expect(await snapshot()).toEqual(before);
      const workspace = await admin
        .from("workspaces")
        .select(
          "name, slug, booking_interval_minutes, public_booking_min_notice_minutes",
        )
        .eq("id", workspaceId)
        .single();
      expect(workspace.data).toEqual({
        name: "After",
        slug: args.p_slug,
        booking_interval_minutes: 75,
        public_booking_min_notice_minutes: 120,
      });
      const bookingLink = await admin
        .from("booking_links")
        .select("slug")
        .eq("workspace_id", workspaceId)
        .single();
      expect(bookingLink.data?.slug).toBe(args.p_slug);
      expect(
        (await anonymous.rpc("get_public_booking_context", { p_slug: slug }))
          .data,
      ).toBeNull();
      expect(
        (
          await anonymous.rpc("get_public_booking_context", {
            p_slug: args.p_slug,
          })
        ).data,
      ).not.toBeNull();
      const managed = await anonymous.rpc("get_customer_appointment", {
        p_token: token,
      });
      expect(managed.error).toBeNull();
      expect(managed.data).toMatchObject({
        workspaceName: "After",
        status: "pending",
      });
      for (const patch of [
        { p_booking_interval_minutes: 77 },
        { p_notice_minutes: 61 },
        { p_name: "" },
        { p_slug: "Bad slug" },
      ]) {
        expect((await save({ ...args, ...patch })).status).toBe(400);
      }
      const collision = await save({
        ...args,
        p_name: "Must roll back",
        p_notice_minutes: 240,
        p_slug: otherSlug,
      });
      expect(collision.status).toBe(400);
      expect(await collision.json()).toMatchObject({
        message: "Booking slug is already taken",
      });
      expect(
        (
          await admin
            .from("workspaces")
            .select(
              "name, slug, booking_interval_minutes, public_booking_min_notice_minutes",
            )
            .eq("id", workspaceId)
            .single()
        ).data,
      ).toEqual(workspace.data);
      expect((await save(args, outsiderSession?.access_token)).status).not.toBe(
        200,
      );
      expect((await save(args, publishableKey)).status).not.toBe(200);
      expect(await snapshot()).toEqual(before);
      expect(
        (
          await admin
            .from("availability_rules")
            .update({ is_active: false })
            .eq("workspace_id", workspaceId)
        ).error,
      ).toBeNull();
      const closed = await snapshot();
      expect(
        (await save({ ...args, p_booking_interval_minutes: 90 })).status,
      ).toBe(200);
      expect(await snapshot()).toEqual(closed);
    } finally {
      await admin.from("workspaces").delete().in("id", [workspaceId, otherId]);
      for (const userId of users) await admin.auth.admin.deleteUser(userId);
    }
  },
  30_000,
);
