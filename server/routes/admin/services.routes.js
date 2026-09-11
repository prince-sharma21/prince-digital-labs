const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isNonEmptyString, isOptionalString, isSlug, slugify, toBit } = require("../../lib/validate");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

const j = (v, fb) => { try { return v ? JSON.parse(v) : fb; } catch { return fb; } };
const toRow = s => ({ ...s, benefits: j(s.benefits, []), process: j(s.process, []), features: j(s.features, []), faqs: j(s.faqs, []) });

router.get("/", async (req, res) => {
  const rows = (await db.prepare(`SELECT * FROM services ORDER BY sort_order ASC, id ASC`).all()).map(toRow);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const s = await db.prepare(`SELECT * FROM services WHERE id = ?`).get(req.params.id);
  if (!s) return res.status(404).json({ error: "Not found." });
  res.json(toRow(s));
});

router.post("/", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.name, 200)) return res.status(400).json({ error: "Name is required." });
  const slug = isSlug(b.slug) ? b.slug : slugify(b.name);
  const exists = await db.prepare(`SELECT id FROM services WHERE slug = ?`).get(slug);
  if (exists) return res.status(409).json({ error: "A service with that slug already exists." });

  const info = await db
    .prepare(
      `INSERT INTO services (slug, name, short_description, full_description, benefits, process, features, faqs, image_url, icon, cta_label, seo_title, seo_description, sort_order, published)
       VALUES (@slug, @name, @short_description, @full_description, @benefits, @process, @features, @faqs, @image_url, @icon, @cta_label, @seo_title, @seo_description, @sort_order, @published)`
    )
    .run({
      slug,
      name: b.name,
      short_description: b.short_description || null,
      full_description: b.full_description || null,
      benefits: JSON.stringify(b.benefits || []),
      process: JSON.stringify(b.process || []),
      features: JSON.stringify(b.features || []),
      faqs: JSON.stringify(b.faqs || []),
      image_url: b.image_url || null,
      icon: b.icon || null,
      cta_label: b.cta_label || null,
      seo_title: b.seo_title || null,
      seo_description: b.seo_description || null,
      sort_order: Number.isInteger(b.sort_order) ? b.sort_order : 0,
      published: toBit(b.published ?? 1),
    });

  logAudit({ user: req.user, action: "create", entity: "service", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json(toRow(await db.prepare(`SELECT * FROM services WHERE id = ?`).get(info.lastInsertRowid)));
});

router.put("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM services WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  if (!isNonEmptyString(b.name, 200)) return res.status(400).json({ error: "Name is required." });
  const slug = isSlug(b.slug) ? b.slug : existing.slug;
  const conflict = await db.prepare(`SELECT id FROM services WHERE slug = ? AND id != ?`).get(slug, req.params.id);
  if (conflict) return res.status(409).json({ error: "Another service already uses that slug." });

  await db.prepare(
    `UPDATE services SET slug=@slug, name=@name, short_description=@short_description, full_description=@full_description,
       benefits=@benefits, process=@process, features=@features, faqs=@faqs, image_url=@image_url, icon=@icon,
       cta_label=@cta_label, seo_title=@seo_title, seo_description=@seo_description, sort_order=@sort_order,
       published=@published, updated_at=datetime('now')
     WHERE id=@id`
  ).run({
    id: req.params.id,
    slug,
    name: b.name,
    short_description: b.short_description || null,
    full_description: b.full_description || null,
    benefits: JSON.stringify(b.benefits || []),
    process: JSON.stringify(b.process || []),
    features: JSON.stringify(b.features || []),
    faqs: JSON.stringify(b.faqs || []),
    image_url: b.image_url || null,
    icon: b.icon || null,
    cta_label: b.cta_label || null,
    seo_title: b.seo_title || null,
    seo_description: b.seo_description || null,
    sort_order: Number.isInteger(b.sort_order) ? b.sort_order : existing.sort_order,
    published: toBit(b.published ?? existing.published),
  });

  logAudit({ user: req.user, action: "update", entity: "service", entityId: req.params.id, ip: req.ip });
  res.json(toRow(await db.prepare(`SELECT * FROM services WHERE id = ?`).get(req.params.id)));
});

router.delete("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM services WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM services WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "service", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
