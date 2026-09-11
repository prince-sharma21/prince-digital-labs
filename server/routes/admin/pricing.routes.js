const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isNonEmptyString, isSlug, slugify, toBit } = require("../../lib/validate");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

const j = (v, fb) => { try { return v ? JSON.parse(v) : fb; } catch { return fb; } };

// ---- Categories ----
router.get("/categories", async (req, res) => {
  const cats = await db.prepare(`SELECT * FROM pricing_categories ORDER BY sort_order ASC, id ASC`).all();
  const pkgStmt = db.prepare(`SELECT * FROM pricing_packages WHERE category_id = ? ORDER BY sort_order ASC, id ASC`);
  const result = await Promise.all(
    cats.map(async c => {
      const pkgs = await pkgStmt.all(c.id);
      return { ...c, packages: pkgs.map(p => ({ ...p, features: j(p.features, []) })) };
    })
  );
  res.json(result);
});

router.post("/categories", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.name, 200)) return res.status(400).json({ error: "Name is required." });
  const slug = isSlug(b.slug) ? b.slug : slugify(b.name);
  if (await db.prepare(`SELECT id FROM pricing_categories WHERE slug = ?`).get(slug)) {
    return res.status(409).json({ error: "A category with that slug already exists." });
  }
  const info = await db
    .prepare(`INSERT INTO pricing_categories (slug, name, note, sort_order, published) VALUES (?, ?, ?, ?, ?)`)
    .run(slug, b.name, b.note || null, Number.isInteger(b.sort_order) ? b.sort_order : 0, toBit(b.published ?? 1));
  logAudit({ user: req.user, action: "create", entity: "pricing_category", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json(await db.prepare(`SELECT * FROM pricing_categories WHERE id = ?`).get(info.lastInsertRowid));
});

router.put("/categories/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM pricing_categories WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  await db.prepare(`UPDATE pricing_categories SET name=?, note=?, sort_order=?, published=? WHERE id=?`).run(
    b.name || existing.name,
    b.note ?? existing.note,
    Number.isInteger(b.sort_order) ? b.sort_order : existing.sort_order,
    toBit(b.published ?? existing.published),
    req.params.id
  );
  logAudit({ user: req.user, action: "update", entity: "pricing_category", entityId: req.params.id, ip: req.ip });
  res.json(await db.prepare(`SELECT * FROM pricing_categories WHERE id = ?`).get(req.params.id));
});

router.delete("/categories/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM pricing_categories WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM pricing_categories WHERE id = ?`).run(req.params.id); // packages cascade-delete via FK
  logAudit({ user: req.user, action: "delete", entity: "pricing_category", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

// ---- Packages ----
router.post("/packages", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.name, 200) || !b.category_id) return res.status(400).json({ error: "Name and category are required." });
  const category = await db.prepare(`SELECT id FROM pricing_categories WHERE id = ?`).get(b.category_id);
  if (!category) return res.status(400).json({ error: "That category doesn't exist." });

  const info = await db
    .prepare(
      `INSERT INTO pricing_packages (category_id, name, price, reference_price, billing_period, badge, blurb, features, featured, cta_label, custom_quote, sort_order, published)
       VALUES (@category_id, @name, @price, @reference_price, @billing_period, @badge, @blurb, @features, @featured, @cta_label, @custom_quote, @sort_order, @published)`
    )
    .run({
      category_id: b.category_id,
      name: b.name,
      price: b.price || null,
      reference_price: b.reference_price || null,
      billing_period: b.billing_period || "one-time",
      badge: b.badge || null,
      blurb: b.blurb || null,
      features: JSON.stringify(b.features || []),
      featured: toBit(b.featured ?? 0),
      cta_label: b.cta_label || "Get Started",
      custom_quote: toBit(b.custom_quote ?? 0),
      sort_order: Number.isInteger(b.sort_order) ? b.sort_order : 0,
      published: toBit(b.published ?? 1),
    });

  logAudit({ user: req.user, action: "create", entity: "pricing_package", entityId: info.lastInsertRowid, ip: req.ip });
  const row = await db.prepare(`SELECT * FROM pricing_packages WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ ...row, features: j(row.features, []) });
});

router.put("/packages/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM pricing_packages WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};

  await db.prepare(
    `UPDATE pricing_packages SET name=@name, price=@price, reference_price=@reference_price, billing_period=@billing_period,
       badge=@badge, blurb=@blurb, features=@features, featured=@featured, cta_label=@cta_label,
       custom_quote=@custom_quote, sort_order=@sort_order, published=@published WHERE id=@id`
  ).run({
    id: req.params.id,
    name: b.name || existing.name,
    price: b.price ?? existing.price,
    reference_price: b.reference_price ?? existing.reference_price,
    billing_period: b.billing_period || existing.billing_period,
    badge: b.badge ?? existing.badge,
    blurb: b.blurb ?? existing.blurb,
    features: JSON.stringify(b.features ?? j(existing.features, [])),
    featured: toBit(b.featured ?? existing.featured),
    cta_label: b.cta_label ?? existing.cta_label,
    custom_quote: toBit(b.custom_quote ?? existing.custom_quote),
    sort_order: Number.isInteger(b.sort_order) ? b.sort_order : existing.sort_order,
    published: toBit(b.published ?? existing.published),
  });

  logAudit({ user: req.user, action: "update", entity: "pricing_package", entityId: req.params.id, ip: req.ip });
  const row = await db.prepare(`SELECT * FROM pricing_packages WHERE id = ?`).get(req.params.id);
  res.json({ ...row, features: j(row.features, []) });
});

router.delete("/packages/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM pricing_packages WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM pricing_packages WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "pricing_package", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
