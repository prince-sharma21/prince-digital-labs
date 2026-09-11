async function renderLanding() {
  const el = document.getElementById("landingContent");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    el.innerHTML = `<section class="section"><div class="container empty-state">No campaign page specified.</div></section>`;
    return;
  }

  let page;
  try {
    const res = await fetch(`/api/public/landing/${encodeURIComponent(slug)}`);
    if (!res.ok) { el.innerHTML = `<section class="section"><div class="container empty-state">This page isn't available. <a href="index.html">Go to the homepage</a>.</div></section>`; return; }
    page = await res.json();
  } catch {
    el.innerHTML = `<section class="section"><div class="container empty-state">Couldn't load this page right now.</div></section>`;
    return;
  }

  document.getElementById("pageTitle").textContent = page.seo_title || page.headline;
  document.getElementById("pageDescription").setAttribute("content", page.seo_description || page.subheadline || "");
  document.getElementById("ogTitle").setAttribute("content", page.seo_title || page.headline);
  document.getElementById("ogDescription").setAttribute("content", page.seo_description || page.subheadline || "");

  el.innerHTML = `
    <section class="hero section-dark" style="padding-bottom:var(--space-6);">
      <div class="container center" style="max-width:720px;">
        <h1 style="color:#fff;">${Site.escapeHtml(page.headline)}</h1>
        ${page.subheadline ? `<p class="lede center" style="margin:0 auto var(--space-5);">${Site.escapeHtml(page.subheadline)}</p>` : ""}
        <a href="#landingLeadForm" class="btn btn-accent">Get Started</a>
      </div>
    </section>

    ${(page.body_sections || []).map(s => `
      <section class="section">
        <div class="container" style="max-width:760px;">
          ${s.heading ? `<h2>${Site.escapeHtml(s.heading)}</h2>` : ""}
          ${s.text ? `<p class="lede">${Site.escapeHtml(s.text)}</p>` : ""}
        </div>
      </section>
    `).join("")}

    <section class="section section-tight" style="background:var(--surface);border-top:1px solid var(--line);" id="landingLeadForm">
      <div class="container" style="max-width:560px;">
        <h2 class="center">Get in touch</h2>
        <div class="form-success" id="successBox"><strong>Thanks — your message is in.</strong> We'll be in touch soon.</div>
        <form id="leadForm">
          <div class="form-field"><label for="name">Name *</label><input type="text" id="name" required></div>
          <div class="form-field"><label for="email">Email *</label><input type="email" id="email" required></div>
          <div class="form-field"><label for="phone">Phone</label><input type="tel" id="phone"></div>
          <div class="form-field"><label for="message">Message</label><textarea id="message" rows="3"></textarea></div>
          <button type="submit" class="btn btn-primary" id="submitBtn" style="width:100%;">Send</button>
        </form>
      </div>
    </section>
  `;

  document.getElementById("leadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const btn = document.getElementById("submitBtn");
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      await Site.submitContactForm({
        name, email,
        phone: document.getElementById("phone").value.trim(),
        message: document.getElementById("message").value.trim(),
        service: page.related_service_slug || undefined,
      });
      document.getElementById("leadForm").style.display = "none";
      document.getElementById("successBox").classList.add("show");
    } catch (err) {
      btn.disabled = false; btn.textContent = "Send";
      alert(err.message || "Something went wrong. Please try again.");
    }
  });

  Site.initRevealAnimations();
}

(async () => {
  await Site.boot("landing.html");
  await renderLanding();
})();
