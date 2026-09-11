const express = require("express");
const db = require("../../db");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

router.use("/services", require("./services.routes"));
router.use("/pricing", require("./pricing.routes"));
router.use("/portfolio", require("./portfolio.routes"));
router.use("/", require("./content.routes")); // /testimonials, /faqs, /notifications
router.use("/blog", require("./blog.routes"));
router.use("/leads", require("./leads.routes"));
router.use("/settings", require("./settings.routes"));
router.use("/users", require("./users.routes"));
router.use("/media", require("./media.routes"));
router.use("/audit", require("./audit.routes"));
router.use("/landing", require("./landing.routes"));

// GET /api/admin/overview — counts for the dashboard home screen
router.get("/overview", requireAuth, requireRole("owner", "editor"), async (req, res) => {
  // Postgres returns COUNT(*) as a string (bigint), so every value here
  // is parsed back to a number to match the old SQLite behaviour.
  const count = async table => parseInt((await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).n, 10);
  res.json({
    services: await count("services"),
    pricingPackages: await count("pricing_packages"),
    blogPosts: await count("blog_posts"),
    blogPostsPublished: parseInt((await db.prepare(`SELECT COUNT(*) AS n FROM blog_posts WHERE status='published'`).get()).n, 10),
    portfolioProjects: await count("portfolio_projects"),
    testimonials: await count("testimonials"),
    testimonialsPublished: parseInt((await db.prepare(`SELECT COUNT(*) AS n FROM testimonials WHERE published=1`).get()).n, 10),
    faqs: await count("faqs"),
    leadsTotal: await count("leads"),
    leadsNew: parseInt((await db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE status='new'`).get()).n, 10),
    landingPages: await count("landing_pages"),
    mediaFiles: await count("media"),
  });
});

module.exports = router;
