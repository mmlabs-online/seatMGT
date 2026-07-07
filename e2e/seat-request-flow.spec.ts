import { test, expect } from "@playwright/test";
import { MANAGER, USER, login } from "./helpers";

const SEAT = "C302-16"; // empty in the seed, untouched by other specs

test("a USER requests an empty seat, and MANAGER approving it seats them", async ({ browser }) => {
  const userCtx = await browser.newContext();
  const userPage = await userCtx.newPage();
  await login(userPage, USER.email, USER.password);
  await userPage.goto(`/rooms/C302?seat=${SEAT}`);
  await userPage.getByRole("button", { name: "Request this seat" }).click();
  await expect(userPage.getByText("Request pending")).toBeVisible();
  await userCtx.close();

  const managerCtx = await browser.newContext();
  const managerPage = await managerCtx.newPage();
  await login(managerPage, MANAGER.email, MANAGER.password);
  await managerPage.goto("/approvals");
  await expect(managerPage.getByText("Alan Turing")).toBeVisible();
  await managerPage.getByRole("button", { name: "Approve" }).click();
  await expect(managerPage.getByText("Alan Turing")).toHaveCount(0);

  await managerPage.goto(`/rooms/C302?seat=${SEAT}`);
  await expect(managerPage.locator("aside").getByText("Alan Turing")).toBeVisible();
  await managerCtx.close();
});
