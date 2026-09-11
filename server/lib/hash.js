const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Basic strength check — used at signup/password-change time. */
function isPasswordStrongEnough(pw) {
  return typeof pw === "string" && pw.length >= 10;
}

module.exports = { hashPassword, verifyPassword, isPasswordStrongEnough };
