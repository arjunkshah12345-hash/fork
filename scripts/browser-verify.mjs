import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert((await page.locator("body").innerText()).trim().length > 0, "Landing page is blank");
  assert((await page.getByText("FORK", { exact: true }).count()) > 0, "FORK brand is missing");
  await page.getByRole("heading", { name: "Speculative execution for coding agents." }).waitFor();
  const shader = page.locator("[data-speculative-shader]");
  await shader.waitFor();
  await page.waitForFunction(
    () => {
      const renderer = document
        .querySelector("[data-speculative-shader]")
        ?.getAttribute("data-renderer");
      return renderer === "webgl2" || renderer === "webgl1";
    },
  );
  const shaderRenderer = await shader.getAttribute("data-renderer");
  assert(
    shaderRenderer === "webgl2" || shaderRenderer === "webgl1",
    `Shader did not initialize WebGL: ${shaderRenderer}`,
  );
  const shaderFrameA = await shader.screenshot();
  await page.waitForTimeout(450);
  const shaderFrameB = await shader.screenshot();
  const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");
  assert(digest(shaderFrameA) !== digest(shaderFrameB), "Shader field is not animating");
  assert(
    (await page.locator("[data-nextjs-dialog], .vite-error-overlay").count()) === 0,
    "Framework error overlay is visible on the landing page",
  );
  await page.screenshot({ path: path.join(screenshotRoot, "landing-desktop.png"), fullPage: true });

  await page.getByRole("link", { name: /Start running/i }).first().click();
  await page.waitForURL(/\/sign-in\?next=/);
  await page.getByRole("link", { name: "Create one" }).click();
  await page.waitForURL(/\/sign-up/);
  await page.screenshot({ path: path.join(screenshotRoot, "sign-up-desktop.png"), fullPage: true });

  const email = `browser-${Date.now()}@fork.local`;
  const password = "fork-browser-verification";
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
  await page.getByRole("heading", { name: "Run the task three ways." }).waitFor();
  assert(
    (await page.getByRole("button", { name: /Sign out/i }).count()) === 1,
    "Authenticated account control is missing",
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotRoot, "dashboard-desktop.png"), fullPage: true });

  const runsResponse = await context.request.get(`${baseUrl}/api/runs`);
  assert(runsResponse.ok(), `Runs API returned ${runsResponse.status()}`);
  const runsPayload = await runsResponse.json();
  const completedRun = runsPayload?.runs?.find((run) => run?.status === "complete" && run?.winnerId);
  if (completedRun?.id) {
    await page.goto(`${baseUrl}/dashboard/runs/${encodeURIComponent(completedRun.id)}`, {
      waitUntil: "networkidle",
    });
    assert((await page.locator("[data-candidate]").count()) === 3, "Expected 3 candidate results");
    assert((await page.getByText("Selected winner", { exact: true }).count()) === 1, "Winner is missing");
    assert(
      (await page.getByRole("button", { name: /Open winning PR/i }).count()) === 1,
      "Winning PR action is missing",
    );
    await page.screenshot({ path: path.join(screenshotRoot, "run-detail-desktop.png"), fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  assert(!overflow, "Dashboard has viewport-level horizontal overflow on mobile");
  await page.screenshot({ path: path.join(screenshotRoot, "dashboard-mobile.png"), fullPage: true });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const landingOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  assert(!landingOverflow, "Landing page has viewport-level horizontal overflow on mobile");
  await page.screenshot({ path: path.join(screenshotRoot, "landing-mobile.png"), fullPage: true });

  const reducedContext = await browser.newContext({
    viewport: { width: 900, height: 700 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  reducedPage.on("pageerror", (error) => browserErrors.push(error.message));
  await reducedPage.goto(baseUrl, { waitUntil: "networkidle" });
  const reducedShader = reducedPage.locator("[data-speculative-shader]");
  await reducedPage.waitForFunction(() => {
    const renderer = document
      .querySelector("[data-speculative-shader]")
      ?.getAttribute("data-renderer");
    return renderer === "webgl2" || renderer === "webgl1";
  });
  const reducedFrameA = await reducedShader.screenshot();
  await reducedPage.waitForTimeout(450);
  const reducedFrameB = await reducedShader.screenshot();
  assert(
    digest(reducedFrameA) === digest(reducedFrameB),
    "Reduced-motion shader should render a stable still frame",
  );
  await reducedContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 900, height: 700 } });
  await fallbackContext.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl" || type === "webgl2") return null;
      return getContext.call(this, type, ...args);
    };
  });
  const fallbackPage = await fallbackContext.newPage();
  fallbackPage.on("pageerror", (error) => browserErrors.push(error.message));
  await fallbackPage.goto(baseUrl, { waitUntil: "networkidle" });
  const fallbackShader = fallbackPage.locator("[data-speculative-shader]");
  assert(
    (await fallbackShader.getAttribute("data-renderer")) === "fallback",
    "Shader fallback state is missing when WebGL is unavailable",
  );
  assert(
    (await fallbackShader.locator("svg").evaluate((element) => getComputedStyle(element).opacity)) ===
      "1",
    "Shader fallback artwork is not visible",
  );
  await fallbackContext.close();

  assert(browserErrors.length === 0, `Browser console errors: ${browserErrors.join(" | ")}`);
  console.log(
    JSON.stringify({
      ok: true,
      account: email,
      shaderRenderer,
      inspectedRunId: completedRun?.id ?? null,
      screenshots: screenshotRoot,
      consoleErrors: browserErrors,
    }),
  );
} finally {
  await browser.close();
}
