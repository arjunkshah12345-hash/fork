import { chromium } from "playwright-core";

const baseUrl = process.env.FORK_URL ?? "http://localhost:3000";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/sign-up`, { waitUntil: "networkidle" });
  const email = `setup-${Date.now()}@fork.local`;
  const password = "fork-setup-verification";
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
  await page.getByRole("heading", { name: "Run the task three ways." }).waitFor();

  // 1. The SuperCompress connect panel is the FIRST thing on the dashboard.
  const setupHeading = page.getByRole("heading", { name: /Link your SuperCompress account/i });
  await setupHeading.waitFor();
  const composerHeading = page.getByRole("heading", { name: "Run the task three ways." });
  const setupBox = await setupHeading.boundingBox();
  const composerBox = await composerHeading.boundingBox();
  assert(setupBox && composerBox && setupBox.y < composerBox.y, "Setup panel must come before the composer");
  console.log("✓ SuperCompress setup panel is the first thing on the dashboard");

  // 2. The composer's SuperCompress toggle is locked until linked.
  const toggle = page.getByRole("checkbox", { name: /SuperCompress/i });
  assert(await toggle.isDisabled(), "SuperCompress toggle must be disabled before linking");
  assert(await toggle.isChecked(), "SuperCompress toggle stays on by default");
  console.log("✓ Composer SuperCompress toggle is locked (and on) until the account is linked");

  // 3. An invalid API key is rejected with a clear message from the server.
  await page.getByLabel("API key").fill("sk-definitely-invalid-key");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  const setupRegion = page.getByRole("region", { name: /Link your SuperCompress/i });
  await setupRegion.getByRole("alert").waitFor({ timeout: 20_000 });
  const errorText = await setupRegion.getByRole("alert").innerText();
  console.log(`✓ Invalid key rejected with a clear message: "${errorText.trim()}"`);

  // 4. The API still reports unlinked afterwards.
  const status = await context.request.get(`${baseUrl}/api/settings/supercompress`);
  const payload = await status.json();
  assert(payload.linked === false, "Account must remain unlinked after a rejected key");
  console.log("✓ Settings API confirms the account is still unlinked");

  console.log(JSON.stringify({ ok: true }));
} finally {
  await browser.close();
}
