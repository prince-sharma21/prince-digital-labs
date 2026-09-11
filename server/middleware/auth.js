const crypto = require("crypto");
const db = require("../db");
const config = require("../config");

const SESSION_TTL_MS = config.SESSION_TTL_HOURS * 60 * 60 * 1000;

async function createSession(userId, { userAgent, ip } = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const csrfSecret = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.prepare(
    `INSERT INTO sessions (token, user_id, csrf_secret, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(token, userId, csrfSecret, userAgent || null, ip || null, expiresAt);
  return { token, csrfSecret, expiresAt };
}

async function destroySession(token) {
  await db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

async function destroyAllSessionsForUser(userId) {
  await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

async function getSession(token) {
  if (!token) return null;
  const session = await db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  return session;
}

/** Loads req.user + req.session if a valid session cookie is present. Does not block. */
async function attachSession(req, res, next) {
  try {
    const token = req.cookies[config.SESSION_COOKIE_NAME];
    const session = await getSession(token);
    if (session) {
      const user = await db.prepare(`SELECT id, name, email, role, is_active, totp_enabled FROM users WHERE id = ?`).get(session.user_id);
      if (user && user.is_active) {
        req.user = user;
        req.session = session;
      }
    }
    next();
  } catch (err) {
    console.error("attachSession error:", err.message);
    next(); // fail open to "no session", matching the "does not block" contract
  }
}

/** Blocks unauthenticated requests. Use after attachSession. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated." });
  next();
}

/** Blocks users whose role isn't in the allowed list. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that." });
    }
    next();
  };
}

module.exports = {
  createSession,
  destroySession,
  destroyAllSessionsForUser,
  getSession,
  attachSession,
  requireAuth,
  requireRole,
};
