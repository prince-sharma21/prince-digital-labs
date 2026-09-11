const helmet = require("helmet");

/**
 * Explicit CSP rather than helmet's bare defaults, since we know exactly
 * what this app loads: same-origin scripts/styles, Google Fonts, and
 * same-origin API calls. Inline style="" attributes are used by the
 * component renderer, so style-src keeps 'unsafe-inline'; script-src does
 * NOT, so injected <script> tags from stored data can never execute.
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

module.exports = securityHeaders;
