const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isNonEmptyString, isSlug, slugify, toBit } = require("../../lib/validate");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

const j = (v, fb) => { try { return v ? JSON.parse(v) : fb; } catch { return fb; } };

router.get("/", async (req, res) => {
  const rows = await db.prepare(`SELECT * FROM landing_pages ORDER BY updated_at DESC`).all();
  res.json(rows.map(p => ({ ...p, body_sections: j(p.body_sections, []) })));
});

router.post("/", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.headline, 300)) return res.status(400).json({ error: "Headline is required." });
  const slug = isSlug(b.slug) ? b.slug : slugify(b.headline);
  if (await db.prepare(`SELECT id FROM landing_pages WHERE slug = ?`).get(slug)) {
    return res.status(409).json({ error: "A landing page with that slug already exists." });
  }
  const info = await db
    .prepare(
      `INSERT INTO landing_pages (slug, headline, subheadline, related_service_slug, body_sections, seo_title, seo_description, published)
       VALUES (@slug, @headline, @subheadline, @related_service_slug, @body_sections, @seo_title, @seo_description, @published)`
    )
    .run({
      slug,
      headline: b.headline,
      subheadline: b.subheadline || null,
      related_service_slug: b.related_service_slug || null,
      body_sections: JSON.stringify(b.body_sections || []),
      seo_title: b.seo_title || null,
      seo_description: b.seo_description || null,
      published: toBit(b.published ?? 0),
    });
  logAudit({ user: req.user, action: "create", entity: "landing_page", entityId: info.lastInsertRowid, ip: req.ip });
  const row = await db.prepare(`SELECT * FROM landing_pages WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ ...row, body_sections: j(row.body_sections, []) });
});

router.put("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM landing_pages WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  await db.prepare(
    `UPDATE landing_pages SET headline=@headline, subheadline=@subheadline, related_service_slug=@related_service_slug,
       body_sections=@body_sections, seo_title=@seo_title, seo_description=@seo_description, published=@published,
       updated_at=datetime('now') WHERE id=@id`
  ).run({
    id: req.params.id,
    headline: b.headline || existing.headline,
    subheadline: b.subheadline ?? existing.subheadline,
    related_service_slug: b.related_service_slug ?? existing.related_service_slug,
    body_sections: JSON.stringify(b.body_sections ?? j(existing.body_sections, [])),
    seo_title: b.seo_title ?? existing.seo_title,
    seo_description: b.seo_description ?? existing.seo_description,
    published: toBit(b.published ?? existing.published),
  });
  logAudit({ user: req.user, action: "update", entity: "landing_page", entityId: req.params.id, ip: req.ip });
  const row = await db.prepare(`SELECT * FROM landing_pages WHERE id = ?`).get(req.params.id);
  res.json({ ...row, body_sections: j(row.body_sections, []) });
});

router.delete("/:id", requireCsrf, async (req, res) => {
  if (!(await db.prepare(`SELECT id FROM landing_pages WHERE id = ?`).get(req.params.id))) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM landing_pages WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "landing_page", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
