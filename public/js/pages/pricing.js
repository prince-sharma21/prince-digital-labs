let categories = [];
let activeCategory = null;

function renderTabs() {
  const el = document.getElementById("pricingTabs");
  el.innerHTML = categories.map(c => `
    <button class="pricing-tab ${c.slug === activeCategory ? "active" : ""}" data-slug="${Site.escapeHtml(c.slug)}">${Site.escapeHtml(c.name)}</button>
  `).join("");
  el.querySelectorAll(".pricing-tab").forEach(btn => {
    btn.onclick = () => { activeCategory = btn.dataset.slug; renderTabs(); renderCategory(); };
  });
}

function renderCategory() {
  const el = document.getElementById("pricingContent");
  const cat = categories.find(c => c.slug === activeCategory);
  if (!cat) { el.innerHTML = `<div class="empty-state">Pricing is being set up — check back soon.</div>`; return; }
  if (!cat.packages.length) { el.innerHTML = `<div class="empty-state">No published packages in this category yet.</div>`; return; }

  el.innerHTML = `
    ${cat.note ? `<p class="pricing-note">${Site.escapeHtml(cat.note)}</p>` : ""}
    <div class="grid grid-3">
      ${cat.packages.map(p => `
        <div class="price-card reveal ${p.featured ? "featured" : ""}">
          ${p.badge ? `<span class="price-badge">${Site.escapeHtml(p.badge)}</span>` : ""}
          <h3>${Site.escapeHtml(p.name)}</h3>
          ${p.custom_quote
            ? `<div class="price-value" style="font-size:1.5rem;">Custom quote</div>`
            : `<div class="price-value">${Site.escapeHtml(p.price || "—")}</div><div class="price-period">${p.reference_price ? `<s>${Site.escapeHtml(p.reference_price)}</s> ` : ""}${Site.escapeHtml(p.billing_period)}</div>`
          }
          ${p.blurb ? `<p style="margin-top:12px;">${Site.escapeHtml(p.blurb)}</p>` : ""}
          ${p.features && p.features.length ? `<ul class="feature-list">${p.features.map(f => `<li>${Site.escapeHtml(f)}</li>`).join("")}</ul>` : ""}
          <a href="contact.html?service=${encodeURIComponent(cat.name + ' — ' + p.name)}" class="btn ${p.featured ? "btn-primary" : "btn-ghost"}">${Site.escapeHtml(p.cta_label || "Get Started")}</a>
        </div>
      `).join("")}
    </div>
  `;
  Site.initRevealAnimations();
}

(async () => {
  await Site.boot("pricing.html");
  try {
    categories = await (await fetch("/api/public/pricing")).json();
    if (categories.length) {
      const params = new URLSearchParams(window.location.search);
      activeCategory = (params.get("category") && categories.some(c => c.slug === params.get("category")))
        ? params.get("category") : categories[0].slug;
      renderTabs();
      renderCategory();
    } else {
      document.getElementById("pricingContent").innerHTML = `<div class="empty-state">Pricing is being set up — check back soon.</div>`;
    }
  } catch {
    document.getElementById("pricingContent").innerHTML = `<div class="empty-state">Couldn't load pricing right now — please refresh.</div>`;
  }
})();
