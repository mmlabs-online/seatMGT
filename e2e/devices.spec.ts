import { test, expect } from "@playwright/test";
import { ADMIN, login } from "./helpers";

// C302-02 (Grace Hopper) is occupied in the seed; borrowing an inventory
// device onto it exercises "place" (secondary), returning it exercises
// "move to inventory" (the "leave device" side of moveDevice's intent).
// Uses ADMIN — a Manager can only manage devices they personally own, and
// this iPad belongs to Barbara Liskov, per the locked permission matrix.
test("borrowing an inventory device onto a seat, then returning it to inventory", async ({
  page,
}) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/rooms/C302?seat=C302-02");

  await page.getByRole("button", { name: "Add / borrow device" }).click();
  await page.getByRole("dialog").getByText("iPad Pro").click();
  await expect(page.locator("aside").getByText("iPad Pro")).toBeVisible();
  await expect(page.locator("aside").getByText("Borrowed", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Return .* to inventory/ }).click();
  await expect(page.locator("aside").getByText("iPad Pro")).toHaveCount(0);

  await page.goto("/devices");
  await page.getByLabel("Search devices").fill("iPad Pro");
  await page.waitForTimeout(500); // debounced server search
  await expect(page.getByText("iPad Pro")).toBeVisible();
  // location badge for the (now unplaced) row reads "Inventory" — scope past
  // the filter-chip label and column header, which also contain that word.
  await expect(
    page.locator("span.justify-self-start", { hasText: "Inventory" }),
  ).toHaveCount(1);
});

// --- DEV-01: Device CRUD UI -------------------------------------------------
// Uses ADMIN, who may manage any device (owner-or-admin per the permission
// matrix). The create form defaults the owner to the signed-in member, so no
// owner selection is needed for these admin flows.

async function createDeviceViaUI(page: import("@playwright/test").Page, name: string, inventory: string) {
  await page.goto("/devices");
  await page.getByRole("button", { name: "New device" }).click();
  const dialog = page.getByRole("dialog", { name: "New device" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Inventory number").fill(inventory);
  await dialog.getByRole("button", { name: "Create device" }).click();
  await expect(dialog).toBeHidden();
}

test("admin creates a device from the UI and it appears in the table", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await createDeviceViaUI(page, "QA Bench Laptop", "INV-QA-001");

  await page.getByLabel("Search devices").fill("QA Bench Laptop");
  await page.waitForTimeout(500); // debounced server search
  await expect(page.getByText("QA Bench Laptop")).toBeVisible();
});

test("admin edits a device and the change persists after reload", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await createDeviceViaUI(page, "QA Edit Target", "INV-QA-002");

  await page.getByLabel("Search devices").fill("QA Edit Target");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Edit QA Edit Target" }).click();

  const editDialog = page.getByRole("dialog", { name: "Edit device" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Name", { exact: true }).fill("QA Edited Name");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(editDialog).toBeHidden();

  // Reload to prove it persisted server-side, not just in local state.
  await page.reload();
  await page.getByLabel("Search devices").fill("QA Edited Name");
  await page.waitForTimeout(500);
  await expect(page.getByText("QA Edited Name")).toBeVisible();
});

test("admin deletes a device and the row disappears", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await createDeviceViaUI(page, "QA Delete Target", "INV-QA-003");

  await page.getByLabel("Search devices").fill("QA Delete Target");
  await page.waitForTimeout(500);
  page.once("dialog", (d) => d.accept()); // accept the window.confirm
  await page.getByRole("button", { name: "Delete QA Delete Target" }).click();

  await page.waitForTimeout(500);
  await expect(page.getByText("QA Delete Target")).toHaveCount(0);
});

// The backend deliberately has NO placed-device delete guard — deleting a
// device that's placed at a seat succeeds and detaches it (seatId FK is
// onDelete: SetNull). This asserts that real behavior. "Precision 3660" is
// seeded placed at C302-06.
test("deleting a placed device succeeds (no server-side guard)", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/devices");
  await page.getByLabel("Search devices").fill("Precision 3660");
  await page.waitForTimeout(500);
  await expect(
    page.locator("span.justify-self-start", { hasText: "C302-06" }),
  ).toHaveCount(1);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Precision 3660" }).click();

  await page.waitForTimeout(500);
  await expect(page.getByText("Precision 3660")).toHaveCount(0);
});
