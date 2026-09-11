/**
 * EMAIL INTEGRATION — architecture only, per spec Section 44.
 *
 * Prince Digital Labs has NOT provided SMTP credentials yet, so this
 * module intentionally does not send real email until SMTP_HOST/PORT/
 * USER/PASS/FROM are set in .env. Nothing here fakes a successful send.
 *
 * To activate: `npm install nodemailer` and set the SMTP_* variables in
 * .env — the code below already targets nodemailer's exact API, so no
 * logic changes are needed, only the require() line and env vars.
 */
const config = require("../config");

function isEmailConfigured() {
  return Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS && config.SMTP_FROM);
}

async function sendMail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    console.warn(`[mailer] Not configured — would have sent "${subject}" to ${to}`);
    return { sent: false, reason: "not_configured" };
  }

  // Uncomment once `nodemailer` is installed and SMTP_* env vars are set:
  //
  // const nodemailer = require("nodemailer");
  // const transporter = nodemailer.createTransport({
  //   host: config.SMTP_HOST,
  //   port: Number(config.SMTP_PORT) || 587,
  //   secure: Number(config.SMTP_PORT) === 465,
  //   auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  // });
  // const info = await transporter.sendMail({ from: config.SMTP_FROM, to, subject, text, html });
  // return { sent: true, messageId: info.messageId };

  console.warn(`[mailer] SMTP configured but nodemailer isn't installed yet — see comment in mailer.js.`);
  return { sent: false, reason: "nodemailer_not_installed" };
}

module.exports = { sendMail, isEmailConfigured };
