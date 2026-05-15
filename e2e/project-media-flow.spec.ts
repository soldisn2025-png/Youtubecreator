import { expect, test } from "@playwright/test";

test.describe("project media workflow", () => {
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for browser workflow tests.");

  test("creates a project and exposes photo, clip, approval, and render controls", async ({ page }) => {
    const stamp = Date.now();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Your projects" })).toBeVisible();

    await page.getByRole("button", { name: "+ New project" }).click();
    await page.getByLabel("Topic *").fill(`ABA visual supports ${stamp}`);
    await page.getByLabel("Audience *").fill("Parents of children with autism");
    await page.getByLabel("Bullet notes / outline *").fill("- Show routine cards\n- Model simple language\n- Celebrate progress");
    await page.getByLabel("Call to action *").fill("Subscribe for more practical ABA tips");
    await page.getByRole("button", { name: "5 min" }).click();
    await page.getByLabel("Voice").selectOption("onyx");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(page.getByRole("heading", { name: `ABA visual supports ${stamp}` })).toBeVisible();
    await expect(page.getByRole("button", { name: /Photos/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clips/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create draft" })).toBeVisible();
    await expect(page.getByText("Approve all scenes to unlock render and export.")).toBeVisible();
  });
});
