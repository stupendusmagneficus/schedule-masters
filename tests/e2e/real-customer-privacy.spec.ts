// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test, not a Turbo task.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "../../packages/api/src/supabase.integration.helpers";

test("master erases customer data while retaining the completed visit", async ({
  page: masterPage,
}) => {
  test.setTimeout(60_000);
  const url = process.env.SUPABASE_URL as string;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const workspaceId = randomUUID();
  const customerId = randomUUID();
  const slug = `privacy-${randomUUID()}`;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const customerEmail = `customer-${slug}@example.test`;
  const visitId = randomUUID();
  let userId: string | undefined;

  try {
    const workspace = await admin.from("workspaces").insert({
      id: workspaceId,
      name: "Privacy Test Studio",
      slug,
      timezone: "Europe/Prague",
    });
    expect(workspace.error).toBeNull();

    const owner = await createAuthenticatedTestUser({
      admin,
      url,
      publishableKey,
      email: `${slug}@example.test`,
      password: `Test-${slug}!`,
    });
    userId = owner.user.id;
    const member = await admin.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
    });
    expect(member.error).toBeNull();

    const customer = await admin.from("customers").insert({
      id: customerId,
      workspace_id: workspaceId,
      name: "Privacy customer",
      email: customerEmail,
      phone: "+420777000123",
      notes: "Private customer note",
    });
    expect(customer.error).toBeNull();
    const startsAt = `${today}T10:00:00Z`;
    const endsAt = `${today}T11:00:00Z`;
    const appointment = await admin.from("appointments").insert({
      id: visitId,
      workspace_id: workspaceId,
      customer_id: customerId,
      service_name_snapshot: "Fixture service",
      duration_minutes_snapshot: 60,
      price_amount_snapshot: 500,
      paid_amount: 375,
      master_note: "Private visit note",
      customer_note: "Private request note",
      currency_snapshot: "CZK",
      starts_at: startsAt,
      ends_at: endsAt,
      occupied_range: `[${startsAt},${endsAt})`,
      status: "completed",
      source: "master_created",
    });
    expect(appointment.error).toBeNull();

    await masterPage.addInitScript(() =>
      localStorage.setItem("schedule-masters.locale", "en"),
    );
    await masterPage.goto("http://127.0.0.1:19057/");
    await masterPage
      .getByRole("button", {
        name: "Already have an account? Sign in",
        exact: true,
      })
      .click();
    await masterPage
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(`${slug}@example.test`);
    await masterPage
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(`Test-${slug}!`);
    await masterPage
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await masterPage
      .getByRole("tab", { name: "Customers", exact: true })
      .click();
    const search = masterPage.getByRole("textbox", {
      name: "Name, phone, or email",
    });
    const customerRow = masterPage.getByRole("button", {
      name: "Privacy customer",
      exact: true,
    });
    await search.fill("Privacy customer");
    await customerRow.click();
    await expect(
      masterPage.getByText("Booking history", { exact: true }),
    ).toBeVisible();
    await masterPage
      .getByRole("button", { name: "Delete customer", exact: true })
      .click();
    await masterPage
      .getByRole("button", { name: "Keep customer", exact: true })
      .click();
    await expect(
      masterPage.getByText("Booking history", { exact: true }),
    ).toBeVisible();
    await masterPage
      .getByRole("button", { name: "Delete customer", exact: true })
      .click();
    const [erased] = await Promise.all([
      masterPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
          "/rest/v1/rpc/anonymize_master_customer",
      ),
      masterPage
        .getByRole("button", { name: "Delete data", exact: true })
        .click(),
    ]);
    expect(erased.ok()).toBe(true);
    await expect(search).toBeVisible();
    for (const term of [customerEmail, "Privacy customer"]) {
      const [result] = await Promise.all([
        masterPage.waitForResponse(
          (response) =>
            new URL(response.url()).pathname ===
              "/rest/v1/rpc/list_master_customer_directory" &&
            response.request().postDataJSON()?.p_search === term,
        ),
        search.fill(term),
      ]);
      expect(result.ok()).toBe(true);
      expect(await result.json()).toEqual([]);
      await expect(
        masterPage.getByText("No customers match this search.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(customerRow).toHaveCount(0);
    }

    const [profile, visit] = await Promise.all([
      admin
        .from("customers")
        .select("name, email, phone, notes, anonymized_at")
        .eq("id", customerId)
        .single(),
      admin
        .from("appointments")
        .select(
          "customer_id, status, price_amount_snapshot, paid_amount, master_note, customer_note",
        )
        .eq("id", visitId)
        .single(),
    ]);
    expect(profile.error).toBeNull();
    expect(profile.data).toMatchObject({
      email: null,
      phone: null,
      notes: null,
      anonymized_at: expect.any(String),
    });
    expect(profile.data?.name).not.toBe("Privacy customer");
    expect(visit.error).toBeNull();
    expect(visit.data).toEqual({
      customer_id: customerId,
      status: "completed",
      price_amount_snapshot: 500,
      paid_amount: 375,
      master_note: null,
      customer_note: null,
    });
  } finally {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
