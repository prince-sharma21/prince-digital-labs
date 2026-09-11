async function renderServicesPreview() {
  const el = document.getElementById("servicesPreview");
  try {
    const services = await (await fetch("/api/public/services")).json();
    const preview = services.slice(0, 6);
    el.innerHTML = preview.map(s => `
      <div class="card service-card reveal">
        <div class="icon-badge"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg></div>
        <h3>${Site.escapeHtml(s.name)}</h3>
        <p>${Site.escapeHtml(s.short_description || "")}</p>
        <a href="services.html#${Site.escapeHtml(s.slug)}" style="color:var(--primary);font-weight:600;font-size:0.9rem;">Learn more →</a>
      </div>
    `).join("");
  } catch { el.innerHTML = `<p style="color:var(--ink-faint);">Services will appear here shortly.</p>`; }
}

function renderProcess() {
  const el = document.getElementById("processRow");
  const PROCESS = [
    { step: 1, title: "Understand", text: "We learn about your business, goals, and audience before proposing anything." },
    { step: 2, title: "Plan", text: "We scope the right package and map out pages, content, or campaigns." },
    { step: 3, title: "Build", text: "We design and build — websites, campaigns, or automations — with regular check-ins." },
    { step: 4, title: "Launch", text: "We deploy, test, and hand things over cleanly, with documentation." },
    { step: 5, title: "Improve", text: "We monitor performance and keep refining based on real data." },
  ];
  el.innerHTML = PROCESS.map(p => `
    <div class="process-step reveal">
      <span class="process-num">0${p.step}</span>
      <h3>${Site.escapeHtml(p.title)}</h3>
      <p style="font-size:0.9rem;">${Site.escapeHtml(p.text)}</p>
    </div>
  `).join("");
}

async function renderPortfolioPreview() {
  const el = document.getElementById("portfolioPreview");
  try {
    const items = await (await fetch("/api/public/portfolio")).json();
    if (!items.length) { el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Portfolio pieces are on their way.</div>`; return; }
    el.innerHTML = items.slice(0, 3).map(p => `
      <div class="card reveal">
        ${p.is_demo ? `<span class="badge-demo" style="margin-bottom:10px;display:inline-block;">Sample project</span>` : ""}
        <h3>${Site.escapeHtml(p.title)}</h3>
        <p style="font-size:0.9rem;">${Site.escapeHtml(p.description || "")}</p>
        ${p.category ? `<span class="eyebrow" style="margin:0;">${Site.escapeHtml(p.category)}</span>` : ""}
      </div>
    `).join("");
  } catch { el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Portfolio pieces are on their way.</div>`; }
}

async function renderTestimonials() {
  const el = document.getElementById("testimonialsWrap");
  try {
    const items = await (await fetch("/api/public/testimonials")).json();
    if (!items.length) {
      el.innerHTML = `<div class="empty-state">Client testimonials coming soon.</div>`;
      return;
    }
    el.innerHTML = `<div class="grid grid-3">${items.map(t => `
      <div class="card reveal">
        ${t.rating ? `<div style="color:var(--accent);margin-bottom:8px;">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</div>` : ""}
        <p style="font-style:italic;">"${Site.escapeHtml(t.quote)}"</p>
        <p style="font-weight:600;color:var(--ink);margin:0;">${Site.escapeHtml(t.client_name)}${t.company ? `, ${Site.escapeHtml(t.company)}` : ""}</p>
      </div>
    `).join("")}</div>`;
  } catch { el.innerHTML = `<div class="empty-state">Client testimonials coming soon.</div>`; }
}

async function renderBlogPreview() {
  const el = document.getElementById("blogPreview");
  const section = document.getElementById("blogPreviewSection");
  try {
    const data = await (await fetch("/api/public/blog?page=1")).json();
    if (!data.posts.length) { section.style.display = "none"; return; }
    el.innerHTML = data.posts.slice(0, 3).map(p => `
      <a href="blog-post.html?slug=${encodeURIComponent(p.slug)}" class="card reveal" style="display:block;">
        <span class="eyebrow" style="margin-bottom:8px;">${Site.escapeHtml(p.category_name || "Article")}</span>
        <h3>${Site.escapeHtml(p.title)}</h3>
        <p style="font-size:0.9rem;">${Site.escapeHtml(p.excerpt || "")}</p>
      </a>
    `).join("");
  } catch { section.style.display = "none"; }
}

async function renderFaqs() {
  const el = document.getElementById("faqList");
  try {
    const faqs = await (await fetch("/api/public/faqs")).json();
    if (!faqs.length) { el.innerHTML = `<div class="empty-state">FAQs coming soon.</div>`; return; }
    el.innerHTML = faqs.map(f => `
      <div class="faq-item">
        <button class="faq-q">${Site.escapeHtml(f.question)} ${Site.faqIcon()}</button>
        <div class="faq-a"><p>${Site.escapeHtml(f.answer)}</p></div>
      </div>
    `).join("");
    Site.initFaqAccordion(el);
  } catch { el.innerHTML = `<div class="empty-state">FAQs coming soon.</div>`; }
}

(async () => {
  await Site.boot("index.html");
  await Promise.all([renderServicesPreview(), renderPortfolioPreview(), renderTestimonials(), renderBlogPreview(), renderFaqs()]);
  renderProcess();
  Site.initRevealAnimations();
})();
