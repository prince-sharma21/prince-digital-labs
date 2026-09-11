const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole, destroyAllSessionsForUser } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { hashPassword, isPasswordStrongEnough } = require("../../lib/hash");
const { isEmail, isNonEmptyString, isInList } = require("../../lib/validate");

const router = express.Router();
router.use(requireAuth, requireRole("owner"));

router.get("/", async (req, res) => {
  res.json(await db.prepare(`SELECT id, name, email, role, is_active, totp_enabled, created_at FROM users ORDER BY id ASC`).all());
});

// POST /api/admin/users — owner creates an editor (or another owner) account
router.post("/", requireCsrf, async (req, res) => {
  const b = req.body || {};
  if (!isNonEmptyString(b.name, 200) || !isEmail(b.email) || !isPasswordStrongEnough(b.password)) {
    return res.status(400).json({ error: "Name, valid email, and a password of at least 10 characters are required." });
  }
  const role = isInList(b.role, ["owner", "editor"]) ? b.role : "editor";
  if (await db.prepare(`SELECT id FROM users WHERE email = ?`).get(b.email.toLowerCase())) {
    return res.status(409).json({ error: "A user with that email already exists." });
  }
  const passwordHash = await hashPassword(b.password);
  const info = await db
    .prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`)
    .run(b.name, b.email.toLowerCase(), passwordHash, role);
  logAudit({ user: req.user, action: "create", entity: "user", entityId: info.lastInsertRowid, details: { role }, ip: req.ip });
  res.status(201).json(await db.prepare(`SELECT id, name, email, role, is_active FROM users WHERE id = ?`).get(info.lastInsertRowid));
});

// PUT /api/admin/users/:id — update name/role/active status (not password — see change-password)
router.put("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const b = req.body || {};

  if (existing.role === "owner" && b.role === "editor") {
    const ownerCount = parseInt((await db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND is_active = 1`).get()).n, 10);
    if (ownerCount <= 1) return res.status(400).json({ error: "At least one active owner account must remain." });
  }

  const role = isInList(b.role, ["owner", "editor"]) ? b.role : existing.role;
  const isActive = b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active;

  await db.prepare(`UPDATE users SET name=?, role=?, is_active=?, updated_at=datetime('now') WHERE id=?`).run(
    b.name || existing.name,
    role,
    isActive,
    req.params.id
  );
  if (isActive === 0) await destroyAllSessionsForUser(req.params.id);
  logAudit({ user: req.user, action: "update", entity: "user", entityId: req.params.id, details: { role, isActive }, ip: req.ip });
  res.json(await db.prepare(`SELECT id, name, email, role, is_active FROM users WHERE id = ?`).get(req.params.id));
});

router.delete("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  if (existing.id === req.user.id) return res.status(400).json({ error: "You can't delete your own account." });
  if (existing.role === "owner") {
    const ownerCount = parseInt((await db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND is_active = 1`).get()).n, 10);
    if (ownerCount <= 1) return res.status(400).json({ error: "At least one active owner account must remain." });
  }
  await db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "user", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
