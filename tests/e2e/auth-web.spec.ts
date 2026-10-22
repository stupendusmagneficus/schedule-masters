import { expect, test } from "@playwright/test";

const user = {
  id: "14300000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "master@example.test",
  user_metadata: { locale: "en" },
  app_metadata: { provider: "email" },
  created_at: "2026-01-01T00:00:00Z",
};
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })).toString("base64url")}.fixture`;

test("recovers a password, keeps the form after reload, and signs out", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() =>
    localStorage.setItem("schedule-masters.locale", "en"),
  );
  let callback = "";
  let recoveryRequests = 0;
  let updates = 0;
  await page.route("**/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/recover")) {
      recoveryRequests++;
      const redirect = new URL(url.searchParams.get("redirect_to") as string);
      redirect.searchParams.set("code", "fixture-recovery-code");
      callback = redirect.toString();
      return route.fulfill({ json: {} });
    }
    if (url.pathname.endsWith("/token"))
      return route.fulfill({
        json: {
          access_token: token,
          refresh_token: "fixture-refresh",
          token_type: "bearer",
          expires_in: 3600,
          user,
        },
      });
    if (url.pathname.endsWith("/user")) {
      if (route.request().method() === "PUT") updates++;
      return route.fulfill({ json: user });
    }
    if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204 });
    return route.fulfill({
      status: 400,
      json: { message: "Unexpected fixture route" },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Already have an account? Sign in",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(user.email);
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(
    page.getByText(
      "If this address can receive the message, a link is on its way.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  expect(recoveryRequests).toBe(1);
  await page
    .getByRole("button", { name: "Go to sign in", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  expect(recoveryRequests).toBe(1);
  await page.goto(callback);
  await expect(
    page.getByRole("heading", { name: "Set a new password" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Set a new password" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/code=/);
  await testInfo.attach("recovery-form-320", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await page.getByLabel("Password", { exact: true }).fill("new-password-143");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Save password", exact: true })
    .click();
  await expect(
    page.getByText("Passwords do not match.", { exact: true }),
  ).toBeVisible();
  expect(updates).toBe(0);
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("new-password-143");
  await page
    .getByRole("button", { name: "Save password", exact: true })
    .click();
  await expect(
    page.getByText("Password saved. You can now continue to the app.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(updates).toBe(1);
  await page
    .getByRole("button", { name: "Go to sign in", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("schedule-masters.auth-recovery-user"),
    ),
  ).toBeNull();
});

test("rejects expired links and offers a fresh reset request", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("schedule-masters.locale", "en"),
  );
  await page.goto("/auth/callback?error=access_denied&error_code=otp_expired");
  await expect(
    page.getByText("We could not open this link", { exact: false }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/error=/);
  await testInfo.attach("expired-link-800", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await expect(
    page.getByRole("button", { name: "Forgot password?", exact: true }),
  ).toBeVisible();
});

test("resends confirmation after a cooldown and keeps account responses generic", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() =>
    localStorage.setItem("schedule-masters.locale", "ru"),
  );
  await page.clock.install();
  let resends = 0;
  await page.route("**/auth/v1/signup**", (route) =>
    route.fulfill({ json: { user, session: null } }),
  );
  await page.route("**/auth/v1/resend**", (route) => {
    resends++;
    return route.fulfill({
      status: 400,
      json: {
        code: "user_not_found",
        msg: "Do not display provider account details",
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(user.email);
  await page.getByLabel("Пароль", { exact: true }).fill("signup-password-143");
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(
    page.getByText("Подтвердите ваш email", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Повторить через/ }),
  ).toBeDisabled();
  await page.clock.fastForward(61_000);
  await page
    .getByRole("button", {
      name: "Отправить подтверждение повторно",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "Если на этот адрес можно отправить письмо, ссылка уже в пути.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Do not display provider account details"),
  ).toHaveCount(0);
  expect(resends).toBe(1);
  await testInfo.attach("confirmation-resend-375-ru", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
