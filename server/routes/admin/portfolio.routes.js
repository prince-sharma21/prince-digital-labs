const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isNonEmptyString, isSlug, slugify, toBit } = require("../../lib/validate");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

const j = (v, fb) => { try { return v ? JSON.parse(v) : fb; } catch { return fb; } };
const toRow = p => ({ ...p, images: j(p.images, []), services: j(p.services, []), technologies: j(p.technologies, []), is_demo: !!p.is_demo });

router.get("/", async (req, res) => {
  const rows = await db.prepare(`SELECT * FROM portfolio_projects ORDER BY sort_order ASC, id DESC`).all();
  res.json(rows.map(toRow));
});

router.post("/", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.title, 200)) return res.status(400).json({ error: "Title is required." });
  const slug = isSlug(b.slug) ? b.slug : slugify(b.title);
  if (await db.prepare(`SELECT id FROM portfolio_projects WHERE slug = ?`).get(slug)) {
    return res.status(409).json({ error: "A project with that slug already exists." });
  }
  // is_demo defaults to 1 (true) unless explicitly set to 0 — a project is
  // only ever marked as real client work by a deliberate admin action.
  const info = await db
    .prepare(
      `INSERT INTO portfolio_projects (slug, title, description, category, images, services, technologies, project_url, project_date, is_demo, featured, published, sort_order)
       VALUES (@slug, @title, @description, @category, @images, @services, @technologies, @project_url, @project_date, @is_demo, @featured, @published, @sort_order)`
    )
    .run({
      slug,
      title: b.title,
      description: b.description || null,
      category: b.category || null,
      images: JSON.stringify(b.images || []),
      services: JSON.stringify(b.services || []),
      technologies: JSON.stringify(b.technologies || []),
      project_url: b.project_url || null,
      project_date: b.project_date || null,
      is_demo: toBit(b.is_demo ?? 1),
      featured: toBit(b.featured ?? 0),
      published: toBit(b.published ?? 1),
      sort_order: Number.isInteger(b.sort_order) ? b.sort_order : 0,
    });
  logAudit({ user: req.user, action: "create", entity: "portfolio_project", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json(toRow(await db.prepare(`SELECT * FROM portfolio_projects WHERE id = ?`).get(info.lastInsertRowid)));
});

router.put("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM portfolio_projects WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  await db.prepare(
    `UPDATE portfolio_projects SET title=@title, description=@description, category=@category, images=@images,
       services=@services, technologies=@technologies, project_url=@project_url, project_date=@project_date,
       is_demo=@is_demo, featured=@featured, published=@published, sort_order=@sort_order WHERE id=@id`
  ).run({
    id: req.params.id,
    title: b.title || existing.title,
    description: b.description ?? existing.description,
    category: b.category ?? existing.category,
    images: JSON.stringify(b.images ?? j(existing.images, [])),
    services: JSON.stringify(b.services ?? j(existing.services, [])),
    technologies: JSON.stringify(b.technologies ?? j(existing.technologies, [])),
    project_url: b.project_url ?? existing.project_url,
    project_date: b.project_date ?? existing.project_date,
    is_demo: toBit(b.is_demo ?? existing.is_demo),
    featured: toBit(b.featured ?? existing.featured),
    published: toBit(b.published ?? existing.published),
    sort_order: Number.isInteger(b.sort_order) ? b.sort_order : existing.sort_order,
  });
  logAudit({ user: req.user, action: "update", entity: "portfolio_project", entityId: req.params.id, ip: req.ip });
  res.json(toRow(await db.prepare(`SELECT * FROM portfolio_projects WHERE id = ?`).get(req.params.id)));
});

router.delete("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM portfolio_projects WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM portfolio_projects WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "portfolio_project", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
