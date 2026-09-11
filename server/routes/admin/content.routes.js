const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isNonEmptyString, toBit } = require("../../lib/validate");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

// ================= TESTIMONIALS =================
router.get("/testimonials", async (req, res) => {
  res.json(await db.prepare(`SELECT * FROM testimonials ORDER BY id DESC`).all());
});
router.post("/testimonials", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.client_name, 200) || !isNonEmptyString(b.quote, 2000)) {
    return res.status(400).json({ error: "Client name and quote are required." });
  }
  const info = await db
    .prepare(`INSERT INTO testimonials (client_name, company, quote, rating, image_url, published) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(b.client_name, b.company || null, b.quote, b.rating || null, b.image_url || null, toBit(b.published ?? 0));
  logAudit({ user: req.user, action: "create", entity: "testimonial", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json(await db.prepare(`SELECT * FROM testimonials WHERE id = ?`).get(info.lastInsertRowid));
});
router.put("/testimonials/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM testimonials WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  await db.prepare(`UPDATE testimonials SET client_name=?, company=?, quote=?, rating=?, image_url=?, published=? WHERE id=?`).run(
    b.client_name || existing.client_name,
    b.company ?? existing.company,
    b.quote || existing.quote,
    b.rating ?? existing.rating,
    b.image_url ?? existing.image_url,
    toBit(b.published ?? existing.published),
    req.params.id
  );
  logAudit({ user: req.user, action: "update", entity: "testimonial", entityId: req.params.id, ip: req.ip });
  res.json(await db.prepare(`SELECT * FROM testimonials WHERE id = ?`).get(req.params.id));
});
router.delete("/testimonials/:id", requireCsrf, async (req, res) => {
  if (!(await db.prepare(`SELECT id FROM testimonials WHERE id = ?`).get(req.params.id))) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM testimonials WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "testimonial", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

// ================= FAQS =================
router.get("/faqs", async (req, res) => {
  res.json(await db.prepare(`SELECT * FROM faqs ORDER BY sort_order ASC, id ASC`).all());
});
router.post("/faqs", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.question, 500) || !isNonEmptyString(b.answer, 3000)) {
    return res.status(400).json({ error: "Question and answer are required." });
  }
  const info = await db
    .prepare(`INSERT INTO faqs (question, answer, sort_order, published) VALUES (?, ?, ?, ?)`)
    .run(b.question, b.answer, Number.isInteger(b.sort_order) ? b.sort_order : 0, toBit(b.published ?? 1));
  logAudit({ user: req.user, action: "create", entity: "faq", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json(await db.prepare(`SELECT * FROM faqs WHERE id = ?`).get(info.lastInsertRowid));
});
router.put("/faqs/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM faqs WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  await db.prepare(`UPDATE faqs SET question=?, answer=?, sort_order=?, published=? WHERE id=?`).run(
    b.question || existing.question,
    b.answer || existing.answer,
    Number.isInteger(b.sort_order) ? b.sort_order : existing.sort_order,
    toBit(b.published ?? existing.published),
    req.params.id
  );
  logAudit({ user: req.user, action: "update", entity: "faq", entityId: req.params.id, ip: req.ip });
  res.json(await db.prepare(`SELECT * FROM faqs WHERE id = ?`).get(req.params.id));
});
router.delete("/faqs/:id", requireCsrf, async (req, res) => {
  if (!(await db.prepare(`SELECT id FROM faqs WHERE id = ?`).get(req.params.id))) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM faqs WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "faq", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

// ================= NOTIFICATIONS =================
router.get("/notifications", async (req, res) => {
  res.json(await db.prepare(`SELECT * FROM notifications ORDER BY id DESC`).all());
});
router.post("/notifications", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.message, 500)) return res.status(400).json({ error: "Message is required." });
  const info = await db
    .prepare(`INSERT INTO notifications (message, cta_label, cta_link, starts_at, ends_at, published) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(b.message, b.cta_label || null, b.cta_link || null, b.starts_at || null, b.ends_at || null, toBit(b.published ?? 0));
  logAudit({ user: req.user, action: "create", entity: "notification", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json(await db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(info.lastInsertRowid));
});
router.put("/notifications/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  await db.prepare(`UPDATE notifications SET message=?, cta_label=?, cta_link=?, starts_at=?, ends_at=?, published=? WHERE id=?`).run(
    b.message || existing.message,
    b.cta_label ?? existing.cta_label,
    b.cta_link ?? existing.cta_link,
    b.starts_at ?? existing.starts_at,
    b.ends_at ?? existing.ends_at,
    toBit(b.published ?? existing.published),
    req.params.id
  );
  logAudit({ user: req.user, action: "update", entity: "notification", entityId: req.params.id, ip: req.ip });
  res.json(await db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(req.params.id));
});
router.delete("/notifications/:id", requireCsrf, async (req, res) => {
  if (!(await db.prepare(`SELECT id FROM notifications WHERE id = ?`).get(req.params.id))) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM notifications WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "notification", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
