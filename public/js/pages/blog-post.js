function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }
  catch { return ""; }
}

async function renderPost() {
  const container = document.getElementById("postSection").querySelector(".container");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    container.innerHTML = `<div class="empty-state">No article specified. <a href="blog.html">Back to the blog</a>.</div>`;
    return;
  }

  try {
    const res = await fetch(`/api/public/blog/${encodeURIComponent(slug)}`);
    if (res.status === 404) {
      container.innerHTML = `<div class="empty-state">That article couldn't be found. <a href="blog.html">Back to the blog</a>.</div>`;
      return;
    }
    const post = await res.json();

    document.getElementById("pageTitle").textContent = `${post.seo_title || post.title} — Prince Digital Labs`;
    if (post.seo_description || post.excerpt) {
      document.getElementById("pageDescription").setAttribute("content", post.seo_description || post.excerpt);
    }

    container.innerHTML = `
      <div class="eyebrow center">${Site.escapeHtml(post.category_name || "Article")}</div>
      <h1 class="center post-body" style="margin-bottom:var(--space-3);">${Site.escapeHtml(post.title)}</h1>
      <div class="post-meta" style="justify-content:center;">
        ${post.author_name ? `<span>By ${Site.escapeHtml(post.author_name)}</span>` : ""}
        <span>${formatDate(post.updated_at || post.created_at)}</span>
      </div>
      ${post.featured_image ? `<img src="${Site.escapeHtml(post.featured_image)}" alt="" style="width:100%;max-width:900px;margin:0 auto var(--space-6);display:block;border-radius:var(--radius-lg);">` : ""}
      <div class="post-body">${post.body_html || "<p>This post doesn't have content yet.</p>"}</div>
      ${post.tags && post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="pill pill-gray">${Site.escapeHtml(t.name)}</span>`).join("")}</div>` : ""}
      <div style="text-align:center;margin-top:var(--space-6);"><a href="blog.html" class="btn btn-ghost">← Back to all posts</a></div>
    `;
  } catch {
    container.innerHTML = `<div class="empty-state">Couldn't load this article right now — please refresh.</div>`;
  }
}

(async () => {
  await Site.boot("blog.html");
  await renderPost();
})();
