/**
 * SERVICES — structured as records (id, slug, fields) so this file
 * can be swapped for a real database/API call later with no change
 * to the rendering code in main.js.
 */
const SERVICES = [
  {
    id: "website-development",
    slug: "website-development",
    name: "Website Development",
    short: "Fast, modern, mobile-first websites built to convert visitors into customers.",
    icon: "code",
    features: ["Responsive design", "SEO-friendly structure", "Fast load times", "Contact & lead forms"],
  },
  {
    id: "digital-marketing",
    slug: "digital-marketing",
    name: "Digital Marketing",
    short: "Strategy and campaign management across the channels that matter to your business.",
    icon: "target",
    features: ["Campaign planning", "Audience research", "Multi-channel strategy", "Monthly reporting"],
  },
  {
    id: "seo",
    slug: "seo",
    name: "SEO",
    short: "Technical and on-page SEO to help the right people find you on search.",
    icon: "search",
    features: ["Keyword research", "On-page optimization", "Technical SEO audits", "Monthly reports"],
  },
  {
    id: "local-seo",
    slug: "local-seo",
    name: "Local SEO",
    short: "Get found by customers searching near you.",
    icon: "map-pin",
    features: ["Google Business Profile setup", "Local citations", "Review strategy", "Map-pack visibility"],
  },
  {
    id: "gbp-optimization",
    slug: "google-business-profile-optimization",
    name: "Google Business Profile Optimization",
    short: "A fully optimized, accurate, and active Google Business listing.",
    icon: "map",
    features: ["Profile setup & verification", "Photos & posts", "Q&A management", "Ongoing optimization"],
  },
  {
    id: "social-media-management",
    slug: "social-media-management",
    name: "Social Media Management",
    short: "Consistent, on-brand content and posting across your social channels.",
    icon: "share-2",
    features: ["Content calendar", "Captions & hashtag research", "Engagement monitoring", "Monthly reporting"],
  },
  {
    id: "orm",
    slug: "online-reputation-management",
    name: "Online Reputation Management",
    short: "Protect and strengthen how your business is perceived online.",
    icon: "shield",
    features: ["Review monitoring", "Response strategy", "Reputation reporting", "Proactive management"],
  },
  {
    id: "ai-automation",
    slug: "ai-automation",
    name: "AI Automation",
    short: "Automate repetitive business workflows so your team can focus on what matters.",
    icon: "zap",
    features: ["Workflow automation", "AI integrations", "Process documentation", "Testing & support"],
  },
  {
    id: "website-maintenance",
    slug: "website-maintenance",
    name: "Website Maintenance",
    short: "Ongoing updates, checks, and support so your site stays fast and secure.",
    icon: "tool",
    features: ["Content updates", "Security checks", "Performance checks", "Technical support"],
  },
  {
    id: "landing-page-development",
    slug: "landing-page-development",
    name: "Landing Page Development",
    short: "Focused, conversion-first pages built for a single campaign or offer.",
    icon: "layout",
    features: ["Conversion-focused structure", "Lead capture forms", "Analytics-ready", "Fast turnaround"],
  },
  {
    id: "custom-digital-solutions",
    slug: "custom-digital-solutions",
    name: "Custom Digital Solutions",
    short: "Have something specific in mind? We scope and build custom digital solutions.",
    icon: "layers",
    features: ["Needs assessment", "Custom scoping", "Flexible build", "Direct collaboration"],
  },
];

module.exports = SERVICES;
