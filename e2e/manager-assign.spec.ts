import { test, expect } from "@playwright/test";
import { MANAGER, login } from "./helpers";

test("MANAGER assigns an occupant directly (no request/approval needed)", async ({ page }) => {
  await login(page, MANAGER.email, MANAGER.password);
  await page.goto("/rooms/C302?seat=C302-10");
  await page.getByRole("button", { name: "Assign occupant" }).click();
  await page.getByRole("dialog").getByText("Katherine Johnson").click();
  await expect(page.locator("aside").getByText("Katherine Johnson")).toBeVisible();
});

test("MANAGER unassigns an occupant, which auto-downgrades their primary device", async ({
  page,
}) => {
  // C302-01 (Ada Lovelace) has a PRIMARY device (INV-40021) in the seed.
  await login(page, MANAGER.email, MANAGER.password);
  await page.goto("/rooms/C302?seat=C302-01");
  await expect(page.locator("aside").getByText("Primary", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Move / remove occupant" }).click();
  await expect(page.locator("aside").getByText("port available")).toBeVisible();

  await page.goto("/devices");
  await page.getByLabel("Search devices").fill("INV-40021");
  await page.waitForTimeout(500); // debounced server search
  await expect(page.getByText("C302-01")).toBeVisible(); // still placed at the same seat
  await expect(page.getByText("Primary", { exact: true })).toHaveCount(0); // but no longer primary
});
