import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = process.env.FORK_URL ?? "http://localhost:3000";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outRoot = path.resolve(".fork", "screenshots");
const runId = process.env.FORK_RUN_ID ?? "run-mstv72jz-25f33813";

await mkdir(outRoot, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("PAGE ERROR:", error.message));

  // Fresh account so the dashboard renders authenticated.
  await page.goto(`${baseUrl}/sign-up`, { waitUntil: "networkidle" });
  const email = "team@fork.dev";
  const password = "fork-video-shot";
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
  await page.getByRole("heading", { name: "Run the task three ways." }).waitFor();
  // Let the dashboard entrance motion settle.
  await page.waitForTimeout(2200);

  // 1. Dashboard top: nav + composer — full-bleed source for the product shot.
  await page.screenshot({ path: path.join(outRoot, "video-dashboard-top.png") });
  // 2. Composer section element (clean crop).
  const composer = page.locator('section[aria-labelledby="new-run-heading"]');
  await composer.screenshot({ path: path.join(outRoot, "video-composer.png") });

  // 3. Run detail — winner card + candidate evidence.
  await page.goto(`${baseUrl}/dashboard/runs/${encodeURIComponent(runId)}`, {
    waitUntil: "networkidle",
  });
  await page.locator("[data-candidate]").first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(2200);

  const winner = page.locator('section[aria-labelledby="winner-heading"]');
  await winner.screenshot({ path: path.join(outRoot, "video-winner.png") });

  const evidence = page.locator('section[aria-labelledby="candidate-results-heading"]');
  await evidence.screenshot({ path: path.join(outRoot, "video-evidence.png") });

  await page.screenshot({ path: path.join(outRoot, "video-run-detail-full.png"), fullPage: true });

  console.log(JSON.stringify({ ok: true, account: email, runId, out: outRoot }));
} finally {
  await browser.close();
}
