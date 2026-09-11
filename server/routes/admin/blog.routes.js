const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isNonEmptyString, isSlug, slugify, isInList } = require("../../lib/validate");
const { sanitizeRichText } = require("../../lib/sanitize");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

async function setTags(postId, tagNames = []) {
  await db.prepare(`DELETE FROM blog_post_tags WHERE post_id = ?`).run(postId);
  for (const raw of tagNames) {
    const name = String(raw).trim();
    if (!name) continue;
    const slug = slugify(name);
    let tag = await db.prepare(`SELECT * FROM blog_tags WHERE slug = ?`).get(slug);
    if (!tag) {
      const info = await db.prepare(`INSERT INTO blog_tags (slug, name) VALUES (?, ?)`).run(slug, name);
      tag = { id: info.lastInsertRowid };
    }
    // "INSERT OR IGNORE" is SQLite-only syntax — Postgres equivalent is
    // ON CONFLICT DO NOTHING against the composite primary key.
    await db.prepare(`INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?) ON CONFLICT (post_id, tag_id) DO NOTHING`).run(postId, tag.id);
  }
}

async function getTags(postId) {
  return db.prepare(`SELECT t.id, t.name, t.slug FROM blog_tags t JOIN blog_post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?`).all(postId);
}

// ---- Categories ----
router.get("/categories", async (req, res) => res.json(await db.prepare(`SELECT * FROM blog_categories ORDER BY name ASC`).all()));
router.post("/categories", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.name, 200)) return res.status(400).json({ error: "Name is required." });
  const slug = isSlug(b.slug) ? b.slug : slugify(b.name);
  const info = await db.prepare(`INSERT INTO blog_categories (slug, name) VALUES (?, ?)`).run(slug, b.name);
  logAudit({ user: req.user, action: "create", entity: "blog_category", entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json(await db.prepare(`SELECT * FROM blog_categories WHERE id = ?`).get(info.lastInsertRowid));
});
router.delete("/categories/:id", requireCsrf, async (req, res) => {
  await db.prepare(`DELETE FROM blog_categories WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "blog_category", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

// ---- Posts ----
router.get("/posts", async (req, res) => {
  const rawRows = await db
    .prepare(
      `SELECT bp.*, bc.name AS category_name FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bc.id = bp.category_id
       ORDER BY bp.updated_at DESC`
    )
    .all();
  const rows = await Promise.all(rawRows.map(async p => ({ ...p, tags: await getTags(p.id) })));
  res.json(rows);
});

router.get("/posts/:id", async (req, res) => {
  const post = await db.prepare(`SELECT * FROM blog_posts WHERE id = ?`).get(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found." });
  res.json({ ...post, tags: await getTags(post.id) });
});

router.post("/posts", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.title, 300)) return res.status(400).json({ error: "Title is required." });
  const slug = isSlug(b.slug) ? b.slug : slugify(b.title);
  if (await db.prepare(`SELECT id FROM blog_posts WHERE slug = ?`).get(slug)) {
    return res.status(409).json({ error: "A post with that slug already exists." });
  }
  const status = isInList(b.status, ["draft", "scheduled", "published"]) ? b.status : "draft";

  const info = await db
    .prepare(
      `INSERT INTO blog_posts (slug, title, excerpt, body_html, featured_image, category_id, author_id, seo_title, seo_description, status, publish_at)
       VALUES (@slug, @title, @excerpt, @body_html, @featured_image, @category_id, @author_id, @seo_title, @seo_description, @status, @publish_at)`
    )
    .run({
      slug,
      title: b.title,
      excerpt: b.excerpt || null,
      body_html: sanitizeRichText(b.body_html || ""),
      featured_image: b.featured_image || null,
      category_id: b.category_id || null,
      author_id: req.user.id,
      seo_title: b.seo_title || null,
      seo_description: b.seo_description || null,
      status,
      publish_at: b.publish_at || null,
    });

  await setTags(info.lastInsertRowid, b.tags || []);
  logAudit({ user: req.user, action: "create", entity: "blog_post", entityId: info.lastInsertRowid, ip: req.ip });
  const row = await db.prepare(`SELECT * FROM blog_posts WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ ...row, tags: await getTags(row.id) });
});

router.put("/posts/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM blog_posts WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  const status = isInList(b.status, ["draft", "scheduled", "published"]) ? b.status : existing.status;

  await db.prepare(
    `UPDATE blog_posts SET title=@title, excerpt=@excerpt, body_html=@body_html, featured_image=@featured_image,
       category_id=@category_id, seo_title=@seo_title, seo_description=@seo_description, status=@status,
       publish_at=@publish_at, updated_at=datetime('now') WHERE id=@id`
  ).run({
    id: req.params.id,
    title: b.title || existing.title,
    excerpt: b.excerpt ?? existing.excerpt,
    body_html: b.body_html !== undefined ? sanitizeRichText(b.body_html) : existing.body_html,
    featured_image: b.featured_image ?? existing.featured_image,
    category_id: b.category_id ?? existing.category_id,
    seo_title: b.seo_title ?? existing.seo_title,
    seo_description: b.seo_description ?? existing.seo_description,
    status,
    publish_at: b.publish_at ?? existing.publish_at,
  });

  if (b.tags) await setTags(req.params.id, b.tags);
  logAudit({ user: req.user, action: "update", entity: "blog_post", entityId: req.params.id, ip: req.ip });
  const row = await db.prepare(`SELECT * FROM blog_posts WHERE id = ?`).get(req.params.id);
  res.json({ ...row, tags: await getTags(row.id) });
});

router.delete("/posts/:id", requireCsrf, async (req, res) => {
  if (!(await db.prepare(`SELECT id FROM blog_posts WHERE id = ?`).get(req.params.id))) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM blog_posts WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "blog_post", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
