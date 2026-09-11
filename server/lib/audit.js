const db = require("../db");

// Fire-and-forget by design (call sites don't await this) — so it
// swallows and logs its own errors rather than risking an unhandled
// promise rejection from a background audit-log write.
function logAudit({ user, action, entity, entityId = null, details = null, ip = null }) {
  db.prepare(
    `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user ? user.id : null,
    user ? user.email : null,
    action,
    entity,
    entityId !== null ? String(entityId) : null,
    details ? JSON.stringify(details).slice(0, 2000) : null,
    ip
  ).catch(err => console.error("Audit log write failed:", err.message));
}

module.exports = { logAudit };
