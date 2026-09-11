const db = require("../db");
const config = require("../config");

async function buildSitemapXml() {
  const staticPages = ["", "about.html", "services.html", "pricing.html", "portfolio.html", "blog.html", "contact.html", "privacy.html", "terms.html"];
  const services = await db.prepare(`SELECT slug, updated_at FROM services WHERE published = 1`).all();
  const posts = await db.prepare(`SELECT slug, updated_at FROM blog_posts WHERE status = 'published'`).all();
  const landing = await db.prepare(`SELECT slug, updated_at FROM landing_pages WHERE published = 1`).all();

  const urls = [
    ...staticPages.map(p => ({ loc: `${config.SITE_URL}/${p}`, lastmod: null })),
    ...services.map(s => ({ loc: `${config.SITE_URL}/services.html#${s.slug}`, lastmod: s.updated_at })),
    ...posts.map(p => ({ loc: `${config.SITE_URL}/blog-post.html?slug=${p.slug}`, lastmod: p.updated_at })),
    ...landing.map(l => ({ loc: `${config.SITE_URL}/landing.html?slug=${l.slug}`, lastmod: l.updated_at })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${config.SITE_URL}/sitemap.xml\n`;
}

module.exports = { buildSitemapXml, buildRobotsTxt };
