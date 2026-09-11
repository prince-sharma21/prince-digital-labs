/**
 * SITE — shared shell for every public page. Fetches live settings from
 * the database (not a static file) so admin edits show up immediately,
 * per the CMS requirement. Renders the navbar, footer, and any active
 * notification banner, then exposes small helpers each page uses.
 */
const Site = (() => {
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  const NAV_ITEMS = [
    { href: "index.html", label: "Home" },
    { href: "about.html", label: "About" },
    { href: "founder.html", label: "Founder" },
    { href: "services.html", label: "Services" },
    { href: "pricing.html", label: "Pricing" },
    { href: "portfolio.html", label: "Portfolio" },
    { href: "blog.html", label: "Blog" },
    { href: "contact.html", label: "Contact" },
  ];

  const SOCIAL_ICONS = {
    social_instagram: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
    social_facebook: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    social_youtube: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg>',
    social_linkedin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="3"/><line x1="7" y1="10" x2="7" y2="17"/><line x1="7" y1="7" x2="7" y2="7.01"/><line x1="12" y1="10" x2="12" y2="17"/><path d="M12 13a2.5 2.5 0 0 1 5 0v4"/></svg>',
    social_github: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.7 2.8 5.6 3.1 5.6 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>',
    social_telegram: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3 2 11l7 2m13-10-4 18-9-6m13-12L9 15"/></svg>',
    social_twitter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.8L4.4 22H1.3l8.2-9.3L1 2h7l4.9 6.2L18.9 2Zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20Z"/></svg>',
  };

  function initials(name) {
    return (name || "PD").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  }

  let settingsCache = null;
  async function getSettings() {
    if (settingsCache) return settingsCache;
    try {
      const res = await fetch("/api/public/settings");
      settingsCache = await res.json();
    } catch {
      settingsCache = {};
    }
    return settingsCache;
  }

  function renderHeader(settings, currentPage) {
    const el = document.getElementById("site-header");
    if (!el) return;
    const brandName = settings.brand_name || "Prince Digital Labs";
    // The logo image already has the wordmark baked in, so when it's set
    // we show only the image (no separate duplicate text label). Falls
    // back to an initials badge + text name until a logo is uploaded.
    const brandInner = settings.logo_url
      ? `<img src="${escapeHtml(settings.logo_url)}" alt="${escapeHtml(brandName)}" style="height:42px;width:auto;object-fit:contain;">`
      : `<span class="brand-mark">${initials(brandName)}</span><span>${escapeHtml(brandName)}</span>`;

    const links = NAV_ITEMS.map(item => {
      const active = item.href === currentPage ? ' aria-current="page"' : "";
      return `<a href="${item.href}"${active}>${item.label}</a>`;
    }).join("");

    const callBtn = settings.contact_phone
      ? `<a href="tel:${escapeHtml(settings.contact_phone.replace(/\s/g, ""))}" class="btn btn-ghost btn-sm">📞 Call Now</a>`
      : "";

    el.innerHTML = `
      <div class="navbar">
        <div class="container navbar-inner">
          <a href="index.html" class="brand">${brandInner}</a>
          <nav class="nav-links" id="navLinks">${links}</nav>
          <div class="nav-cta">
            ${callBtn}
            <a href="contact.html" class="btn btn-primary btn-sm">Get Started</a>
          </div>
          <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    `;
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("navLinks");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function renderFooter(settings) {
    const el = document.getElementById("site-footer");
    if (!el) return;
    const brandName = settings.brand_name || "Prince Digital Labs";

    const contactLines = [];
    if (settings.contact_email) contactLines.push(`<li><a href="mailto:${escapeHtml(settings.contact_email)}">${escapeHtml(settings.contact_email)}</a></li>`);
    if (settings.contact_phone) contactLines.push(`<li><a href="tel:${escapeHtml(settings.contact_phone.replace(/\s/g, ""))}">${escapeHtml(settings.contact_phone)}</a></li>`);
    if (settings.contact_address) contactLines.push(`<li>${escapeHtml(settings.contact_address)}</li>`);
    if (settings.business_hours) contactLines.push(`<li>${escapeHtml(settings.business_hours)}</li>`);
    const contactHTML = contactLines.length ? contactLines.join("") : `<li style="color:var(--dark-ink-soft)">Contact details coming soon</li>`;

    const socialHTML = Object.keys(SOCIAL_ICONS)
      .filter(key => settings[key])
      .map(key => `<a href="${escapeHtml(settings[key])}" target="_blank" rel="noopener">${SOCIAL_ICONS[key]}</a>`)
      .join("");

    const footerBrandInner = settings.logo_url
      ? `<img src="${escapeHtml(settings.logo_url)}" alt="${escapeHtml(brandName)}" style="height:38px;width:auto;object-fit:contain;">`
      : `<span class="brand-mark">${initials(brandName)}</span><span>${escapeHtml(brandName)}</span>`;

    el.innerHTML = `
      <div class="footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <div class="brand" style="color:#fff;margin-bottom:12px;">
                ${footerBrandInner}
              </div>
              <p style="max-width:260px;">${escapeHtml(settings.brand_tagline) || "Websites, digital marketing, and AI automation for growing businesses."}</p>
              ${socialHTML ? `<div class="footer-social">${socialHTML}</div>` : ""}
            </div>
            <div>
              <h4>Company</h4>
              <ul class="footer-links">
                <li><a href="about.html">About</a></li>
                <li><a href="founder.html">Founder</a></li>
                <li><a href="portfolio.html">Portfolio</a></li>
                <li><a href="blog.html">Blog</a></li>
                <li><a href="contact.html">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4>Services</h4>
              <ul class="footer-links">
                <li><a href="services.html">Website Development</a></li>
                <li><a href="services.html">Digital Marketing</a></li>
                <li><a href="services.html">SEO</a></li>
                <li><a href="services.html">AI Automation</a></li>
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul class="footer-links">${contactHTML}</ul>
            </div>
          </div>
          <div class="footer-bottom">
            <span>&copy; ${new Date().getFullYear()} ${escapeHtml(settings.footer_copyright_name || brandName)}. All rights reserved.</span>
            <span><a href="privacy.html">Privacy Policy</a> &nbsp;·&nbsp; <a href="terms.html">Terms &amp; Conditions</a></span>
          </div>
        </div>
      </div>
    `;
  }

  async function renderNotificationBar() {
    const el = document.getElementById("notification-bar");
    if (!el) return;
    try {
      const res = await fetch("/api/public/notifications");
      const notifications = await res.json();
      if (!notifications.length) return;
      const n = notifications[0]; // most recent active one
      el.innerHTML = `
        <div style="background:var(--ink);color:#fff;font-size:0.85rem;">
          <div class="container" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 16px;text-align:center;flex-wrap:wrap;">
            <span>${escapeHtml(n.message)}</span>
            ${n.cta_label && n.cta_link ? `<a href="${escapeHtml(n.cta_link)}" style="color:var(--accent);font-weight:600;text-decoration:underline;">${escapeHtml(n.cta_label)}</a>` : ""}
          </div>
        </div>`;
    } catch { /* fail silently — a notification bar is non-critical */ }
  }

  function initRevealAnimations() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("in")); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => observer.observe(el));
  }

  /** Wires up a standard FAQ accordion given a container with .faq-item children. */
  function initFaqAccordion(container) {
    container.querySelectorAll(".faq-item").forEach(item => {
      item.querySelector(".faq-q").addEventListener("click", () => {
        const wasOpen = item.classList.contains("open");
        container.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
        if (!wasOpen) item.classList.add("open");
      });
    });
  }

  function faqIcon() {
    return `<span class="faq-icon">+</span>`;
  }

  /** Reads utm_* params from the current URL, for attaching to lead submissions. */
  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    const out = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(k => {
      if (params.get(k)) out[k] = params.get(k);
    });
    return out;
  }

  /** Submits the contact form to the real API, attaching UTM + source page. */
  async function submitContactForm(fields) {
    const payload = { ...fields, sourcePage: window.location.pathname + window.location.search, ...getUtmParams() };
    const res = await fetch("/api/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  function renderWhatsAppWidget(settings) {
    // Never show a fake/non-functional widget — only render once a real
    // WhatsApp number has been set in Admin.
    const number = (settings.contact_whatsapp || "").replace(/\D/g, "");
    if (!number) return;

    const brandName = settings.brand_name || "Prince Digital Labs";
    const wa = document.createElement("div");
    wa.innerHTML = `
      <button class="wa-fab" id="waFab" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .9.9-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1s-.6.8-.7.9-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3 1 2.6 1.1 2.7s2 3 4.7 4.2a5.5 5.5 0 0 0 3.3.7 2.8 2.8 0 0 0 1.9-1.3 2.2 2.2 0 0 0 .1-1.3c-.1-.1-.2-.2-.4-.3z"/></svg>
      </button>
      <div class="wa-panel" id="waPanel">
        <div class="wa-panel-head">
          <div><strong>${escapeHtml(brandName)}</strong><span>Usually replies within a few hours</span></div>
          <button class="wa-panel-close" id="waClose" aria-label="Close">✕</button>
        </div>
        <div class="wa-panel-body">
          <p>👋 Hi! Tell us a bit about your business and what you need — website, marketing, or automation — and we'll get back to you.</p>
          <a class="btn btn-accent" target="_blank" rel="noopener"
             href="https://wa.me/${number}?text=${encodeURIComponent("Hi " + brandName + "! I'd like to know more about your services.")}">
            Chat on WhatsApp
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(wa);
    const fab = document.getElementById("waFab");
    const panel = document.getElementById("waPanel");
    fab.addEventListener("click", () => panel.classList.toggle("open"));
    document.getElementById("waClose").addEventListener("click", () => panel.classList.remove("open"));
  }

  function renderStickyMobileCta(settings) {
    const number = (settings.contact_whatsapp || "").replace(/\D/g, "");
    const phone = settings.contact_phone || "";
    if (!number && !phone) return; // nothing real to link to yet

    const bar = document.createElement("div");
    bar.className = "sticky-cta";
    if (phone) {
      bar.innerHTML += `<a href="tel:${escapeHtml(phone.replace(/\s/g, ""))}" class="btn btn-ghost btn-sm">Call</a>`;
    }
    if (number) {
      bar.innerHTML += `<a href="https://wa.me/${number}" target="_blank" rel="noopener" class="btn btn-accent btn-sm">WhatsApp Us</a>`;
    }
    document.body.appendChild(bar);
  }

  function renderPromoTicker(settings) {
    const text = (settings.promo_ticker_text || "").trim();
    if (!text) return; // admin left it blank -> no banner at all, nothing invented
    const item = `<span class="price-ticker-item">${escapeHtml(text)}</span>`;
    const track = item + item; // duplicated for a seamless scroll loop
    const wrap = document.createElement("div");
    wrap.className = "price-ticker";
    wrap.innerHTML = `<div class="price-ticker-track">${track}</div>`;
    document.body.prepend(wrap);
  }

  /** Lets Admin's "Appearance" colors override the CSS defaults, live, with no redeploy. */
  function applyThemeOverrides(settings) {
    const vars = [];
    if (settings.theme_primary) vars.push(`--primary: ${settings.theme_primary};`);
    if (settings.theme_accent) vars.push(`--accent: ${settings.theme_accent};`);
    if (settings.theme_accent2) vars.push(`--accent2: ${settings.theme_accent2};`);
    if (!vars.length) return;
    let styleTag = document.getElementById("theme-overrides");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "theme-overrides";
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `:root { ${vars.join(" ")} }`;
  }

  async function boot(currentPage) {
    // Settings and notifications don't depend on each other — fetch both
    // at once instead of one-after-another to cut boot's network time
    // roughly in half.
    const [settings] = await Promise.all([getSettings(), renderNotificationBar()]);
    applyThemeOverrides(settings);
    renderPromoTicker(settings);
    renderHeader(settings, currentPage);
    renderFooter(settings);
    renderWhatsAppWidget(settings);
    renderStickyMobileCta(settings);
    if (settings.favicon_url) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = settings.favicon_url;
    }
    return settings;
  }

  return { boot, getSettings, escapeHtml, initRevealAnimations, initFaqAccordion, faqIcon, getUtmParams, submitContactForm };
})();
