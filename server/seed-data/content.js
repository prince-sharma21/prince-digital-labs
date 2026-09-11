/**
 * PORTFOLIO — demo projects only. isDemo:true is enforced in the
 * rendering code (main.js) to show a "Sample project" label — the
 * spec explicitly forbids presenting demo work as real client work.
 * Replace with real project records once available.
 */
const PORTFOLIO = [
  {
    id: "dream-digital-hub",
    title: "Dream Digital Hub Agency",
    category: "Website Development",
    description: "A full multi-page website built for a digital marketing agency — services, pricing, team profiles, and a working contact flow.",
    tech: ["Node.js", "Express", "HTML/CSS", "JavaScript"],
    url: "https://dream-digital-hub.onrender.com/",
    isDemo: false,
  },
  {
    id: "sample-01",
    title: "Local Service Business — Concept Site",
    category: "Website Development",
    description: "A concept redesign exploring a clean, mobile-first booking flow for a local service business.",
    tech: ["HTML/CSS", "JavaScript"],
    isDemo: true,
  },
  {
    id: "sample-02",
    title: "Product Landing Page — Concept",
    category: "Landing Page Development",
    description: "A conversion-focused landing page concept built around a single offer and a clear CTA.",
    tech: ["HTML/CSS", "JavaScript"],
    isDemo: true,
  },
  {
    id: "sample-03",
    title: "SEO Content Structure — Concept",
    category: "SEO",
    description: "A sample on-page SEO structure showing heading hierarchy, internal linking, and metadata setup.",
    tech: ["Technical SEO"],
    isDemo: true,
  },
];

/**
 * TESTIMONIALS — intentionally empty. Never invent client quotes.
 * The homepage/testimonials section shows a "coming soon" state
 * whenever this array is empty. Add real testimonial objects here
 * ({ name, company, quote, rating }) once clients provide them.
 */
const TESTIMONIALS = [];

/**
 * FAQs — general, honest answers. No ranking/results guarantees.
 */
const FAQS = [
  {
    q: "What does Prince Digital Labs actually do?",
    a: "We build websites and landing pages, run SEO and digital marketing, manage social media and Google Business profiles, and build AI automations for repetitive business workflows.",
  },
  {
    q: "How long does a website take to build?",
    a: "It depends on scope. A Starter site is typically quicker than a Premium CMS-backed build. We'll give you a clear timeline before work begins.",
  },
  {
    q: "Do you guarantee first-page Google rankings?",
    a: "No — and any agency that guarantees this isn't being straight with you. We focus on solid technical and on-page SEO work that improves your visibility over time.",
  },
  {
    q: "Is advertising spend included in marketing packages?",
    a: "No. Our packages cover strategy, setup, and management. Any ad spend on platforms like Meta or Google is separate and controlled by you.",
  },
  {
    q: "Can I request changes after the project is delivered?",
    a: "Each package includes a set number of revision rounds. Ongoing changes after that are covered by our Website Maintenance plans.",
  },
  {
    q: "How do I get started?",
    a: "Reach out through the contact form with a bit about your business and what you need — we'll follow up to scope the right package for you.",
  },
];

/** PROCESS — a genuine sequence, so numbering it is meaningful. */
const PROCESS = [
  { step: 1, title: "Understand", text: "We learn about your business, goals, and audience before proposing anything." },
  { step: 2, title: "Plan", text: "We scope the right package and map out pages, content, or campaigns." },
  { step: 3, title: "Build", text: "We design and build — websites, campaigns, or automations — with regular check-ins." },
  { step: 4, title: "Launch", text: "We deploy, test, and hand things over cleanly, with documentation." },
  { step: 5, title: "Improve", text: "We monitor performance and keep refining based on real data." },
];

module.exports = { PORTFOLIO, TESTIMONIALS, FAQS, PROCESS };
