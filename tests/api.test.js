/**
 * SMOKE TEST — exercises the real running server end-to-end:
 * public API, auth, CSRF protection, admin CRUD, and the contact→lead
 * flow. Run with the server already running: `npm run test:api`
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env to log in.
 */
require("dotenv").config();
const BASE = process.env.SITE_URL || "http://localhost:3000";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

// tiny manual cookie jar since we're not in a browser
let cookieJar = "";
function saveCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
  for (const c of raw) cookieJar = c.split(";")[0];
}
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(cookieJar ? { Cookie: cookieJar } : {}), ...(opts.headers || {}) },
    redirect: "manual",
  });
  saveCookies(res);
  return res;
}

async function main() {
  console.log(`Smoke testing ${BASE} ...\n`);

  // ---- Public API ----
  console.log("Public API:");
  let r = await req("/api/public/services");
  let services = await r.json();
  check("GET /api/public/services returns seeded services", r.status === 200 && services.length === 11, `(got ${services.length})`);

  r = await req("/api/public/pricing");
  let pricing = await r.json();
  check("GET /api/public/pricing returns categories with packages", r.status === 200 && pricing.length > 0 && pricing[0].packages.length > 0);

  r = await req("/api/public/testimonials");
  let testimonials = await r.json();
  check("GET /api/public/testimonials is honestly empty (no invented testimonials)", Array.isArray(testimonials) && testimonials.length === 0);

  r = await req("/api/public/settings");
  let settings = await r.json();
  check("GET /api/public/settings has brand_name set", settings.brand_name === "Prince Digital Labs");
  check("GET /api/public/settings leaves contact_email empty (not invented)", !settings.contact_email);

  // ---- Security: admin locked down when logged out ----
  console.log("\nSecurity (logged out):");
  r = await req("/api/admin/leads");
  check("GET /api/admin/leads without auth -> 401", r.status === 401);

  r = await req("/admin");
  check("GET /admin without auth -> redirects to login (not the dashboard)", r.status >= 300 && r.status < 400 && (r.headers.get("location") || "").includes("login"));

  r = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "owner@test.local", password: "definitely-wrong" }) });
  check("POST wrong password -> 401", r.status === 401);

  // ---- Auth ----
  console.log("\nAuthentication:");
  r = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  let loginBody = await r.json();
  check("POST correct credentials -> 200 + session cookie set", r.status === 200 && cookieJar.length > 0);

  r = await req("/api/auth/me");
  let me = await r.json();
  check("GET /api/auth/me returns the logged-in owner", me.user && me.user.role === "owner");
  const csrfToken = me.csrfToken;
  check("A CSRF token was issued", Boolean(csrfToken));

  // ---- CSRF protection ----
  console.log("\nCSRF protection:");
  r = await req("/api/admin/faqs", { method: "POST", body: JSON.stringify({ question: "No CSRF token test", answer: "should fail" }) });
  check("POST without CSRF token -> 403", r.status === 403);

  r = await req("/api/admin/faqs", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ question: "Do you offer ongoing support after launch?", answer: "Yes — see our Website Maintenance plans." }),
  });
  let newFaq = await r.json();
  check("POST with valid CSRF token -> 201 (real row created)", r.status === 201 && newFaq.id);

  // ---- CRUD round-trip: verify the write actually reflects publicly ----
  console.log("\nCRUD → public reflection (the actual point of a CMS):");
  r = await req("/api/public/faqs");
  let publicFaqs = await r.json();
  check("New FAQ appears on the public site immediately", publicFaqs.some(f => f.id === newFaq.id));

  r = await req(`/api/admin/faqs/${newFaq.id}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ published: 0 }),
  });
  check("PUT to unpublish -> 200", r.status === 200);
  r = await req("/api/public/faqs");
  publicFaqs = await r.json();
  check("Unpublished FAQ disappears from public API", !publicFaqs.some(f => f.id === newFaq.id));

  r = await req(`/api/admin/faqs/${newFaq.id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } });
  check("DELETE the test FAQ -> 200 (cleanup)", r.status === 200);

  // ---- Contact form -> lead ----
  console.log("\nContact form -> lead pipeline:");
  cookieJar = ""; // simulate a logged-out visitor submitting the form
  r = await req("/api/public/contact", {
    method: "POST",
    body: JSON.stringify({ name: "Test Visitor", email: "visitor@example.com", message: "Interested in a website.", service: "Website Development", utm_source: "google", utm_campaign: "smoke-test" }),
  });
  check("POST /api/public/contact -> 201", r.status === 201);

  // log back in to check the admin side received it
  r = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
  r = await req("/api/auth/me");
  me = await r.json();
  r = await req("/api/admin/leads?status=new");
  let leads = await r.json();
  check("The submitted lead appears in Admin with status 'new'", leads.some(l => l.email === "visitor@example.com"));
  check("UTM data was captured on the lead", leads.some(l => l.email === "visitor@example.com" && l.utm_campaign === "smoke-test"));

  // ---- Security headers ----
  console.log("\nSecurity headers:");
  r = await req("/");
  check("Content-Security-Policy header present", Boolean(r.headers.get("content-security-policy")));
  check("X-Content-Type-Options: nosniff present", r.headers.get("x-content-type-options") === "nosniff");

  // ---- Logout actually invalidates the session server-side ----
  console.log("\nLogout:");
  r = await req("/api/auth/me");
  me = await r.json();
  const csrf2 = me.csrfToken;
  r = await req("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrf2 } });
  check("POST /api/auth/logout -> 200", r.status === 200);
  r = await req("/api/admin/leads");
  check("Session is truly dead server-side after logout (not just cookie-cleared client-side)", r.status === 401);

  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
