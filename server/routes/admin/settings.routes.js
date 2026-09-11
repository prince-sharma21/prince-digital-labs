const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { requireCsrf } = require("../../middleware/csrf");
const { logAudit } = require("../../lib/audit");
const { isOptionalString } = require("../../lib/validate");
const { stripAllHtml } = require("../../lib/sanitize");

const router = express.Router();

// Website/SEO/contact settings are system-level, so this whole resource
// is owner-only per the role model in Section 34 of the spec.
router.use(requireAuth, requireRole("owner"));

const ALLOWED_KEYS = [
  "brand_name", "brand_tagline", "logo_url", "favicon_url",
  "contact_email", "contact_phone", "contact_whatsapp", "contact_address", "business_hours",
  "social_instagram", "social_facebook", "social_youtube", "social_linkedin", "social_github", "social_telegram", "social_twitter",
  "seo_default_title", "seo_default_description", "social_sharing_image",
  "footer_copyright_name",
  "ga_measurement_id", "meta_pixel_id", "google_ads_conversion_id",
  "founder_name", "founder_role", "founder_photo_url", "founder_bio", "founder_belief",
  "founder_approach", "founder_vision", "founder_skills", "founder_highlights",
  "promo_ticker_text",
  "theme_primary", "theme_accent", "theme_accent2",
];

router.get("/", async (req, res) => {
  const rows = await db.prepare(`SELECT key, value FROM site_settings`).all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

// PUT /api/admin/settings — body is a flat { key: value } object.
// Empty string is valid (means "not configured yet") — never rejected,
// never auto-filled with a placeholder.
router.put("/", requireCsrf, async (req, res) => {
  const b = req.body || {};
  const upsert = db.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  const tx = db.transaction(async entries => {
    for (const [key, value] of entries) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      if (!isOptionalString(value, 2000)) throw new Error(`Value for ${key} is too long.`);
      await upsert.run(key, value ? stripAllHtml(String(value)) : "");
    }
  });

  try {
    await tx(Object.entries(b));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  logAudit({ user: req.user, action: "update", entity: "site_settings", details: { keys: Object.keys(b) }, ip: req.ip });
  const rows = await db.prepare(`SELECT key, value FROM site_settings`).all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

module.exports = router;
