const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const BASE = process.env.SITE_URL || "http://localhost:3000";

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — can't log in to test the UI.");
    process.exit(1);
  }

  // 1. Real login via the real API to get a real session cookie.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error("Login failed: " + (await loginRes.text()));
  const setCookie = loginRes.headers.get("set-cookie");
  let cookie = setCookie.split(";")[0];
  console.log("✓ Logged in, got cookie:", cookie.slice(0, 20) + "...");

  // 2. Build a DOM from the real dashboard.html file.
  const html = fs.readFileSync(path.join(__dirname, "..", "public/admin/dashboard.html"), "utf8");
  const dom = new JSDOM(html, {
    url: `${BASE}/admin/dashboard.html`,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // 3. Patch in fetch that carries our real cookie (jsdom's own network layer
  //    doesn't share Node's fetch/cookie jar) and a couple of browser APIs
  //    jsdom doesn't implement, so the real app code runs unmodified.
  window.fetch = async (url, opts = {}) => {
    const fullUrl = url.startsWith("http") ? url : BASE + url;
    const headers = { ...(opts.headers || {}), Cookie: cookie };
    const res = await fetch(fullUrl, { ...opts, headers });
    const newSetCookie = res.headers.get("set-cookie");
    if (newSetCookie) cookie = newSetCookie.split(";")[0];
    return res;
  };
  window.navigator.clipboard = { writeText: async () => {} };

  const errors = [];
  window.addEventListener("error", e => errors.push(e.error ? e.error.stack || e.error.message : e.message));

  // 4. Load each script file IN ORDER exactly as dashboard.html does, and
  //    let them execute against this window (runScripts:'dangerously' means
  //    <script src> tags in the parsed HTML will actually fetch+run — but
  //    jsdom fetching local files needs a resource loader; simplest robust
  //    path is to eval them manually against the window context).
  const scripts = ["js/api.js", "js/ui.js", "js/resource.js", "js/sections.js", "js/app.js"];
  for (const rel of scripts) {
    const code = fs.readFileSync(path.join(__dirname, "..", "public/admin", rel), "utf8");
    window.eval(code);
  }

  // 5. Give boot() (async, fires on load) time to run.
  await new Promise(r => setTimeout(r, 800));

  if (errors.length) {
    console.error("❌ Runtime errors during boot:");
    errors.forEach(e => console.error(e));
    process.exit(1);
  }

  const doc = window.document;
  console.log("✓ Boot completed with no thrown errors.");
  console.log("  userName:", doc.getElementById("userName").textContent);
  console.log("  userRole:", doc.getElementById("userRole").textContent);
  console.log("  nav button count:", doc.querySelectorAll(".admin-nav button").length);
  console.log("  overview content rendered:", doc.getElementById("content").innerHTML.includes("stat-card"));

  // 6. Click through EVERY nav section and confirm each renders without error.
  const navButtons = [...doc.querySelectorAll(".admin-nav button")];
  for (const btn of navButtons) {
    const key = btn.dataset.key;
    errors.length = 0;
    await window.goTo(key);
    await new Promise(r => setTimeout(r, 250));
    const contentHtml = doc.getElementById("content").innerHTML;
    const blank = contentHtml.trim().length === 0;
    const hasError = errors.length > 0;
    console.log(`  [${key}] ${hasError ? "❌ ERROR" : blank ? "⚠ EMPTY" : "✓ rendered " + contentHtml.length + " chars"}`);
    if (hasError) errors.forEach(e => console.error("    " + e));
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
