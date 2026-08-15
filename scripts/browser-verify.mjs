import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = process.env.FORK_URL ?? "http://localhost:3000";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const screenshotRoot = path.resolve(".fork", "screenshots");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await mkdir(screenshotRoot, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert((await page.locator("body").innerText()).trim().length > 0, "Page is blank");
  assert((await page.getByText("FORK", { exact: true }).count()) > 0, "FORK brand is missing");
  assert((await page.locator("[data-candidate]").count()) === 3, "Expected 3 candidate lanes");
  assert(
    (await page.locator("[data-nextjs-dialog], .vite-error-overlay").count()) === 0,
    "Framework error overlay is visible",
  );
  await page.screenshot({ path: path.join(screenshotRoot, "empty-desktop.png"), fullPage: true });

  const demoResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/demo") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run demo" }).click();
  const demoResponse = await demoResponsePromise;
  assert(demoResponse.status() === 202, `Demo API returned ${demoResponse.status()}`);
  const demoPayload = await demoResponse.json();
  assert(typeof demoPayload?.run?.id === "string", "Demo response did not include a run");

  await page.getByText(/Preparing worktrees|Candidates running|Selecting winner|Run complete/).waitFor({
    timeout: 30_000,
  });
  await page.screenshot({ path: path.join(screenshotRoot, "running-desktop.png"), fullPage: true });

  await page.getByText("Run complete", { exact: true }).waitFor({ timeout: 240_000 });
  assert((await page.getByText("Winner", { exact: true }).count()) > 0, "Winner label is missing");
  assert(
    (await page.getByRole("button", { name: /Open winning PR/i }).count()) > 0,
    "Winning PR action is missing",
  );
  await page.screenshot({ path: path.join(screenshotRoot, "winner-desktop.png"), fullPage: true });

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  assert(!overflow, "Mobile page has viewport-level horizontal overflow");
  await mobile.screenshot({ path: path.join(screenshotRoot, "empty-mobile.png"), fullPage: true });

  assert(browserErrors.length === 0, `Browser console errors: ${browserErrors.join(" | ")}`);
  console.log(
    JSON.stringify({
      ok: true,
      runId: demoPayload.run.id,
      screenshots: screenshotRoot,
      consoleErrors: browserErrors,
    }),
  );
} finally {
  await browser.close();
}
