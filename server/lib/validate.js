const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v, maxLen = 5000) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}
function isEmail(v) {
  return typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
}
function isOptionalString(v, maxLen = 5000) {
  return v === undefined || v === null || v === "" || (typeof v === "string" && v.length <= maxLen);
}
function isSlug(v) {
  return typeof v === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 200;
}
function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 200);
}
function isBoolIsh(v) {
  return typeof v === "boolean" || v === 0 || v === 1 || v === "0" || v === "1";
}
function toBit(v) {
  return v === true || v === 1 || v === "1" ? 1 : 0;
}
function isInList(v, list) {
  return list.includes(v);
}

/** Runs a set of {field, ok} checks; returns array of failing field names. */
function collectErrors(checks) {
  return checks.filter(c => !c.ok).map(c => c.field);
}

module.exports = {
  isNonEmptyString,
  isEmail,
  isOptionalString,
  isSlug,
  slugify,
  isBoolIsh,
  toBit,
  isInList,
  collectErrors,
};
