const crypto = require("crypto");

/**
 * Double-submit CSRF protection. Each session has a server-known
 * csrf_secret (stored in the sessions table, never sent to the client
 * directly). We derive a per-request CSRF token from it that the client
 * must echo back in the X-CSRF-Token header on any state-changing
 * request. A pure cookie-reflection attack can't produce this token
 * because it requires knowing the session's csrf_secret server-side.
 */
function deriveToken(csrfSecret) {
  return crypto.createHmac("sha256", csrfSecret).update("pdl-csrf").digest("hex");
}

function issueCsrfToken(req, res, next) {
  if (req.session) {
    req.csrfToken = deriveToken(req.session.csrf_secret);
  }
  next();
}

function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (!req.session) return res.status(401).json({ error: "Not authenticated." });
  const expected = deriveToken(req.session.csrf_secret);
  const provided = req.get("X-CSRF-Token") || "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  const valid = expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);
  if (!valid) return res.status(403).json({ error: "Invalid or missing CSRF token." });
  next();
}

module.exports = { issueCsrfToken, requireCsrf };
