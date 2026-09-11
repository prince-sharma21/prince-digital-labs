function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return ""; }
}

async function loadPage(page) {
  const grid = document.getElementById("blogGrid");
  const pag = document.getElementById("pagination");
  grid.innerHTML = `<p style="color:var(--ink-faint);">Loading posts…</p>`;
  try {
    const data = await (await fetch(`/api/public/blog?page=${page}`)).json();
    if (!data.posts.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No posts published yet — check back soon.</div>`;
      pag.innerHTML = "";
      return;
    }
    grid.innerHTML = data.posts.map(p => `
      <a href="blog-post.html?slug=${encodeURIComponent(p.slug)}" class="card reveal" style="display:block;">
        ${p.featured_image ? `<img src="${Site.escapeHtml(p.featured_image)}" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:var(--radius-md);margin-bottom:14px;">` : ""}
        <span class="eyebrow" style="margin-bottom:8px;">${Site.escapeHtml(p.category_name || "Article")}</span>
        <h3>${Site.escapeHtml(p.title)}</h3>
        <p style="font-size:0.9rem;">${Site.escapeHtml(p.excerpt || "")}</p>
        <span style="font-size:0.8rem;color:var(--ink-faint);font-family:var(--font-mono);">${formatDate(p.updated_at)}</span>
      </a>
    `).join("");
    Site.initRevealAnimations();

    if (data.totalPages > 1) {
      let btns = "";
      for (let i = 1; i <= data.totalPages; i++) {
        btns += `<button class="btn ${i === page ? "btn-primary" : "btn-ghost"} btn-sm" data-page="${i}">${i}</button>`;
      }
      pag.innerHTML = btns;
      pag.querySelectorAll("button").forEach(b => b.onclick = () => { loadPage(Number(b.dataset.page)); window.scrollTo({ top: 0, behavior: "smooth" }); });
    } else {
      pag.innerHTML = "";
    }
  } catch {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Couldn't load posts right now — please refresh.</div>`;
  }
}

(async () => {
  await Site.boot("blog.html");
  const params = new URLSearchParams(window.location.search);
  await loadPage(Math.max(1, parseInt(params.get("page"), 10) || 1));
})();
