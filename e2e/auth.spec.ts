import { test, expect } from "@playwright/test";
import { ADMIN, MANAGER, USER, login } from "./helpers";

test.describe("authentication", () => {
  test("unauthenticated visitors are redirected to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/);
  });

  for (const [role, creds] of [
    ["admin", ADMIN],
    ["manager", MANAGER],
    ["user", USER],
  ] as const) {
    test(`${role} can log in and reach the dashboard`, async ({ page }) => {
      await login(page, creds.email, creds.password);
      await expect(page.getByText("Overview")).toBeVisible();
    });
  }

  test("Approvals nav is visible for Manager but not for User", async ({ page }) => {
    await login(page, MANAGER.email, MANAGER.password);
    await expect(page.getByRole("link", { name: "Approvals" })).toBeVisible();

    await page.getByLabel("Log out").click();
    await page.waitForURL(/\/login/);

    await login(page, USER.email, USER.password);
    await expect(page.getByRole("link", { name: "Approvals" })).toHaveCount(0);
  });
});
