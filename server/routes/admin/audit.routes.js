const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("owner"));

// GET /api/admin/audit?limit=100
router.get("/", async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const rows = await db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`).all(limit);
  res.json(rows);
});

module.exports = router;
