const express = require("express");
const db = require("../db");
const { contactLimiter } = require("../middleware/rateLimit");
const { isEmail, isNonEmptyString, isOptionalString } = require("../lib/validate");
const { stripAllHtml } = require("../lib/sanitize");
const { logAudit } = require("../lib/audit");

const router = express.Router();

const j = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};

// GET /api/public/settings — site-wide config (brand, contact, social, SEO defaults)
router.get("/settings", async (req, res) => {
  const rows = await db.prepare(`SELECT key, value FROM site_settings`).all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

// GET /api/public/services
router.get("/services", async (req, res) => {
  const raw = await db.prepare(`SELECT * FROM services WHERE published = 1 ORDER BY sort_order ASC, id ASC`).all();
  const rows = raw.map(s => ({
    ...s,
    benefits: j(s.benefits, []),
    process: j(s.process, []),
    features: j(s.features, []),
    faqs: j(s.faqs, []),
  }));
  res.json(rows);
});

// GET /api/public/services/:slug
router.get("/services/:slug", async (req, res) => {
  const s = await db.prepare(`SELECT * FROM services WHERE slug = ? AND published = 1`).get(req.params.slug);
  if (!s) return res.status(404).json({ error: "Not found." });
  res.json({ ...s, benefits: j(s.benefits, []), process: j(s.process, []), features: j(s.features, []), faqs: j(s.faqs, []) });
});

// GET /api/public/pricing
router.get("/pricing", async (req, res) => {
  const categories = await db.prepare(`SELECT * FROM pricing_categories WHERE published = 1 ORDER BY sort_order ASC, id ASC`).all();
  const pkgStmt = db.prepare(`SELECT * FROM pricing_packages WHERE category_id = ? AND published = 1 ORDER BY sort_order ASC, id ASC`);
  const result = await Promise.all(
    categories.map(async cat => {
      const pkgs = await pkgStmt.all(cat.id);
      return { ...cat, packages: pkgs.map(p => ({ ...p, features: j(p.features, []) })) };
    })
  );
  res.json(result);
});

// GET /api/public/portfolio
router.get("/portfolio", async (req, res) => {
  const raw = await db.prepare(`SELECT * FROM portfolio_projects WHERE published = 1 ORDER BY featured DESC, sort_order ASC, id DESC`).all();
  const rows = raw.map(p => ({ ...p, images: j(p.images, []), services: j(p.services, []), technologies: j(p.technologies, []), is_demo: !!p.is_demo }));
  res.json(rows);
});

// GET /api/public/testimonials
router.get("/testimonials", async (req, res) => {
  const rows = await db.prepare(`SELECT id, client_name, company, quote, rating, image_url FROM testimonials WHERE published = 1 ORDER BY id DESC`).all();
  res.json(rows);
});

// GET /api/public/faqs
router.get("/faqs", async (req, res) => {
  const rows = await db.prepare(`SELECT id, question, answer FROM faqs WHERE published = 1 ORDER BY sort_order ASC, id ASC`).all();
  res.json(rows);
});

// GET /api/public/notifications — only currently-active ones
router.get("/notifications", async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT id, message, cta_label, cta_link FROM notifications
       WHERE published = 1
         AND (starts_at IS NULL OR starts_at::timestamptz <= datetime('now'))
         AND (ends_at IS NULL OR ends_at::timestamptz >= datetime('now'))
       ORDER BY id DESC`
    )
    .all();
  res.json(rows);
});

// GET /api/public/blog?page=
router.get("/blog", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = 9;
  const offset = (page - 1) * pageSize;

  const rows = await db
    .prepare(
      `SELECT bp.id, bp.slug, bp.title, bp.excerpt, bp.featured_image, bp.created_at, bp.updated_at,
              bc.name AS category_name, bc.slug AS category_slug
       FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bc.id = bp.category_id
       WHERE bp.status = 'published' AND (bp.publish_at IS NULL OR bp.publish_at::timestamptz <= datetime('now'))
       ORDER BY COALESCE(bp.publish_at, bp.created_at) DESC
       LIMIT ? OFFSET ?`
    )
    .all(pageSize, offset);

  const total = parseInt((await db.prepare(`SELECT COUNT(*) AS n FROM blog_posts WHERE status = 'published'`).get()).n, 10);
  res.json({ posts: rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

// GET /api/public/blog/:slug
router.get("/blog/:slug", async (req, res) => {
  const post = await db
    .prepare(
      `SELECT bp.*, bc.name AS category_name, bc.slug AS category_slug, u.name AS author_name
       FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bc.id = bp.category_id
       LEFT JOIN users u ON u.id = bp.author_id
       WHERE bp.slug = ? AND bp.status = 'published'`
    )
    .get(req.params.slug);
  if (!post) return res.status(404).json({ error: "Not found." });
  const tags = await db
    .prepare(`SELECT t.name, t.slug FROM blog_tags t JOIN blog_post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?`)
    .all(post.id);
  res.json({ ...post, tags });
});

// GET /api/public/landing/:slug
router.get("/landing/:slug", async (req, res) => {
  const page = await db.prepare(`SELECT * FROM landing_pages WHERE slug = ? AND published = 1`).get(req.params.slug);
  if (!page) return res.status(404).json({ error: "Not found." });
  res.json({ ...page, body_sections: j(page.body_sections, []) });
});

// POST /api/public/contact — creates a lead. This is the one public
// endpoint that writes to the database, so it gets its own rate limit
// and full validation.
router.post("/contact", contactLimiter, async (req, res) => {
  const body = req.body || {};
  const name = isNonEmptyString(body.name, 200) ? stripAllHtml(body.name.trim()) : null;
  const email = isEmail(body.email) ? body.email.trim() : null;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and a valid email are required." });
  }
  if (!isOptionalString(body.phone, 40) || !isOptionalString(body.company, 200) || !isOptionalString(body.message, 5000)) {
    return res.status(400).json({ error: "One of the fields is too long." });
  }

  const stmt = db.prepare(
    `INSERT INTO leads (name, email, phone, company, service_interest, message, source_page, utm_source, utm_medium, utm_campaign, utm_content, ip)
     VALUES (@name, @email, @phone, @company, @service_interest, @message, @source_page, @utm_source, @utm_medium, @utm_campaign, @utm_content, @ip)`
  );
  const info = await stmt.run({
    name,
    email,
    phone: body.phone ? stripAllHtml(String(body.phone).trim()) : null,
    company: body.company ? stripAllHtml(String(body.company).trim()) : null,
    service_interest: body.service ? stripAllHtml(String(body.service).slice(0, 200)) : null,
    message: body.message ? stripAllHtml(String(body.message).trim()) : null,
    source_page: body.sourcePage ? String(body.sourcePage).slice(0, 300) : null,
    utm_source: body.utm_source ? String(body.utm_source).slice(0, 200) : null,
    utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 200) : null,
    utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 200) : null,
    utm_content: body.utm_content ? String(body.utm_content).slice(0, 200) : null,
    ip: req.ip,
  });

  logAudit({ user: null, action: "lead_created", entity: "lead", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json({ ok: true, message: "Thanks — we'll be in touch soon." });
});

module.exports = router;
