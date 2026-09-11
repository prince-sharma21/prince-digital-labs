require("dotenv").config();
const path = require("path");

function required(name, fallback) {
  if (process.env[name]) return process.env[name];
  if (fallback !== undefined) return fallback;
  return undefined;
}

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

module.exports = {
  NODE_ENV,
  isProd,
  PORT: parseInt(process.env.PORT || "3000", 10),

  // Database — now Postgres (Neon). DATABASE_URL is the connection string
  // from your Neon project, e.g. postgresql://user:pass@host/db?sslmode=require
  DATABASE_URL: process.env.DATABASE_URL || "",

  // Auth
  SESSION_COOKIE_NAME: "pdl_session",
  SESSION_TTL_HOURS: parseInt(process.env.SESSION_TTL_HOURS || "72", 10),
  COOKIE_SECURE: isProd, // secure cookies require HTTPS, which is only true once deployed behind TLS

  // Initial owner account — used ONLY by `npm run seed`, and only if no
  // owner user exists yet. Never hardcoded, never invented.
  ADMIN_NAME: process.env.ADMIN_NAME || "",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",

  // Optional integrations — architecture is wired, but nothing activates
  // until real credentials are supplied here.
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: process.env.SMTP_PORT || "",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "",

  GA_MEASUREMENT_ID: process.env.GA_MEASUREMENT_ID || "",
  META_PIXEL_ID: process.env.META_PIXEL_ID || "",
  GOOGLE_ADS_CONVERSION_ID: process.env.GOOGLE_ADS_CONVERSION_ID || "",

  SITE_URL: process.env.SITE_URL || "http://localhost:3000",
};
