/**
 * Lighthouse audit driver.
 *
 * Uses Playwright's bundled Chromium as the launcher (avoids needing a system
 * Chrome). Runs against the local dev server — note: dev mode injects HMR
 * scripts and disables some optimizations, so the Performance score is a
 * floor, not a ceiling. The Accessibility, Best Practices, and SEO scores
 * are largely dev-mode-independent.
 *
 * Usage:  node scripts/lighthouse-audit.js [url]
 * Output: scripts/lighthouse-report.json + scripts/lighthouse-report.html
 */
const path = require("path");
const fs = require("fs");
const chromeLauncher = require("chrome-launcher");

const PLAYWRIGHT_CHROME =
  "C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe";

async function main() {
  const targetUrl = process.argv[2] || "http://localhost:3000/auth/signin";
  const { default: lighthouse } = await import("lighthouse");

  const chrome = await chromeLauncher.launch({
    chromePath: fs.existsSync(PLAYWRIGHT_CHROME) ? PLAYWRIGHT_CHROME : undefined,
    chromeFlags: [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      // Force light color scheme so `prefers-color-scheme: light` media
      // queries match, and our next-themes "system" default resolves to
      // light. Without this, headless Chromium often reports dark, which
      // makes the audit see dark-mode tokens on a light-mode-tuned design.
      "--force-color-profile=srgb",
      "--force-prefers-color-scheme=light",
      "--blink-settings=preferredColorScheme=1",
    ],
  });

  const result = await lighthouse(
    targetUrl,
    {
      port: chrome.port,
      output: ["json", "html"],
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: "mobile",
      // Explicitly force light color scheme — without this, Lighthouse's
      // headless Chromium inherits the OS / headless default (often dark),
      // and our app's `next-themes` system preference then activates dark
      // mode for the audit, which doesn't match what real light-mode
      // users see.
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
      },
      throttlingMethod: "simulate",
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      },
      // Lighthouse v13 accepts extraChromeFlags; we pass the emulated
      // prefers-color-scheme via the page emulation as well.
      emulatedUserAgent:
        "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Lighthouse",
    }
  );

  const outDir = path.join(__dirname);
  fs.writeFileSync(
    path.join(outDir, "lighthouse-report.json"),
    result.report[0]
  );
  fs.writeFileSync(
    path.join(outDir, "lighthouse-report.html"),
    result.report[1]
  );

  // Print category scores in a machine-readable form
  const lhr = JSON.parse(result.report[0]);
  const summary = Object.fromEntries(
    Object.entries(lhr.categories).map(([k, v]) => [
      k,
      { score: Math.round((v.score || 0) * 100), title: v.title },
    ])
  );
  console.log("\n=== Lighthouse summary ===");
  console.log("URL:", targetUrl);
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${v.title.padEnd(16)} ${v.score}`);
  }

  // Top 5 issues across all categories
  const audits = Object.values(lhr.audits)
    .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "manual")
    .sort((a, b) => (a.score || 1) - (b.score || 1))
    .slice(0, 8);
  console.log("\n=== Top findings (lowest scores) ===");
  for (const a of audits) {
    console.log(`  [${Math.round((a.score || 0) * 100)}] ${a.id} — ${a.title}`);
  }

  await chrome.kill();
}

main().catch((e) => {
  console.error("Lighthouse run failed:", e);
  process.exit(1);
});
