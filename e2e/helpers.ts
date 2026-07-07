import type { Page } from "@playwright/test";

export const DEMO_PASSWORD = "Password123!";
export const ADMIN = { email: "admin@example.com", password: DEMO_PASSWORD };
export const MANAGER = { email: "manager@example.com", password: DEMO_PASSWORD };
export const USER = { email: "user@example.com", password: DEMO_PASSWORD };

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
}
