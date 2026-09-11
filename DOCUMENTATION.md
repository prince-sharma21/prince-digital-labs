# Prince Digital Labs — Full Documentation

## Contents
1. [Technology stack](#1-technology-stack)
2. [Architecture](#2-architecture)
3. [Project structure](#3-project-structure)
4. [Database schema](#4-database-schema)
5. [Authentication architecture](#5-authentication-architecture)
6. [Security implementation](#6-security-implementation)
7. [Roles & permissions](#7-roles--permissions)
8. [Admin dashboard](#8-admin-dashboard)
9. [Content systems](#9-content-systems) (services, pricing, blog, portfolio, testimonials, FAQs, notifications, landing pages)
10. [Lead management & campaign tracking](#10-lead-management--campaign-tracking)
11. [SEO](#11-seo)
12. [Performance](#12-performance)
13. [Accessibility](#13-accessibility)
14. [Running locally](#14-running-locally)
15. [Deployment](#15-deployment)
16. [Adding email, phone, social, and logo](#16-adding-email-phone-social-and-logo)
17. [Day-to-day content management](#17-day-to-day-content-management)
18. [Backup & restore](#18-backup--restore)
19. [Remaining external configuration](#19-remaining-external-configuration)
20. [Database internals (Postgres)](#20-database-internals-postgres-via-pg)
21. [Troubleshooting](#21-troubleshooting)

---

## 1. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22+ | Modern, built-in `fetch`, no transpilation needed |
| Web framework | Express 4 | Simple, well understood, easy to maintain |
| Database | PostgreSQL via `pg` (works with Neon's free tier) | Real relational database, persists independently of the app's own disk — see §20 for internals |
| Auth | `bcryptjs` + hand-rolled DB-backed sessions | Transparent, auditable, no framework magic |
| Security headers | `helmet` | Industry-standard CSP/HSTS/etc. |
| Rate limiting | `express-rate-limit` | Brute-force protection on login and contact form |
| HTML sanitization | `sanitize-html` | XSS-safe blog content |
| File uploads | `multer` (2.x, patched) | Safe media handling |
| Frontend | Plain HTML/CSS/JS, no framework, no build step | Fast to load, trivial to host, easy for a non-JS-framework developer to maintain later |
| Admin dashboard | Vanilla JS SPA | Same reasoning — no build tooling required |

No unnecessary dependencies were added. Every package in `package.json` is
actually used.

## 2. Architecture

```
Browser (public site)  →  Express static file server  →  public/*.html
                        ↘  /api/public/*  (read-only + contact form)  →  SQLite

Browser (admin)         →  /admin  (server-side auth gate)  →  public/admin/*.html
                        ↘  /api/admin/*  (authenticated CRUD)  →  SQLite
```

The public site is **not** static content with hardcoded text — every
page fetches services, pricing, blog posts, portfolio, testimonials,
FAQs, notifications, and site settings live from the database through
`/api/public/*`. When you edit something in Admin, it appears on the
public site immediately, with no rebuild step. This is verified
automatically by `npm run test:api` (see the "CRUD → public reflection"
checks).

Centralized configuration lives in two places, matching the spec's
"don't scatter values across files" requirement:
- **Design tokens** (colors, type, spacing, radius, shadows) — CSS
  custom properties at the top of `public/css/style.css`.
- **Site content config** (brand, contact, social, SEO defaults) — the
  `site_settings` database table, editable only through Admin.

## 3. Project structure

```
├── server/                  Backend (Node/Express)
│   ├── index.js              App entry point — wires up everything
│   ├── config.js              Reads all environment variables in one place
│   ├── db.js                  Database connection (the only file that knows it's SQLite)
│   ├── migrate.js             Runs migrations/*.sql
│   ├── seed.js                 Creates the owner account + seeds initial content
│   ├── migrations/001_init.sql  Full schema: tables, constraints, indexes
│   ├── seed-data/              Services/pricing/portfolio/FAQ content used by seed.js
│   ├── lib/                    hash.js, totp.js, sanitize.js, audit.js, mailer.js, validate.js, sitemap.js
│   ├── middleware/             auth.js, csrf.js, rateLimit.js, security-headers.js
│   └── routes/
│       ├── auth.routes.js       Login, logout, 2FA, password reset
│       ├── public.routes.js     Read-only public API + contact form
│       └── admin/               One file per resource: services, pricing, blog, portfolio,
│                                  content (testimonials/FAQs/notifications), leads, settings,
│                                  users, media, audit, landing
├── public/                  Everything served to browsers
│   ├── *.html                 12 public pages (see §9)
│   ├── css/style.css          Design system + all page styles
│   ├── js/site.js             Shared header/footer/notifications/utilities
│   ├── js/pages/*.js          One script per public page
│   ├── admin/                 Admin dashboard (HTML + css/admin.css + js/*.js)
│   └── uploads/                Uploaded media files land here
├── tests/                    Real end-to-end tests against the running server (see §14)
├── data/app.db                The SQLite database file (gitignored — created by `npm run migrate`)
├── .env.example                Every environment variable, documented
└── DOCUMENTATION.md / README.md
```

## 4. Database schema

19 tables, defined in `server/migrations/001_init.sql`, with real
foreign keys, `CHECK` constraints, and indexes:

`users`, `sessions`, `login_attempts`, `password_reset_tokens`,
`audit_logs`, `site_settings`, `services`, `pricing_categories`,
`pricing_packages`, `blog_categories`, `blog_tags`, `blog_posts`,
`blog_post_tags`, `portfolio_projects`, `testimonials`, `faqs`,
`notifications`, `landing_pages`, `leads`, `media`.

Notable design choices:
- `portfolio_projects.is_demo` **defaults to `1` (true)**. A project is
  only ever shown as real client work by a deliberate admin action —
  matching the spec's "never present demo work as real" rule at the
  schema level, not just the UI level.
- `testimonials.published` defaults to `0` — nothing shows publicly
  until you've reviewed it.
- All JSON-shaped fields (`features`, `benefits`, `body_sections`, etc.)
  are stored as validated JSON text columns, parsed on read.

## 5. Authentication architecture

- Passwords are hashed with **bcrypt** (12 salt rounds), via `bcryptjs`
  (pure JS — no native compilation risk). Plaintext passwords are never
  stored or logged.
- Sessions are **server-side**: a random 32-byte token is stored in the
  `sessions` table (with `user_id`, `csrf_secret`, `expires_at`) and set
  as an **httpOnly, sameSite=lax** cookie. In production
  (`NODE_ENV=production`), the cookie is also marked `Secure`. The
  server checks the database on every request — a stolen cookie
  doesn't help an attacker unless the session row still exists and
  hasn't expired, and logging out or resetting your password deletes
  it immediately.
- **CSRF protection**: a token derived from the session's server-side
  secret must be sent back in an `X-CSRF-Token` header on every
  state-changing request. Verified with a timing-safe comparison.
- **Rate limiting**: 8 login attempts per 15 minutes per IP+email
  (via `express-rate-limit`), plus an application-level check against
  the `login_attempts` table as a second layer.
- **2FA (TOTP)**: a real RFC 6238 implementation in
  `server/lib/totp.js`, built on Node's built-in `crypto` module — no
  external dependency. Compatible with Google Authenticator, Authy,
  1Password, etc. Enable it from Admin → your user menu.
- **Password reset**: real, expiring (1 hour), single-use tokens. The
  *sending* of the reset email requires SMTP credentials (see §16) —
  until then, the reset link is logged to the server console instead
  of silently pretending to email it.

## 6. Security implementation

- **Security headers** via `helmet`, with an explicit Content-Security-
  Policy (not just defaults): `script-src 'self'` — no inline scripts
  are permitted anywhere in the app, which is why every page's
  JavaScript lives in external `.js` files. This means a stored-XSS
  payload that somehow got into the database as a `<script>` tag could
  not execute even if rendered — the browser would simply refuse to run it.
- **Input validation** on every write endpoint (`server/lib/validate.js`).
- **HTML sanitization** (`sanitize-html`) on blog post bodies and any
  free-text field that gets rendered as HTML — allowlist-based, so
  scripts/event-handlers are stripped even from rich content.
- **SQL injection protection**: every query uses parameterized
  statements via `pg`'s parameterized query API (`$1, $2, ...`). No
  string concatenation into SQL, anywhere.
- **File upload safety**: only real image MIME types accepted, 5MB
  limit, filenames are always server-generated random tokens (never
  the client-supplied name), so there's no path traversal risk.
- **Audit log**: every create/update/delete/login/logout/failed-login
  is recorded in `audit_logs` with the acting user, IP, and a short
  detail summary. View it at Admin → Audit Log (owner only).
- **Error handling**: the global error handler never leaks stack
  traces or internal details to the client in production.

## 7. Roles & permissions

Two roles, enforced **server-side** on every request (not just hidden
in the UI):

- **Owner** — full access, including Website Settings, SEO settings,
  User management, and the Audit Log.
- **Editor** — can manage all content (services, pricing, blog,
  portfolio, testimonials, FAQs, notifications, landing pages, leads,
  media) but cannot touch site-wide settings, users, or the audit log.

At least one active owner account is always required — the API refuses
to delete or demote the last one.

## 8. Admin dashboard

Sign in at `/admin`. A logged-out visitor is redirected **server-side**
before the dashboard HTML is ever sent — there's no flash of protected
content. Sections: Overview, Services, Pricing, Blog, Portfolio,
Testimonials, FAQs, Notifications, Landing Pages, Leads, Media, Website
Settings, Users, Audit Log.

Every list/create/edit/delete action calls the real API — nothing in
the dashboard is mocked. This is verified by `npm run test:ui`, which
boots the actual dashboard code in a headless browser-like environment,
logs in for real, and clicks through every section checking for
JavaScript errors and actual rendered content.

## 9. Content systems

**Services** — 11 seeded from your spec. Each has a slug, description,
features, and publish toggle. Editable at Admin → Services.

**Pricing** — 8 categories, 24 packages, exactly matching the pricing
you specified (Website Development, SEO, Local SEO, Social Media
Management, Digital Marketing, AI Automation, Website Maintenance,
Landing Page Development). Supports a reference/crossed-out price,
billing period, badges, and custom-quote mode.

**Blog** — full draft/scheduled/published workflow, categories, tags,
featured image, SEO title/description. Content is sanitized before
storage. No posts are seeded — write your first one in Admin → Blog.

**Portfolio** — `is_demo` defaults to true; only flip it for real,
verified client work. 3 sample projects are seeded, clearly labeled.

**Testimonials** — none are seeded (the spec explicitly forbids
inventing them). The public site shows "coming soon" until you publish
real ones.

**FAQs** — 6 seeded, general and honest (no ranking guarantees).

**Notifications** — site-wide announcement banner with optional
start/end dates and a CTA link. None active by default.

**Landing pages** — dynamic campaign pages at `/landing.html?slug=...`,
built for paid traffic (Meta/Google/Instagram Ads). Create one in Admin
→ Landing Pages with a headline, subheadline, and body sections; it's
immediately live at that URL once published.

## 10. Lead management & campaign tracking

Every contact form submission (main contact page or any landing page)
becomes a row in `leads`, with status tracking (new → read → contacted
→ in progress → completed → archived), an internal notes field, and
automatic capture of `utm_source` / `utm_medium` / `utm_campaign` /
`utm_content` from the page URL, plus which page the enquiry came from.
Manage leads at Admin → Leads.

## 11. SEO

- Semantic HTML, proper heading hierarchy on every page.
- Per-page `<title>` and meta description; blog posts and landing
  pages support their own SEO title/description that override the
  defaults.
- `/sitemap.xml` and `/robots.txt` are generated live from published
  content — not static files that go stale.
- Clean URLs (`blog-post.html?slug=...`, not numeric IDs).
- Structured data was **not** added, since fabricating review/rating
  markup without real data would violate the spec's truthfulness
  rules — add it once you have real aggregate ratings to report.

## 12. Performance

- No framework/build-step overhead on the public site — plain HTML/CSS/
  JS loads fast.
- Images use `loading` best-practices where present; you control actual
  image weight via what you upload in Admin → Media.
- Scroll-triggered animations use `IntersectionObserver` (cheap) and
  respect `prefers-reduced-motion`.
- Database queries use indexes on every frequently-filtered column
  (status, slug, created_at).

## 13. Accessibility

Semantic landmarks, labeled form fields, visible focus states
(`:focus-visible` outlines throughout), keyboard-operable navigation
and FAQ accordions, sufficient color contrast in the design system, and
`prefers-reduced-motion` support.

## 14. Running locally

```bash
npm install
cp .env.example .env    # fill in ADMIN_EMAIL / ADMIN_PASSWORD at minimum
npm run setup            # migrate + seed
npm start
```

Then verify everything actually works before you trust it:

```bash
npm run test:api      # 24 checks: auth, CSRF, CRUD, leads, security headers
npm run test:ui       # 14 checks: every admin section, real login, zero JS errors
npm run test:public   # 13 checks: every public page, zero JS errors, real content
```

(`npm test` runs all three in sequence.)

## 15. Deployment

This is a standard Node.js app — deploy it anywhere Node runs. The
database is Postgres (e.g. [Neon](https://neon.tech), free forever,
no expiration), which already lives outside the app's own disk — so,
unlike a SQLite/file-based setup, **you do not need a persistent disk
for the database to survive restarts and redeploys.**

1. Create a free Postgres database (Neon or similar) and copy its
   connection string.
2. Push this repo to GitHub.
3. Connect it to your platform of choice (Render, Railway, Fly.io, a VPS).
4. Set the environment variables from `.env.example` in the platform's
   dashboard (never commit `.env`) — at minimum `DATABASE_URL`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, plus a `SESSION_TTL_HOURS` if you
   want something other than the 72-hour default.
5. Set the build command to `npm install` and the start command to
   `npm run migrate && npm run seed && npm start` for the first deploy
   (after that, `npm start` alone is enough — migrate/seed are safe to
   re-run since they skip anything that already exists).
6. Point your domain at the platform, and set `SITE_URL` in your env
   vars to your real domain (used for the sitemap and email links).

**One remaining caveat:** `public/uploads/` (files uploaded through
Admin → Media, and admin-uploaded team/founder photos if you ever
change those away from the ones committed to the repo) is still saved
to the app's own local disk, not to Postgres. On a platform without a
persistent disk (Render's free plan, for example), those specific
uploaded files would still be lost on restart — the settings/content
data itself is safe in Postgres regardless. If you plan to use the
Media Library heavily, either add a persistent disk (usually a paid
tier) or move media storage to something like Cloudinary/S3 later.

**Your own VPS instead:**
1. Install Node.js 22+.
2. Clone the repo, `npm install --omit=dev`, set up `.env`.
3. Run `npm run setup` once.
4. Run the app behind a process manager (`pm2 start server/index.js`)
   and a reverse proxy (nginx) that terminates HTTPS — the app trusts
   `X-Forwarded-For` (`trust proxy` is enabled) for accurate rate
   limiting and audit logs behind a proxy.
5. Set `NODE_ENV=production` so cookies are marked `Secure` (requires
   HTTPS to function — don't set this until TLS is actually in place).

## 16. Adding email, phone, social, and logo

All of these are **empty by design** — nothing was invented. Add them
any time, with zero code changes and zero redeploys needed for content
(only the email-sending feature needs a real deploy to add the
`nodemailer` package — see below).

- **Logo, favicon, tagline, phone, address, business hours, social
  links (Instagram/Facebook/YouTube/LinkedIn/GitHub):** Admin →
  Website Settings. They appear on the public site immediately. Any
  field left blank simply doesn't render — no broken links, no empty
  icons.
- **Contact email:** same screen. Also used as the "from"/reply
  context once email sending is turned on.
- **Sending real emails (password reset, lead notifications):**
  1. `npm install nodemailer`
  2. Uncomment the nodemailer block in `server/lib/mailer.js` (it's
     already written and commented, targeting nodemailer's exact API).
  3. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
     in `.env`.
  4. Restart the server. That's the entire change.
- **Analytics / Meta Pixel / Google Ads conversion tracking:** set
  `GA_MEASUREMENT_ID`, `META_PIXEL_ID`, `GOOGLE_ADS_CONVERSION_ID` in
  `.env`. (Injecting the actual tracking snippets into the page
  templates once you have real IDs is a small follow-up — search
  `public/js/site.js` for where to add them, right after the `boot()`
  settings fetch.)

## 17. Day-to-day content management

Everything below is done at `/admin`, no code required:

- **Manage pricing:** Admin → Pricing. Add/edit/delete categories and
  packages, toggle published/featured, set custom-quote mode.
- **Manage services:** Admin → Services. Edit descriptions, features,
  publish state.
- **Manage the blog:** Admin → Blog. Write in the body field (basic
  HTML is supported and sanitized — headings, paragraphs, lists, bold/
  italic, links, images); set status to Published when ready.
- **Manage the portfolio:** Admin → Portfolio. Leave `is_demo` on for
  concept/sample work; only switch it off for verified real client
  projects.
- **Manage leads:** Admin → Leads. Filter by status, add internal
  notes, update status as you work an enquiry.
- **Manage landing pages:** Admin → Landing Pages. Create one per ad
  campaign; the slug becomes the URL (`/landing.html?slug=your-slug`).

## 18. Backup & restore

The entire application state lives in two places:
`data/app.db` (SQLite database) and `public/uploads/` (uploaded media).
Neither is committed to git (see `.gitignore`) — back them up separately.

**Backup:**
```bash
cp data/app.db backups/app-$(date +%Y%m%d-%H%M%S).db
tar -czf backups/uploads-$(date +%Y%m%d-%H%M%S).tar.gz public/uploads
```
Automate this with a cron job on whatever host you deploy to. **This
repo does not run automatic backups on its own** — that's a hosting-
level concern, and claiming otherwise would be exactly the kind of
invented functionality this project was built to avoid.

**Restore:**
```bash
cp backups/app-<timestamp>.db data/app.db
tar -xzf backups/uploads-<timestamp>.tar.gz -C /
```
Restart the server afterward.

## 19. Remaining external configuration

A short, honest list of what's genuinely left for you to do — nothing
here was faked or skipped by accident:

- [ ] Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` and run `npm run seed`
- [ ] Add your logo, tagline, contact info, and social links in Admin
- [ ] Decide on and connect a real hosting platform (§15)
- [ ] Point a real domain at it, and set `SITE_URL` accordingly
- [ ] Add SMTP credentials if you want real email sending (§16)
- [ ] Add GA/Meta Pixel/Google Ads IDs if you want tracking
- [ ] Write your first blog post
- [ ] Replace sample portfolio projects with real client work as it
      becomes available (and only then — see §9)
- [ ] Add real testimonials as clients provide them

## 20. Database internals (Postgres via `pg`)

`server/db.js` is the **only** file that knows the database is
Postgres. It wraps the `pg` driver behind a `prepare(sql).get/.all/.run(...)`
interface shaped like `better-sqlite3`'s (this app was originally built
on SQLite; it now runs on Postgres end-to-end). A few things it handles
transparently, so the ~180 call sites across `server/routes/` don't need
to think about them:

- `?` placeholders are auto-translated to Postgres's `$1, $2, ...`
- Named placeholders (`@name`) from `better-sqlite3`-style calls like
  `.run({ slug, name })` are also supported and auto-translated
- `datetime('now')` in SQL text is auto-translated to `now()`
- `.run()` still returns `{ lastInsertRowid, changes }` — a
  `RETURNING id` clause is auto-appended to plain `INSERT`s (skipped
  for the few tables whose primary key isn't called `id`: `site_settings`,
  `sessions`, `password_reset_tokens`, `blog_post_tags`)
- `db.transaction(fn)` runs every query inside `fn` — including ones
  from statements prepared elsewhere — on one shared client inside
  `BEGIN`/`COMMIT`/`ROLLBACK`, using `AsyncLocalStorage` so the calling
  code doesn't need to pass a client around manually
- `db.pragma()` is a harmless no-op (Postgres always enforces foreign keys)

A couple of things that needed manual, per-query fixes rather than a
generic translation (worth knowing if you add new queries):
- SQLite's `datetime('now', '-15 minutes')` modifier syntax has no
  Postgres equivalent — use a real interval expression instead, e.g.
  `now() - (? || ' minutes')::interval` (see `recentFailedAttempts` in
  `server/routes/auth.routes.js`).
- Comparing a `TEXT` column against a timestamp needs an explicit cast:
  `published_at::timestamptz <= now()` (see the blog/notifications
  queries in `server/routes/public.routes.js`).
- `COUNT(*)` comes back from Postgres as a string (`bigint`), not a
  number — wrap it in `parseInt(row.n, 10)`.
- SQLite's `INSERT OR IGNORE` doesn't exist in Postgres — use
  `INSERT ... ON CONFLICT (...) DO NOTHING` instead.

## 21. Troubleshooting

- **"Owner account already exists — skipping" but I can't log in:**
  You likely ran `npm run seed` once already. Check `.env` matches
  the account you actually created, or add a new owner manually via
  the API/database if you've lost access.
- **Uploaded images 404 after a redeploy:** your host doesn't have a
  persistent volume for `public/uploads/` — see §15.
- **CSS looks broken on `/admin`:** if you ever edit
  `public/admin/css/admin.css`, keep its `@import` pointing at
  `../../css/style.css` (two levels up) — this exact path broke once
  during development and was fixed; it's easy to get wrong again.
- **Session seems to log out unexpectedly:** sessions expire after
  `SESSION_TTL_HOURS` (default 72) and are fully invalidated (not just
  cookie-cleared) on logout or password change — this is intentional.
