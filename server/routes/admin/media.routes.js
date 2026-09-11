const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");

const router = express.Router();
router.use(requireAuth, requireRole("owner", "editor"));

const UPLOAD_DIR = path.join(__dirname, "..", "..", "..", "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Only real image types are accepted, and the filename on disk is always
// a random token — never the client-supplied name — so there's no path
// traversal or executable-upload risk.
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const EXT_BY_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg" };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeExt = EXT_BY_MIME[file.mimetype] || "";
    cb(null, `${crypto.randomBytes(16).toString("hex")}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error("Unsupported file type. Use JPG, PNG, WEBP, GIF, or SVG."));
    cb(null, true);
  },
});

router.get("/", async (req, res) => {
  res.json(await db.prepare(`SELECT * FROM media ORDER BY created_at DESC`).all());
});

router.post("/", requireCsrf, (req, res) => {
  upload.single("file")(req, res, async err => {
    try {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No file was uploaded." });

      const url = `/uploads/${req.file.filename}`;
      const info = await db
        .prepare(`INSERT INTO media (filename, original_name, url, mime_type, size_bytes, alt_text, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(req.file.filename, req.file.originalname.slice(0, 200), url, req.file.mimetype, req.file.size, req.body.alt_text || null, req.user.id);

      logAudit({ user: req.user, action: "create", entity: "media", entityId: info.lastInsertRowid, ip: req.ip });
      res.status(201).json(await db.prepare(`SELECT * FROM media WHERE id = ?`).get(info.lastInsertRowid));
    } catch (e) {
      res.status(500).json({ error: "Upload failed." });
    }
  });
});

router.put("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM media WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const altText = typeof req.body.alt_text === "string" ? req.body.alt_text.slice(0, 300) : existing.alt_text;
  await db.prepare(`UPDATE media SET alt_text = ? WHERE id = ?`).run(altText, req.params.id);
  res.json(await db.prepare(`SELECT * FROM media WHERE id = ?`).get(req.params.id));
});

router.delete("/:id", requireCsrf, async (req, res) => {
  const existing = await db.prepare(`SELECT * FROM media WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found." });
  const filePath = path.join(UPLOAD_DIR, existing.filename);
  fs.unlink(filePath, () => {}); // best-effort; DB row is the source of truth
  await db.prepare(`DELETE FROM media WHERE id = ?`).run(req.params.id);
  logAudit({ user: req.user, action: "delete", entity: "media", entityId: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
