const express = require("express");
const db = require("../db");
const config = require("../config");
const { hashPassword, verifyPassword, isPasswordStrongEnough } = require("../lib/hash");
const { createSession, destroySession, destroyAllSessionsForUser, requireAuth } = require("../middleware/auth");
const { requireCsrf } = require("../middleware/csrf");
const { loginLimiter } = require("../middleware/rateLimit");
const { logAudit } = require("../lib/audit");
const { generateBase32Secret, verifyTOTP, buildOtpAuthUri } = require("../lib/totp");
const { isEmail, isNonEmptyString } = require("../lib/validate");

const router = express.Router();

function setSessionCookie(res, token) {
  res.cookie(config.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
    path: "/",
  });
}

async function recordAttempt(identifier, success) {
  await db.prepare(`INSERT INTO login_attempts (identifier, success) VALUES (?, ?)`).run(identifier, success ? 1 : 0);
}

async function recentFailedAttempts(identifier, minutes = 15) {
  // Postgres doesn't understand SQLite's datetime('now', '-15 minutes')
  // modifier syntax — use a real interval expression instead. attempted_at
  // is stored as TEXT, so it needs an explicit cast to compare against a
  // timestamp value (Postgres won't auto-cast TEXT for this comparison).
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE identifier = ? AND success = 0 AND attempted_at::timestamptz > (now() - (? || ' minutes')::interval)`
    )
    .get(identifier, String(minutes));
  return parseInt(row.n, 10);
}

// POST /api/auth/login  { email, password, totpToken? }
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password, totpToken } = req.body || {};
  const ip = req.ip;
  const identifier = `${ip}:${(email || "").toLowerCase()}`;

  if (!isEmail(email) || !isNonEmptyString(password, 200)) {
    return res.status(400).json({ error: "Enter a valid email and password." });
  }

  // Extra app-level brute-force check on top of the route rate limiter
  if ((await recentFailedAttempts(identifier)) >= 8) {
    return res.status(429).json({ error: "Too many failed attempts. Please wait before trying again." });
  }

  const user = await db.prepare(`SELECT * FROM users WHERE email = ? AND is_active = 1`).get(email.toLowerCase());
  if (!user) {
    await recordAttempt(identifier, false);
    logAudit({ user: null, action: "login_failed", entity: "user", entityId: null, details: { email }, ip });
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const validPw = await verifyPassword(password, user.password_hash);
  if (!validPw) {
    await recordAttempt(identifier, false);
    logAudit({ user: null, action: "login_failed", entity: "user", entityId: user.id, details: { email }, ip });
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  if (user.totp_enabled) {
    if (!totpToken) {
      // Password was correct; tell the client a 2FA code is required next.
      return res.status(200).json({ requiresTotp: true });
    }
    const validTotp = verifyTOTP(user.totp_secret, String(totpToken));
    if (!validTotp) {
      await recordAttempt(identifier, false);
      logAudit({ user, action: "login_failed_2fa", entity: "user", entityId: user.id, ip });
      return res.status(401).json({ error: "Incorrect authentication code." });
    }
  }

  await recordAttempt(identifier, true);
  const { token } = await createSession(user.id, { userAgent: req.get("User-Agent"), ip });
  setSessionCookie(res, token);
  logAudit({ user, action: "login", entity: "user", entityId: user.id, ip });

  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/logout
router.post("/logout", requireAuth, requireCsrf, async (req, res) => {
  await destroySession(req.session.token);
  res.clearCookie(config.SESSION_COOKIE_NAME, { path: "/" });
  logAudit({ user: req.user, action: "logout", entity: "user", entityId: req.user.id, ip: req.ip });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user, csrfToken: req.csrfToken });
});

// POST /api/auth/change-password  { currentPassword, newPassword }
router.post("/change-password", requireAuth, requireCsrf, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isNonEmptyString(currentPassword, 200) || !isPasswordStrongEnough(newPassword)) {
    return res.status(400).json({ error: "New password must be at least 10 characters." });
  }
  const user = await db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect." });

  const newHash = await hashPassword(newPassword);
  await db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(newHash, user.id);
  await destroyAllSessionsForUser(user.id); // force re-login everywhere, including this device
  res.clearCookie(config.SESSION_COOKIE_NAME, { path: "/" });
  logAudit({ user: req.user, action: "change_password", entity: "user", entityId: user.id, ip: req.ip });
  res.json({ ok: true, message: "Password changed. Please log in again." });
});

// ---- 2FA (TOTP) ----

// POST /api/auth/2fa/setup — generates a new secret (not yet enabled)
router.post("/2fa/setup", requireAuth, requireCsrf, async (req, res) => {
  const secret = generateBase32Secret();
  await db.prepare(`UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?`).run(secret, req.user.id);
  const uri = buildOtpAuthUri({ secret, accountName: req.user.email });
  res.json({ secret, otpauthUri: uri });
});

// POST /api/auth/2fa/verify  { token } — confirms setup and turns 2FA on
router.post("/2fa/verify", requireAuth, requireCsrf, async (req, res) => {
  const { token } = req.body || {};
  const user = await db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  if (!user.totp_secret) return res.status(400).json({ error: "Run 2FA setup first." });
  if (!verifyTOTP(user.totp_secret, String(token || ""))) {
    return res.status(401).json({ error: "Incorrect code. Check your authenticator app and try again." });
  }
  await db.prepare(`UPDATE users SET totp_enabled = 1 WHERE id = ?`).run(user.id);
  logAudit({ user: req.user, action: "2fa_enabled", entity: "user", entityId: user.id, ip: req.ip });
  res.json({ ok: true });
});

// POST /api/auth/2fa/disable  { currentPassword }
router.post("/2fa/disable", requireAuth, requireCsrf, async (req, res) => {
  const { currentPassword } = req.body || {};
  const user = await db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  const valid = await verifyPassword(currentPassword || "", user.password_hash);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect." });
  await db.prepare(`UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?`).run(user.id);
  logAudit({ user: req.user, action: "2fa_disabled", entity: "user", entityId: user.id, ip: req.ip });
  res.json({ ok: true });
});

// ---- Password reset architecture ----
// Real token generation + validation. Actually emailing the link requires
// SMTP_* env vars (see mailer.js) — until those are set, this endpoint
// still creates a valid, usable token, but nothing is emailed, and the
// response never reveals whether the address exists.
const crypto = require("crypto");
const { sendMail, isEmailConfigured } = require("../lib/mailer");

router.post("/request-password-reset", loginLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: "Enter a valid email." });

  const user = await db.prepare(`SELECT * FROM users WHERE email = ? AND is_active = 1`).get(email.toLowerCase());
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    await db.prepare(`INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, user.id, expiresAt);
    const resetUrl = `${config.SITE_URL}/admin/reset-password.html?token=${token}`;
    if (isEmailConfigured()) {
      await sendMail({
        to: user.email,
        subject: "Reset your Prince Digital Labs admin password",
        text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      });
    } else {
      console.warn(`[password reset] SMTP not configured — reset link for ${user.email}: ${resetUrl}`);
    }
    logAudit({ user: null, action: "password_reset_requested", entity: "user", entityId: user.id, ip: req.ip });
  }
  // Always return the same response, whether or not the email exists —
  // this prevents leaking which addresses have accounts.
  res.json({ ok: true, message: "If that email has an account, a reset link has been sent." });
});

router.post("/reset-password", loginLimiter, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!isNonEmptyString(token, 128) || !isPasswordStrongEnough(newPassword)) {
    return res.status(400).json({ error: "Invalid request. Password must be at least 10 characters." });
  }
  const row = await db.prepare(`SELECT * FROM password_reset_tokens WHERE token = ?`).get(token);
  if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: "This reset link is invalid or has expired." });
  }
  const newHash = await hashPassword(newPassword);
  await db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(newHash, row.user_id);
  await db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE token = ?`).run(token);
  await destroyAllSessionsForUser(row.user_id);
  logAudit({ user: null, action: "password_reset_completed", entity: "user", entityId: row.user_id, ip: req.ip });
  res.json({ ok: true, message: "Password updated. You can now log in." });
});

module.exports = router;
