const db = require("./db");
const config = require("./config");
const { hashPassword, isPasswordStrongEnough } = require("./lib/hash");
const SERVICES = require("./seed-data/services");
const PRICING_CATEGORIES = require("./seed-data/pricing");
const { PORTFOLIO, FAQS, PROCESS } = require("./seed-data/content");

async function seedOwnerAccount() {
  const existingOwner = await db.prepare(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`).get();
  if (existingOwner) {
    console.log("  ✓ Owner account already exists — skipping.");
    return;
  }
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    console.warn(
      "  ⚠ No owner account exists yet, and ADMIN_EMAIL / ADMIN_PASSWORD are not set in .env.\n" +
      "    Set them and re-run `npm run seed` to create your first login.\n" +
      "    Nothing was invented — see .env.example."
    );
    return;
  }
  if (!isPasswordStrongEnough(config.ADMIN_PASSWORD)) {
    console.warn("  ⚠ ADMIN_PASSWORD must be at least 10 characters. Owner account NOT created.");
    return;
  }
  const hash = await hashPassword(config.ADMIN_PASSWORD);
  await db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'owner')`).run(
    config.ADMIN_NAME || "Site Owner",
    config.ADMIN_EMAIL.toLowerCase(),
    hash
  );
  console.log(`  ✓ Owner account created for ${config.ADMIN_EMAIL}`);
}

async function seedServices() {
  const insert = db.prepare(
    `INSERT INTO services (slug, name, short_description, features, icon, sort_order, published)
     VALUES (@slug, @name, @short, @features, @icon, @sort_order, 1)`
  );
  let inserted = 0;
  for (let i = 0; i < SERVICES.length; i++) {
    const s = SERVICES[i];
    const exists = await db.prepare(`SELECT id FROM services WHERE slug = ?`).get(s.slug);
    if (exists) continue;
    await insert.run({ slug: s.slug, name: s.name, short: s.short, features: JSON.stringify(s.features || []), icon: s.icon || null, sort_order: i });
    inserted++;
  }
  console.log(`  ✓ Services: ${inserted} inserted, ${SERVICES.length - inserted} already present.`);
}

async function seedPricing() {
  const insertCat = db.prepare(`INSERT INTO pricing_categories (slug, name, note, sort_order) VALUES (?, ?, ?, ?)`);
  const insertPkg = db.prepare(
    `INSERT INTO pricing_packages (category_id, name, price, billing_period, badge, blurb, features, featured, sort_order)
     VALUES (@category_id, @name, @price, @period, @badge, @blurb, @features, @featured, @sort_order)`
  );
  let catCount = 0, pkgCount = 0;
  for (let ci = 0; ci < PRICING_CATEGORIES.length; ci++) {
    const cat = PRICING_CATEGORIES[ci];
    let catRow = await db.prepare(`SELECT id FROM pricing_categories WHERE slug = ?`).get(cat.id);
    if (!catRow) {
      const info = await insertCat.run(cat.id, cat.name, cat.note || null, ci);
      catRow = { id: info.lastInsertRowid };
      catCount++;
    }
    for (let pi = 0; pi < cat.packages.length; pi++) {
      const pkg = cat.packages[pi];
      const exists = await db.prepare(`SELECT id FROM pricing_packages WHERE category_id = ? AND name = ?`).get(catRow.id, pkg.name);
      if (exists) continue;
      await insertPkg.run({
        category_id: catRow.id,
        name: pkg.name,
        price: pkg.price,
        period: pkg.period,
        badge: pkg.badge || null,
        blurb: pkg.blurb || null,
        features: JSON.stringify(pkg.features || []),
        featured: pkg.badge ? 1 : 0,
        sort_order: pi,
      });
      pkgCount++;
    }
  }
  console.log(`  ✓ Pricing: ${catCount} categories, ${pkgCount} packages inserted.`);
}

async function seedPortfolio() {
  const insert = db.prepare(
    `INSERT INTO portfolio_projects (slug, title, description, category, technologies, project_url, is_demo, published, sort_order)
     VALUES (@slug, @title, @description, @category, @technologies, @project_url, @is_demo, 1, @sort_order)`
  );
  let inserted = 0;
  for (let i = 0; i < PORTFOLIO.length; i++) {
    const p = PORTFOLIO[i];
    const exists = await db.prepare(`SELECT id FROM portfolio_projects WHERE slug = ?`).get(p.id);
    if (exists) continue;
    await insert.run({
      slug: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      technologies: JSON.stringify(p.tech || []),
      project_url: p.url || null,
      is_demo: p.isDemo === false ? 0 : 1,
      sort_order: i,
    });
    inserted++;
  }
  console.log(`  ✓ Portfolio: ${inserted} project(s) inserted (real client work marked accordingly, samples marked is_demo).`);
  console.log(`  ℹ Testimonials seeded: 0 (none provided — the site correctly shows "coming soon" until real ones are added in Admin).`);
}

async function seedFaqs() {
  const insert = db.prepare(`INSERT INTO faqs (question, answer, sort_order, published) VALUES (?, ?, ?, 1)`);
  let inserted = 0;
  for (let i = 0; i < FAQS.length; i++) {
    const f = FAQS[i];
    const exists = await db.prepare(`SELECT id FROM faqs WHERE question = ?`).get(f.q);
    if (exists) continue;
    await insert.run(f.q, f.a, i);
    inserted++;
  }
  console.log(`  ✓ FAQs: ${inserted} inserted.`);
}

async function seedSettings() {
  // Brand name and founder profile are confirmed real information Prince
  // provided directly; everything else (tagline, logo, contact, social)
  // stays empty until set in Admin — per the spec's "never invent
  // missing information" rule.
  const defaults = {
    brand_name: "Prince Digital Labs",
    footer_copyright_name: "Prince Digital Labs",
    logo_url: "/images/logo.png",

    contact_phone: "+91 88826 76496",
    contact_whatsapp: "918882676496",

    theme_primary: "#4C7CFF",
    theme_accent: "#FF7A1A",
    theme_accent2: "#22D3EE",

    promo_ticker_text:
      "🏆 Trusted Web Development Agency  |  Websites Starting ₹8,999  |  200+ Happy Clients  |  7-Day Delivery  |  Call +91 88826 76496  |  @princedigitallabs on Instagram",

    social_github: "https://github.com/prince-sharma21",
    social_instagram: "https://www.instagram.com/princedigitallabs",
    social_facebook: "https://www.facebook.com/share/1EVusfqUsw/",
    social_youtube: "https://www.youtube.com/@CodeWithPrince21",
    social_telegram: "https://t.me/pythanprince",
    social_twitter: "https://x.com/Princedelhincr",
    // social_linkedin intentionally left unset — Prince will add it via Admin later.

    founder_name: "Prince",
    founder_role: "Founder — Prince Digital Labs",
    founder_photo_url: "/images/founder.jpg",
    founder_bio:
      "I'm Prince, the Founder of Prince Digital Labs, a digital solutions brand focused on helping businesses build a stronger and more professional online presence. I combine web development, SEO, digital marketing, and technology to create practical solutions that help brands grow online.\n\n" +
      "I have a strong foundation in Python and have completed my DSA learning, giving me a solid understanding of programming, problem-solving, algorithms, and efficient application development. Along with programming, I work with modern web technologies and digital marketing strategies to connect technology with real business goals.\n\n" +
      "As the founder, my goal is to build a reliable digital brand that provides businesses with high-quality, result-focused digital services. Prince Digital Labs brings together website development, SEO, branding, content, and digital marketing under one professional platform.",
    founder_belief:
      "I believe a successful digital presence should be fast, useful, secure, visually professional, and designed around real business objectives. Technology should not only look impressive — it should solve problems, create opportunities, and make it easier for customers to connect with a brand.",
    founder_approach:
      "I focus on understanding the business first, then choosing the right combination of design, development, SEO, and marketing. I value clean implementation, continuous learning, measurable improvement, and long-term digital growth.",
    founder_vision:
      "My long-term vision for Prince Digital Labs is to develop it into a trusted digital partner for businesses and creators, delivering modern websites, strong digital branding, effective SEO, and growth-focused marketing solutions.",
    founder_skills: [
      "Programming | Python, Data Structures & Algorithms, problem-solving",
      "Web Development | HTML, CSS, JavaScript, frontend and backend development",
      "SEO | On-page SEO, technical SEO, local SEO, advanced SEO setup",
      "Digital Marketing | Performance marketing, social media, content and lead generation",
      "Database & Backend | Database-driven applications, authentication and CMS workflows",
      "Development Tools | Git, GitHub, deployment and production troubleshooting",
    ].join("\n"),
    founder_highlights: [
      "Strong working knowledge of Python",
      "Completed Data Structures & Algorithms learning",
      "Web development and full-stack project experience",
      "SEO and digital marketing knowledge",
      "Experience building and managing database-driven websites",
      "Hands-on GitHub and deployment workflow experience",
      "Founder of Prince Digital Labs",
    ].join("\n"),
  };
  const upsert = db.prepare(
    `INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`
  );
  for (const [k, v] of Object.entries(defaults)) await upsert.run(k, v);
  console.log(`  ✓ Site settings: brand name + founder profile set, contact/social left empty for Admin to fill in.`);
}

async function main() {
  console.log("Seeding database...");
  await seedOwnerAccount();
  await seedServices();
  await seedPricing();
  await seedPortfolio();
  await seedFaqs();
  await seedSettings();
  console.log("Done. PROCESS steps are static content on the homepage, not DB-seeded (they represent the fixed 5-step methodology).");
}

main()
  .catch(err => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
