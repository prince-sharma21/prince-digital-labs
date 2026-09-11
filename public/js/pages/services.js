async function renderServices() {
  const el = document.getElementById("servicesGrid");
  try {
    const services = await (await fetch("/api/public/services")).json();
    if (!services.length) { el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Services are being set up — check back soon.</div>`; return; }
    el.innerHTML = services.map(s => `
      <div class="card service-card reveal" id="${Site.escapeHtml(s.slug)}">
        <div class="icon-badge"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg></div>
        <h3>${Site.escapeHtml(s.name)}</h3>
        <p>${Site.escapeHtml(s.short_description || "")}</p>
        ${s.features && s.features.length ? `<ul class="feature-list">${s.features.slice(0, 5).map(f => `<li>${Site.escapeHtml(f)}</li>`).join("")}</ul>` : ""}
        <a href="pricing.html" class="btn btn-ghost btn-sm" style="margin-top:12px;">${Site.escapeHtml(s.cta_label || "See pricing")}</a>
      </div>
    `).join("");

    // Deep-link support: scroll to and briefly highlight a service if the URL has a #slug
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Couldn't load services right now — please refresh.</div>`;
  }
}

(async () => {
  await Site.boot("services.html");
  await renderServices();
  Site.initRevealAnimations();
})();
