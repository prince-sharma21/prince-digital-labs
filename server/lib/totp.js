/**
 * Minimal, dependency-free TOTP (RFC 6238) built on Node's built-in
 * crypto module. Compatible with Google Authenticator / Authy / any
 * standard TOTP app. Used for optional admin 2FA (spec Section 33).
 */
const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateBase32Secret(byteLength = 20) {
  const buf = crypto.randomBytes(byteLength);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let secret = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(base32) {
  const clean = base32.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secretBuffer, counter, digits = 6) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binCode % 10 ** digits).padStart(digits, "0");
}

function generateTOTP(base32Secret, { step = 30, digits = 6, timestamp = Date.now() } = {}) {
  const counter = Math.floor(timestamp / 1000 / step);
  return hotp(base32Decode(base32Secret), counter, digits);
}

/** Verifies a code allowing +/-1 time step of clock drift. */
function verifyTOTP(base32Secret, token, { step = 30, digits = 6, window = 1 } = {}) {
  if (!/^\d+$/.test(token)) return false;
  const now = Date.now();
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidate = generateTOTP(base32Secret, { step, digits, timestamp: now + errorWindow * step * 1000 });
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token.padStart(digits, "0")))) {
      return true;
    }
  }
  return false;
}

function buildOtpAuthUri({ secret, accountName, issuer = "Prince Digital Labs" }) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = { generateBase32Secret, verifyTOTP, buildOtpAuthUri };
