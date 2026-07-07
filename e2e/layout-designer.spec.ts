import { test, expect } from "@playwright/test";
import { ADMIN, USER, login } from "./helpers";

// The grid/arrange editor is now ARCHIVED (superseded by the free-form editor).
// It stays reachable only at /rooms/[code]/edit-legacy, so these tests that
// exercise its in-place arrange behaviour point there. The primary room view is
// covered by the "Arrange" affordance check below.

test("ADMIN adds a seat via the legacy arrange editor and it persists across reload", async ({
  page,
}) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/rooms/C310/edit-legacy");
  const before = await page.locator('button[aria-label^="Seat C310-"]').count();

  await page.getByRole("button", { name: "Edit layout" }).click();
  // Grow capacity first so the add isn't blocked when the room is already full.
  await page.getByRole("button", { name: "Add row" }).click();
  await page.getByRole("button", { name: "Add seat" }).click();
  await page.waitForTimeout(500);

  await page.reload();
  const after = await page.locator('button[aria-label^="Seat C310-"]').count();
  expect(after).toBe(before + 1);
});

test("ADMIN drags a seat in the legacy editor and its new position persists across reload", async ({
  page,
}) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/rooms/C310/edit-legacy");
  await page.getByRole("button", { name: "Edit layout" }).click();

  const tile = page.locator('button[aria-label^="Seat C310-01"]');
  const box = await tile.boundingBox();
  if (!box) throw new Error("seat tile not found");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const dragged = await tile.boundingBox();
  expect(dragged!.x).toBeGreaterThan(box.x + 30); // actually moved, not a no-op

  await page.reload();
  await page.waitForSelector('button[aria-label^="Seat C310-01"]');
  const after = await page.locator('button[aria-label^="Seat C310-01"]').boundingBox();

  // Small tolerance for DOM measurement noise across a reload — the point is
  // the drag persisted, not pixel-exactness.
  expect(Math.abs(after!.x - dragged!.x)).toBeLessThan(5);
  expect(Math.abs(after!.y - dragged!.y)).toBeLessThan(5);
});

test("non-admins get no Arrange affordance on the room view", async ({ page }) => {
  await login(page, USER.email, USER.password);
  await page.goto("/rooms/C310");
  await expect(page.getByRole("link", { name: "Arrange" })).toHaveCount(0);
});
