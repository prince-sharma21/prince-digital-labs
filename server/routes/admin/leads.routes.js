const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isInList, isOptionalString } = require("../../lib/validate");
const { stripAllHtml } = require("../../lib/sanitize");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

const STATUSES = ["new", "read", "contacted", "in_progress", "completed", "archived"];

// GET /api/admin/leads?status=&q=
router.get("/", async (req, res) => {
  const { status, q } = req.query;
  let sql = `SELECT * FROM leads WHERE 1=1`;
  const params = [];
  if (status && isInList(status, STATUSES)) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (q) {
    // ILIKE (not LIKE) for case-insensitive search — SQLite's LIKE was
    // case-insensitive for ASCII by default, Postgres's isn't.
    sql += ` AND (name ILIKE ? OR email ILIKE ? OR company ILIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ` ORDER BY created_at DESC LIMIT 500`;
  res.json(await db.prepare(sql).all(...params));
});

router.get("/:id", async (req, res) => {
  const lead = await db.prepare(`SELECT * FROM leads WHERE id = ?`).get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Not found." });
  // Viewing a "new" lead automatically marks it read, mirroring real inbox behavior.
  if (lead.status === "new") {
    await db.prepare(`UPDATE leads SET status = 'read', updated_at = datetime('now') WHERE id = ?`).run(lead.id);
    lead.status = "read";
  }
  res.json(lead);
});

router.put("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM leads WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};
  const status = isInList(b.status, STATUSES) ? b.status : existing.status;
  if (!isOptionalString(b.internal_note, 3000)) return res.status(400).json({ error: "Note is too long." });

  await db.prepare(`UPDATE leads SET status=?, internal_note=?, updated_at=datetime('now') WHERE id=?`).run(
    status,
    b.internal_note !== undefined ? stripAllHtml(b.internal_note) : existing.internal_note,
    req.params.id
  );
  logAudit({ user: req.user, action: "update", entity: "lead", entityId: req.params.id, details: { status }, ip: req.ip });
  res.json(await db.prepare(`SELECT * FROM leads WHERE id = ?`).get(req.params.id));
});

router.delete("/:id", requireCsrf, async (req, res) => {
  if (!(await db.prepare(`SELECT id FROM leads WHERE id = ?`).get(req.params.id))) return res.status(404).json({ error: "Not found." });
  await db.prepare(`DELETE FROM leads WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "lead", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
