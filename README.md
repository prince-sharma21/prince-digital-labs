# Prince Digital Labs

A full-stack website and CMS admin dashboard for Prince Digital Labs — a
website development, digital marketing, and AI automation business.

Real database, real authentication, real admin CRUD. No mocked
functionality. See [DOCUMENTATION.md](./DOCUMENTATION.md) for the
complete guide — this file is just the fast path to running it.

## Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (works great with [Neon](https://neon.tech)'s
  free, permanent tier — no expiration, unlike some "free" database trials)
- **Frontend:** Plain HTML/CSS/JS, no build step — fetches content live
  from the backend API. Fast, simple to host anywhere, easy to hand off.
- **Admin dashboard:** Vanilla JS single-page app at `/admin`
- **Auth:** bcrypt password hashing, server-side sessions, CSRF
  protection, optional TOTP 2FA, role-based access (owner/editor)

## Quick start

```bash
npm install
cp .env.example .env
```

1. Create a free Postgres database at https://neon.tech (or any Postgres
   host) and copy its connection string.
2. Open `.env` and fill in:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
ADMIN_NAME=Your Name
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a-real-password-10-chars-minimum
```

Then:

```bash
npm run setup   # creates the database tables, your owner account, and seed content
npm start       # runs the server at http://localhost:3000

```

Visit `http://localhost:3000` for the public site, or
`http://localhost:3000/admin` to sign in and manage content.

## Verifying it actually works

Two test suites exercise the real, running app — not mocks:

```bash
npm start                 # in one terminal
npm run test:api          # in another: auth, CSRF, CRUD, leads, security headers
npm run test:ui           # admin dashboard: real login + every section, checked for JS errors
npm run test:public       # public site: every page, checked for JS errors + real content rendering
```

All three should report 100% passing before you trust a deploy.

## What's real vs. what needs your input

Everything in this repo is fully functional. A few integrations are
**architected but intentionally inactive** until you provide real
credentials — this was a deliberate choice, not a shortcut (see
[DOCUMENTATION.md](./DOCUMENTATION.md) for why, and exactly how to turn
each one on):

- Email sending (password reset, lead notifications) — needs SMTP credentials
- Analytics / Meta Pixel / Google Ads — needs your tracking IDs
- Your logo, contact details, and social links — add these in Admin → Website Settings

Nothing fake was substituted for these. They just do nothing until configured.

## Deploying

This repo runs anywhere Node.js runs. Recommended: **Render** (hosts
the app) + **Neon** (hosts the Postgres database, free forever). See
**"Deployment"** in [DOCUMENTATION.md](./DOCUMENTATION.md) for
step-by-step guidance.
