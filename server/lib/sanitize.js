const sanitizeHtml = require("sanitize-html");

/** For blog post bodies: a fairly permissive but XSS-safe rich-text allowlist. */
function sanitizeRichText(dirty) {
  if (!dirty) return "";
  return sanitizeHtml(dirty, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h2", "h3", "h4", "blockquote", "img", "code", "pre", "hr", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      span: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

/** For plain-text-only fields that still pass through templates: strip everything. */
function stripAllHtml(dirty) {
  if (!dirty) return "";
  return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} });
}

module.exports = { sanitizeRichText, stripAllHtml };
