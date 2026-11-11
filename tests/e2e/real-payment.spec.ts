// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test, not a Turbo task.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "../../packages/api/src/supabase.integration.helpers";

test("master records a payment and sees it in Finances", async ({
  page: masterPage,
}) => {
  test.setTimeout(60_000);
  const url = process.env.SUPABASE_URL as string;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const workspaceId = randomUUID();
  const customerId = randomUUID();
  const slug = `payment-${randomUUID()}`;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let userId: string | undefined;

  try {
    const workspace = await admin.from("workspaces").insert({
      id: workspaceId,
      name: "Payment Test Studio",
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
      name: "Payment customer",
    });
    expect(customer.error).toBeNull();
    const workingHours = await admin.from("availability_rules").insert({
      workspace_id: workspaceId,
      day_of_week: new Date(`${today}T12:00:00Z`).getUTCDay() || 7,
      start_local_time: "08:00",
      end_local_time: "20:00",
      valid_from: today,
    });
    expect(workingHours.error).toBeNull();

    const startsAt = `${today}T10:00:00Z`;
    const endsAt = `${today}T11:00:00Z`;
    const appointment = await admin.from("appointments").insert({
      workspace_id: workspaceId,
      customer_id: customerId,
      service_name_snapshot: "Fixture service",
      duration_minutes_snapshot: 60,
      price_amount_snapshot: 500,
      paid_amount: 0,
      currency_snapshot: "CZK",
      starts_at: startsAt,
      ends_at: endsAt,
      occupied_range: `[${startsAt},${endsAt})`,
      status: "confirmed",
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
      .getByRole("tab", { name: "Calendar", exact: true })
      .click();
    await masterPage.getByRole("button", { name: /Payment customer/ }).click();
    await masterPage
      .getByRole("button", { name: "Complete booking", exact: true })
      .click();
    const paymentAmount = 375;
    await masterPage
      .getByRole("textbox", { name: "Received for appointment", exact: true })
      .fill(String(paymentAmount));
    const [payment] = await Promise.all([
      masterPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
          "/rest/v1/rpc/set_master_appointment_paid_amount",
      ),
      masterPage
        .getByRole("button", { name: "Save payment", exact: true })
        .click(),
    ]);
    expect(payment.ok()).toBe(true);
    await expect(
      masterPage
        .getByText("Payment saved", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();

    const [updatedFinance] = await Promise.all([
      masterPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
          "/rest/v1/rpc/get_master_finance_report",
      ),
      masterPage.getByRole("tab", { name: "Finances", exact: true }).click(),
    ]);
    expect(updatedFinance.ok()).toBe(true);
    expect(await updatedFinance.json()).toMatchObject({
      completedCount: 1,
      paidByCurrency: { CZK: paymentAmount },
    });
    const paidAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "CZK",
    }).format(paymentAmount);
    await expect(
      masterPage
        .getByText(paidAmount, { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
  } finally {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
