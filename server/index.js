const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const securityHeaders = require("./middleware/security-headers");
const { attachSession } = require("./middleware/auth");
const { issueCsrfToken } = require("./middleware/csrf");
const { apiLimiter } = require("./middleware/rateLimit");

const app = express();

// Safety net: without this, an unhandled database error (e.g. a brief
// connection hiccup while a free-tier Postgres instance like Neon wakes
// from being idle) would crash the ENTIRE server process, not just fail
// the one request that hit it. This keeps the server itself alive; the
// specific request that failed will simply time out on the client side
// instead of taking the whole site down for everyone.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection (a request likely failed to respond):", reason);
});

// Behind a real reverse proxy (Render, Railway, nginx) this makes req.ip
// reflect the real client IP instead of the proxy's — needed for rate
// limiting and audit logs to mean anything in production.
app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));

const PUBLIC_DIR = path.join(__dirname, "..", "public");

// Static assets (CSS/JS/images/uploads) never need to know who's logged
// in — serve them immediately, before session/CSRF middleware, so a
// logged-in admin browsing the site doesn't trigger a database session
// lookup on every single CSS/JS/image request on the page (this was the
// main cause of the site feeling slow locally while logged into Admin).
// maxAge also lets the browser cache them across repeat page loads.
const assetOpts = { maxAge: "1d" };
app.use("/css", express.static(path.join(PUBLIC_DIR, "css"), assetOpts));
app.use("/js", express.static(path.join(PUBLIC_DIR, "js"), assetOpts));
app.use("/images", express.static(path.join(PUBLIC_DIR, "images"), assetOpts));
app.use("/uploads", express.static(path.join(PUBLIC_DIR, "uploads"), assetOpts));
app.use("/admin/css", express.static(path.join(PUBLIC_DIR, "admin", "css"), assetOpts));
app.use("/admin/js", express.static(path.join(PUBLIC_DIR, "admin", "js"), assetOpts));

app.use(cookieParser());
app.use(attachSession);
app.use(issueCsrfToken);

// ---- API routes ----
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/public", apiLimiter, require("./routes/public.routes"));
app.use("/api/admin", apiLimiter, require("./routes/admin/index.routes"));

// sitemap.xml / robots.txt live at the site root (SEO convention), generated
// live from published content — not nested under /api.
const { buildSitemapXml, buildRobotsTxt } = require("./lib/sitemap");
app.get("/sitemap.xml", async (req, res) => res.type("application/xml").send(await buildSitemapXml()));
app.get("/robots.txt", (req, res) => res.type("text/plain").send(buildRobotsTxt()));

// ---- Server-side gate for the admin dashboard HTML itself ----
// A logged-out visitor never even receives the dashboard markup — this is
// enforced here, not just on the API calls the page happens to make.
app.get(["/admin", "/admin/", "/admin/index.html", "/admin/dashboard.html"], (req, res) => {
  if (!req.user) return res.redirect("/admin/login.html");
  res.sendFile(path.join(PUBLIC_DIR, "admin", "dashboard.html"));
});

app.use(express.static(PUBLIC_DIR, { extensions: ["html"], maxAge: "10m" }));

// ---- 404 ----
app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  const notFoundPath = path.join(PUBLIC_DIR, "404.html");
  if (fs.existsSync(notFoundPath)) return res.status(404).sendFile(notFoundPath);
  res.status(404).send("Not found.");
});

// ---- Error handler — never leaks internals to the client ----
app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  if (config.NODE_ENV !== "production") console.error(err.stack);
  if (req.path.startsWith("/api/")) {
    return res.status(err.status || 500).json({ error: config.isProd ? "Something went wrong." : err.message });
  }
  res.status(err.status || 500).send("Something went wrong.");
});

app.listen(config.PORT, () => {
  console.log(`Prince Digital Labs server running at http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

module.exports = app;
