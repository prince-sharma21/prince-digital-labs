const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const BASE = process.env.SITE_URL || "http://localhost:3000";
let overallFail = false;

/** Loads a public page's HTML, runs site.js + the given page scripts against
 * a real jsdom window wired to the real running server, and returns any
 * runtime errors plus the final #<mainSelector> HTML for assertions. */
async function loadPage(htmlFile, pageScripts, { queryString = "" } = {}) {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", htmlFile), "utf8");
  const dom = new JSDOM(html, {
    url: `${BASE}/${htmlFile}${queryString}`,
    runScripts: "outside-only", // we eval scripts ourselves below; this stops jsdom from
    pretendToBeVisual: true,     // ALSO auto-running the <script src> tags already in the HTML,
  });                             // which would otherwise race/duplicate our manual execution.
  const { window } = dom;
  window.fetch = (url, opts) => fetch(url.startsWith("http") ? url : BASE + url, opts);

  const errors = [];
  window.addEventListener("error", e => errors.push(e.error ? e.error.stack || e.error.message : e.message));

  // Concatenate into one script so top-level `const`/`let` in site.js is
  // reliably visible to the page script that follows it in the same eval.
  const combined = ["js/site.js", ...pageScripts]
    .map(rel => fs.readFileSync(path.join(__dirname, "..", "public", rel), "utf8"))
    .join("\n;\n");
  try {
    window.eval(combined);
  } catch (err) {
    errors.push(err.stack || err.message);
  }
  await new Promise(r => setTimeout(r, 700));
  return { window, doc: window.document, errors };
}

function report(label, errors, checks) {
  const failedChecks = checks.filter(c => !c.ok);
  const ok = errors.length === 0 && failedChecks.length === 0;
  console.log(`  [${label}] ${ok ? "✓ pass" : "❌ FAIL"}`);
  if (errors.length) errors.forEach(e => console.log("      JS error: " + e));
  failedChecks.forEach(c => console.log("      check failed: " + c.name));
  if (!ok) overallFail = true;
  return ok;
}

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — can't create temp content to test against.");
    process.exit(1);
  }

  // Log in and create one temp published blog post + landing page so the
  // "has real content" render path gets exercised, not just empty states.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  const cookie = loginRes.headers.get("set-cookie").split(";")[0];
  const meRes = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
  const { csrfToken } = await meRes.json();
  const adminHeaders = { "Content-Type": "application/json", Cookie: cookie, "X-CSRF-Token": csrfToken };

  const postRes = await fetch(`${BASE}/api/admin/blog/posts`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ title: "UI Test Post", body_html: "<p>Test content.</p>", status: "published", tags: ["testing"] }),
  });
  const post = await postRes.json();

  const landingRes = await fetch(`${BASE}/api/admin/landing`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ headline: "UI Test Landing Page", subheadline: "Testing subhead", published: 1, body_sections: [{ heading: "Why us", text: "Because we test our work." }] }),
  });
  const landing = await landingRes.json();

  console.log(`Testing public pages against ${BASE} ...\n`);

  {
    const { errors, doc } = await loadPage("index.html", ["js/pages/home.js"]);
    report("index.html", errors, [
      { name: "services preview populated", ok: doc.getElementById("servicesPreview").children.length > 0 },
      { name: "process steps populated", ok: doc.getElementById("processRow").children.length === 5 },
      { name: "faq list populated", ok: doc.getElementById("faqList").children.length > 0 },
      { name: "footer rendered", ok: doc.getElementById("site-footer").innerHTML.length > 0 },
    ]);
  }
  {
    const { errors, doc } = await loadPage("about.html", ["js/pages/about.js"]);
    report("about.html", errors, [{ name: "header rendered", ok: doc.getElementById("site-header").innerHTML.includes("nav-links") }]);
  }
  {
    const { errors, doc } = await loadPage("services.html", ["js/pages/services.js"]);
    report("services.html", errors, [{ name: "all 11 seeded services rendered", ok: doc.getElementById("servicesGrid").children.length === 11 }]);
  }
  {
    const { errors, doc } = await loadPage("pricing.html", ["js/pages/pricing.js"]);
    report("pricing.html", errors, [
      { name: "8 category tabs rendered", ok: doc.getElementById("pricingTabs").children.length === 8 },
      { name: "price cards rendered for active tab", ok: doc.querySelectorAll(".price-card").length > 0 },
    ]);
  }
  {
    const { errors, doc } = await loadPage("portfolio.html", ["js/pages/portfolio.js"]);
    report("portfolio.html", errors, [{ name: "4 seeded portfolio projects rendered", ok: doc.getElementById("portfolioGrid").children.length === 4 }]);
  }
  {
    const { errors, doc } = await loadPage("blog.html", ["js/pages/blog.js"]);
    report("blog.html", errors, [{ name: "the temp published post appears in the list", ok: doc.getElementById("blogGrid").innerHTML.includes("UI Test Post") }]);
  }
  {
    const { errors, doc } = await loadPage("blog-post.html", ["js/pages/blog-post.js"], { queryString: "" });
    report("blog-post.html (no slug)", errors, [{ name: "shows a graceful empty state, not a crash", ok: doc.querySelector(".empty-state") !== null }]);
  }
  {
    const { errors, doc } = await loadPage("blog-post.html", ["js/pages/blog-post.js"], { queryString: `?slug=${post.slug}` });
    report("blog-post.html (real post)", errors, [
      { name: "post title rendered", ok: doc.querySelector(".post-body")?.textContent.includes("UI Test Post") },
      { name: "tag rendered", ok: doc.body.innerHTML.includes("testing") },
    ]);
  }
  {
    const { errors, doc } = await loadPage("contact.html", ["js/pages/contact.js"]);
    report("contact.html", errors, [{ name: "form rendered", ok: doc.getElementById("contactForm") !== null }]);
  }
  {
    const { errors, doc } = await loadPage("privacy.html", ["js/pages/privacy.js"]);
    report("privacy.html", errors, [{ name: "last-updated date filled in", ok: doc.getElementById("lastUpdated").textContent.length > 0 }]);
  }
  {
    const { errors, doc } = await loadPage("terms.html", ["js/pages/terms.js"]);
    report("terms.html", errors, [{ name: "last-updated date filled in", ok: doc.getElementById("lastUpdated").textContent.length > 0 }]);
  }
  {
    const { errors, doc } = await loadPage("404.html", ["js/pages/404.js"]);
    report("404.html", errors, [{ name: "header rendered", ok: doc.getElementById("site-header").innerHTML.length > 0 }]);
  }
  {
    const { errors, doc } = await loadPage("landing.html", ["js/pages/landing.js"], { queryString: `?slug=${landing.slug}` });
    report("landing.html (real page)", errors, [
      { name: "headline rendered", ok: doc.body.innerHTML.includes("UI Test Landing Page") },
      { name: "body section rendered", ok: doc.body.innerHTML.includes("Why us") },
      { name: "lead form rendered", ok: doc.getElementById("leadForm") !== null },
    ]);
  }

  // Cleanup: remove the temp post/landing page we created for testing.
  await fetch(`${BASE}/api/admin/blog/posts/${post.id}`, { method: "DELETE", headers: adminHeaders });
  await fetch(`${BASE}/api/admin/landing/${landing.id}`, { method: "DELETE", headers: adminHeaders });
  console.log("\n(temp test post + landing page cleaned up)");

  console.log(overallFail ? "\nSome public pages FAILED." : "\nAll public pages passed.");
  process.exit(overallFail ? 1 : 0);
}

main().catch(err => {
  console.error("Public UI test crashed:", err);
  process.exit(1);
});
