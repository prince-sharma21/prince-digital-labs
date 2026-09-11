function domainFromUrl(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

async function renderPortfolio() {
  const el = document.getElementById("portfolioGrid");
  try {
    const items = await (await fetch("/api/public/portfolio")).json();
    if (!items.length) { el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Portfolio pieces are on their way.</div>`; return; }

    el.innerHTML = items.map((p, i) => {
      const badge = p.is_demo
        ? `<span class="badge-demo">Sample project</span>`
        : `<span class="badge-demo badge-demo-real">Client project</span>`;
      const browserBar = p.project_url
        ? `<div class="mock-browser">
             <div class="mock-browser-dots"><span></span><span></span><span></span></div>
             <div class="mock-browser-url">${Site.escapeHtml(domainFromUrl(p.project_url))}</div>
           </div>
           <div class="mock-browser-preview accent-${i % 3}"></div>`
        : "";
      const tech = p.technologies && p.technologies.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">${p.technologies.map(t => `<span class="pill pill-gray" style="font-family:var(--font-mono);">${Site.escapeHtml(t)}</span>`).join("")}</div>`
        : "";
      const cta = p.project_url
        ? `<a href="${Site.escapeHtml(p.project_url)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="margin-top:14px;">View Live →</a>`
        : "";

      return `
        <div class="card portfolio-card reveal">
          ${browserBar}
          <div style="padding-top:${p.project_url ? "16px" : "0"};">
            ${badge}
            <h3>${Site.escapeHtml(p.title)}</h3>
            <p>${Site.escapeHtml(p.description || "")}</p>
            ${p.category ? `<span class="eyebrow">${Site.escapeHtml(p.category)}</span>` : ""}
            ${tech}
            ${cta}
          </div>
        </div>
      `;
    }).join("");
  } catch {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Couldn't load the portfolio right now — please refresh.</div>`;
  }
}
(async () => {
  await Site.boot("portfolio.html");
  await renderPortfolio();
  Site.initRevealAnimations();
})();
