/**
 * SECTIONS — one entry per sidebar item. Simple resources reuse
 * createResourceController(); resources with a meaningfully different
 * shape (pricing, blog, leads, media, settings, users, audit, overview)
 * get a bespoke render function further down this file.
 */
const SECTIONS = {};

// ================= SERVICES =================
SECTIONS.services = {
  label: "Services", group: "Content", role: "editor",
  controller: createResourceController({
    title: "Service",
    apiBase: "/api/admin/services",
    newLabel: "New service",
    emptyMessage: "No services yet.",
    columns: [
      { label: "Name", key: "name" },
      { label: "Slug", key: "slug", render: r => `<code>${UI.escapeHtml(r.slug)}</code>` },
      { label: "Status", key: "published", render: r => UI.pill(r.published ? "Published" : "Hidden", r.published ? "green" : "gray") },
      { label: "Order", key: "sort_order" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug (blank = auto-generate)", type: "text" },
      { name: "short_description", label: "Short description", type: "textarea", rows: 2 },
      { name: "full_description", label: "Full description", type: "textarea", rows: 4 },
      { name: "features", label: "Features", type: "list" },
      { name: "benefits", label: "Benefits", type: "list" },
      { name: "icon", label: "Icon name (optional)", type: "text" },
      { name: "cta_label", label: "CTA button label", type: "text", default: "Get Started" },
      { name: "seo_title", label: "SEO title", type: "text" },
      { name: "seo_description", label: "SEO description", type: "textarea", rows: 2 },
      { name: "sort_order", label: "Sort order", type: "number", default: 0 },
      { name: "published", label: "Published", type: "checkbox", default: true },
    ],
  }),
};

// ================= PORTFOLIO =================
SECTIONS.portfolio = {
  label: "Portfolio", group: "Content", role: "editor",
  controller: createResourceController({
    title: "Project",
    apiBase: "/api/admin/portfolio",
    newLabel: "New project",
    emptyMessage: "No portfolio projects yet.",
    columns: [
      { label: "Title", key: "title" },
      { label: "Category", key: "category" },
      { label: "Type", key: "is_demo", render: r => UI.pill(r.is_demo ? "Demo / sample" : "Real client work", r.is_demo ? "amber" : "blue") },
      { label: "Status", key: "published", render: r => UI.pill(r.published ? "Published" : "Hidden", r.published ? "green" : "gray") },
    ],
    fields: [
      { name: "title", label: "Project title", type: "text", required: true },
      { name: "slug", label: "Slug (blank = auto-generate)", type: "text" },
      { name: "description", label: "Description", type: "textarea", rows: 3 },
      { name: "category", label: "Category", type: "text" },
      { name: "technologies", label: "Technologies", type: "list" },
      { name: "project_url", label: "Project URL", type: "url" },
      { name: "project_date", label: "Project date", type: "text" },
      { name: "is_demo", label: "This is demo/sample work — uncheck ONLY for a verified real client project", type: "checkbox", default: true },
      { name: "featured", label: "Featured", type: "checkbox" },
      { name: "published", label: "Published", type: "checkbox", default: true },
      { name: "sort_order", label: "Sort order", type: "number", default: 0 },
    ],
  }),
};

// ================= TESTIMONIALS =================
SECTIONS.testimonials = {
  label: "Testimonials", group: "Content", role: "editor",
  controller: createResourceController({
    title: "Testimonial",
    apiBase: "/api/admin/testimonials",
    newLabel: "New testimonial",
    emptyMessage: "No testimonials yet — the public site correctly shows a \"coming soon\" state until real ones are added here.",
    columns: [
      { label: "Client", key: "client_name" },
      { label: "Company", key: "company" },
      { label: "Rating", key: "rating", render: r => r.rating ? "★".repeat(r.rating) : "—" },
      { label: "Status", key: "published", render: r => UI.pill(r.published ? "Published" : "Hidden", r.published ? "green" : "gray") },
    ],
    fields: [
      { name: "client_name", label: "Client name", type: "text", required: true },
      { name: "company", label: "Company", type: "text" },
      { name: "quote", label: "Testimonial", type: "textarea", rows: 4, required: true },
      { name: "rating", label: "Rating (1–5)", type: "number" },
      { name: "image_url", label: "Image URL", type: "url" },
      { name: "published", label: "Published (only real, verified testimonials)", type: "checkbox" },
    ],
  }),
};

// ================= FAQS =================
SECTIONS.faqs = {
  label: "FAQs", group: "Content", role: "editor",
  controller: createResourceController({
    title: "FAQ",
    apiBase: "/api/admin/faqs",
    newLabel: "New FAQ",
    emptyMessage: "No FAQs yet.",
    columns: [
      { label: "Question", key: "question" },
      { label: "Order", key: "sort_order" },
      { label: "Status", key: "published", render: r => UI.pill(r.published ? "Published" : "Hidden", r.published ? "green" : "gray") },
    ],
    fields: [
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "textarea", rows: 4, required: true },
      { name: "sort_order", label: "Sort order", type: "number", default: 0 },
      { name: "published", label: "Published", type: "checkbox", default: true },
    ],
  }),
};

// ================= NOTIFICATIONS =================
SECTIONS.notifications = {
  label: "Notifications", group: "Content", role: "editor",
  controller: createResourceController({
    title: "Notification",
    apiBase: "/api/admin/notifications",
    newLabel: "New notification",
    emptyMessage: "No notifications yet.",
    columns: [
      { label: "Message", key: "message" },
      { label: "Window", key: "starts_at", render: r => `${r.starts_at || "any time"} → ${r.ends_at || "no end"}` },
      { label: "Status", key: "published", render: r => UI.pill(r.published ? "Active" : "Inactive", r.published ? "green" : "gray") },
    ],
    fields: [
      { name: "message", label: "Message", type: "textarea", rows: 2, required: true },
      { name: "cta_label", label: "Button label (optional)", type: "text" },
      { name: "cta_link", label: "Button link (optional)", type: "text" },
      { name: "starts_at", label: "Starts at (YYYY-MM-DD HH:MM, optional)", type: "text" },
      { name: "ends_at", label: "Ends at (YYYY-MM-DD HH:MM, optional)", type: "text" },
      { name: "published", label: "Active", type: "checkbox" },
    ],
  }),
};

// ================= LANDING PAGES =================
SECTIONS.landing = {
  label: "Landing Pages", group: "Marketing", role: "editor",
  controller: createResourceController({
    title: "Landing page",
    apiBase: "/api/admin/landing",
    newLabel: "New landing page",
    emptyMessage: "No landing pages yet.",
    columns: [
      { label: "Headline", key: "headline" },
      { label: "Slug", key: "slug", render: r => `<code>/landing.html?slug=${UI.escapeHtml(r.slug)}</code>` },
      { label: "Status", key: "published", render: r => UI.pill(r.published ? "Published" : "Draft", r.published ? "green" : "gray") },
    ],
    fields: [
      { name: "headline", label: "Headline", type: "text", required: true },
      { name: "slug", label: "Slug (blank = auto-generate)", type: "text" },
      { name: "subheadline", label: "Subheadline", type: "textarea", rows: 2 },
      { name: "related_service_slug", label: "Related service slug (optional)", type: "text" },
      { name: "seo_title", label: "SEO title", type: "text" },
      { name: "seo_description", label: "SEO description", type: "textarea", rows: 2 },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  }),
};

// ================= OVERVIEW =================
SECTIONS.overview = {
  label: "Overview", group: "", role: "editor",
  controller: {
    async load() {
      const stats = await API.get("/api/admin/overview");
      const cards = [
        { label: "Services", value: stats.services },
        { label: "Pricing packages", value: stats.pricingPackages },
        { label: "Blog posts", value: `${stats.blogPostsPublished} / ${stats.blogPosts}`, sub: "published / total" },
        { label: "Portfolio projects", value: stats.portfolioProjects },
        { label: "Testimonials", value: `${stats.testimonialsPublished} / ${stats.testimonials}`, sub: "published / total" },
        { label: "FAQs", value: stats.faqs },
        { label: "New leads", value: stats.leadsNew, highlight: stats.leadsNew > 0 },
        { label: "Total leads", value: stats.leadsTotal },
        { label: "Landing pages", value: stats.landingPages },
        { label: "Media files", value: stats.mediaFiles },
      ];
      document.getElementById("content").innerHTML = `
        <div class="grid grid-4">
          ${cards.map(c => `
            <div class="stat-card">
              <div class="stat-value" style="${c.highlight ? "color:var(--accent);" : ""}">${c.value}</div>
              <div class="stat-label">${UI.escapeHtml(c.label)}${c.sub ? ` · ${UI.escapeHtml(c.sub)}` : ""}</div>
            </div>
          `).join("")}
        </div>
        <p style="margin-top:24px;color:var(--ink-faint);font-size:0.9rem;">
          Welcome back. Use the sidebar to manage content — every change here updates the public site immediately.
        </p>
      `;
    },
  },
};

// ================= PRICING (categories + nested packages) =================
const PACKAGE_FIELDS = [
  { name: "name", label: "Package name", type: "text", required: true },
  { name: "price", label: "Price (display string, e.g. ₹14,999)", type: "text" },
  { name: "reference_price", label: "Reference/original price (optional, for a genuine crossed-out price)", type: "text" },
  { name: "billing_period", label: "Billing period", type: "select", options: [
    { value: "one-time", label: "One-time" }, { value: "/month", label: "Per month" },
    { value: "/year", label: "Per year" }, { value: "starting-from", label: "Starting from" }, { value: "custom", label: "Custom quote" },
  ] },
  { name: "badge", label: "Badge (e.g. Most Popular, optional)", type: "text" },
  { name: "blurb", label: "Short blurb (optional)", type: "textarea", rows: 2 },
  { name: "features", label: "Features", type: "list" },
  { name: "featured", label: "Highlight this package", type: "checkbox" },
  { name: "cta_label", label: "CTA label", type: "text", default: "Get Started" },
  { name: "custom_quote", label: "Requires a custom quote (hides a fixed price)", type: "checkbox" },
  { name: "sort_order", label: "Sort order", type: "number", default: 0 },
  { name: "published", label: "Published", type: "checkbox", default: true },
];
const CATEGORY_FIELDS = [
  { name: "name", label: "Category name", type: "text", required: true },
  { name: "slug", label: "Slug (blank = auto-generate)", type: "text" },
  { name: "note", label: "Note (e.g. a disclaimer shown under this category)", type: "textarea", rows: 2 },
  { name: "sort_order", label: "Sort order", type: "number", default: 0 },
  { name: "published", label: "Published", type: "checkbox", default: true },
];

SECTIONS.pricing = {
  label: "Pricing", group: "Content", role: "editor",
  controller: {
    categories: [],
    async load() {
      this.categories = await API.get("/api/admin/pricing/categories");
      this.render();
    },
    render() {
      const container = document.getElementById("content");
      container.innerHTML = `
        <div class="admin-toolbar">
          <div></div>
          <button class="btn btn-primary btn-sm" id="newCatBtn">+ New pricing category</button>
        </div>
        ${this.categories.map(cat => `
          <div class="card" style="margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <h3 style="margin-bottom:2px;">${UI.escapeHtml(cat.name)} ${UI.pill(cat.published ? "Published" : "Hidden", cat.published ? "green" : "gray")}</h3>
                ${cat.note ? `<p style="font-size:0.85rem;margin:0;">${UI.escapeHtml(cat.note)}</p>` : ""}
              </div>
              <div class="row-actions">
                <button class="btn btn-ghost btn-sm" data-action="edit-cat" data-id="${cat.id}">Edit category</button>
                <button class="btn btn-ghost btn-sm" data-action="delete-cat" data-id="${cat.id}">Delete category</button>
                <button class="btn btn-primary btn-sm" data-action="new-pkg" data-cat="${cat.id}">+ Package</button>
              </div>
            </div>
            ${UI.renderTable({
              columns: [
                { label: "Package", key: "name" },
                { label: "Price", key: "price", render: p => `${UI.escapeHtml(p.price || "—")}${p.reference_price ? ` <s style="color:var(--ink-faint);">${UI.escapeHtml(p.reference_price)}</s>` : ""} ${UI.escapeHtml(p.billing_period)}` },
                { label: "Badge", key: "badge" },
                { label: "Status", key: "published", render: p => UI.pill(p.published ? "Published" : "Hidden", p.published ? "green" : "gray") },
              ],
              rows: cat.packages.map(p => ({
                ...p, __id: p.id,
                __actions: `<button class="btn btn-ghost btn-sm" data-action="edit-pkg" data-id="${p.id}" data-cat="${cat.id}">Edit</button>
                            <button class="btn btn-ghost btn-sm" data-action="delete-pkg" data-id="${p.id}">Delete</button>`,
              })),
              emptyMessage: "No packages in this category yet.",
            })}
          </div>
        `).join("") || `<div class="data-table-wrap"><div class="table-empty">No pricing categories yet.</div></div>`}
      `;

      container.querySelector("#newCatBtn").onclick = () => this.openCategoryForm(null);
      container.querySelectorAll('[data-action="edit-cat"]').forEach(b => b.onclick = () => this.openCategoryForm(this.categories.find(c => c.id == b.dataset.id)));
      container.querySelectorAll('[data-action="delete-cat"]').forEach(b => b.onclick = () => this.deleteCategory(b.dataset.id));
      container.querySelectorAll('[data-action="new-pkg"]').forEach(b => b.onclick = () => this.openPackageForm(null, b.dataset.cat));
      container.querySelectorAll('[data-action="edit-pkg"]').forEach(b => {
        const cat = this.categories.find(c => c.id == b.dataset.cat);
        const pkg = cat.packages.find(p => p.id == b.dataset.id);
        b.onclick = () => this.openPackageForm(pkg, b.dataset.cat);
      });
      container.querySelectorAll('[data-action="delete-pkg"]').forEach(b => b.onclick = () => this.deletePackage(b.dataset.id));
    },
    openCategoryForm(cat) {
      UI.openModal(cat ? "Edit pricing category" : "New pricing category", `
        ${UI.renderForm(CATEGORY_FIELDS, cat || {})}
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button class="btn btn-primary" id="saveBtn">${cat ? "Save changes" : "Create"}</button>
        </div>
      `, {
        onMount: body => {
          body.querySelector("#cancelBtn").onclick = () => UI.closeModal();
          body.querySelector("#saveBtn").onclick = async () => {
            const data = UI.readForm(CATEGORY_FIELDS);
            try {
              if (cat) await API.put(`/api/admin/pricing/categories/${cat.id}`, data);
              else await API.post("/api/admin/pricing/categories", data);
              toast("Category saved.", "success");
              UI.closeModal();
              await this.load();
            } catch (err) { reportError(err); }
          };
        },
      });
    },
    async deleteCategory(id) {
      const ok = await UI.confirmDialog("Delete this category and ALL its packages? This can't be undone.");
      if (!ok) return;
      try {
        await API.del(`/api/admin/pricing/categories/${id}`);
        toast("Category deleted.", "success");
        await this.load();
      } catch (err) { reportError(err); }
    },
    openPackageForm(pkg, categoryId) {
      UI.openModal(pkg ? "Edit package" : "New package", `
        ${UI.renderForm(PACKAGE_FIELDS, pkg || {})}
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button class="btn btn-primary" id="saveBtn">${pkg ? "Save changes" : "Create"}</button>
        </div>
      `, {
        onMount: body => {
          body.querySelector("#cancelBtn").onclick = () => UI.closeModal();
          body.querySelector("#saveBtn").onclick = async () => {
            const data = UI.readForm(PACKAGE_FIELDS);
            data.category_id = Number(categoryId);
            try {
              if (pkg) await API.put(`/api/admin/pricing/packages/${pkg.id}`, data);
              else await API.post("/api/admin/pricing/packages", data);
              toast("Package saved.", "success");
              UI.closeModal();
              await this.load();
            } catch (err) { reportError(err); }
          };
        },
      });
    },
    async deletePackage(id) {
      const ok = await UI.confirmDialog("Delete this package? This can't be undone.");
      if (!ok) return;
      try {
        await API.del(`/api/admin/pricing/packages/${id}`);
        toast("Package deleted.", "success");
        await this.load();
      } catch (err) { reportError(err); }
    },
  },
};

// ================= BLOG =================
SECTIONS.blog = {
  label: "Blog Posts", group: "Content", role: "editor",
  controller: {
    posts: [], categories: [],
    async load() {
      [this.posts, this.categories] = await Promise.all([
        API.get("/api/admin/blog/posts"),
        API.get("/api/admin/blog/categories"),
      ]);
      this.render();
    },
    render() {
      const container = document.getElementById("content");
      const statusColor = { draft: "gray", scheduled: "amber", published: "green" };
      const rows = this.posts.map(p => ({
        ...p, __id: p.id,
        __actions: `<button class="btn btn-ghost btn-sm" data-action="edit" data-id="${p.id}">Edit</button>
                    <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${p.id}">Delete</button>`,
      }));
      container.innerHTML = `
        <div class="admin-toolbar">
          <button class="btn btn-ghost btn-sm" id="manageCatsBtn">Manage categories</button>
          <button class="btn btn-primary btn-sm" id="newPostBtn">+ New post</button>
        </div>
        ${UI.renderTable({
          columns: [
            { label: "Title", key: "title" },
            { label: "Category", key: "category_name", render: p => p.category_name || "—" },
            { label: "Status", key: "status", render: p => UI.pill(p.status, statusColor[p.status] || "gray") },
            { label: "Updated", key: "updated_at" },
          ],
          rows, emptyMessage: "No blog posts yet.",
        })}
      `;
      container.querySelector("#newPostBtn").onclick = () => this.openPostForm(null);
      container.querySelector("#manageCatsBtn").onclick = () => this.openCategoryManager();
      container.querySelectorAll('[data-action="edit"]').forEach(b => b.onclick = () => this.openPostForm(this.posts.find(p => p.id == b.dataset.id)));
      container.querySelectorAll('[data-action="delete"]').forEach(b => b.onclick = () => this.deletePost(b.dataset.id));
    },
    postFields() {
      return [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "slug", label: "Slug (blank = auto-generate)", type: "text" },
        { name: "excerpt", label: "Excerpt", type: "textarea", rows: 2 },
        { name: "body_html", label: "Body (basic HTML: <p> <strong> <a> <ul> <li> <h2> <h3> <img> etc. — scripts are always stripped)", type: "textarea", rows: 8 },
        { name: "featured_image", label: "Featured image URL", type: "url" },
        { name: "category_id", label: "Category", type: "select", options: [{ value: "", label: "— none —" }, ...this.categories.map(c => ({ value: c.id, label: c.name }))] },
        { name: "tags", label: "Tags", type: "list" },
        { name: "seo_title", label: "SEO title", type: "text" },
        { name: "seo_description", label: "SEO description", type: "textarea", rows: 2 },
        { name: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "published", label: "Published" }] },
        { name: "publish_at", label: "Publish at (YYYY-MM-DD HH:MM, for scheduled posts)", type: "text" },
      ];
    },
    openPostForm(post) {
      const fields = this.postFields();
      const values = post ? { ...post, tags: (post.tags || []).map(t => t.name) } : {};
      UI.openModal(post ? "Edit post" : "New post", `
        ${UI.renderForm(fields, values)}
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button class="btn btn-primary" id="saveBtn">${post ? "Save changes" : "Create"}</button>
        </div>
      `, {
        onMount: body => {
          body.querySelector("#cancelBtn").onclick = () => UI.closeModal();
          body.querySelector("#saveBtn").onclick = async () => {
            const data = UI.readForm(fields);
            if (data.category_id === "") data.category_id = null;
            try {
              if (post) await API.put(`/api/admin/blog/posts/${post.id}`, data);
              else await API.post("/api/admin/blog/posts", data);
              toast("Post saved.", "success");
              UI.closeModal();
              await this.load();
            } catch (err) { reportError(err); }
          };
        },
      });
    },
    async deletePost(id) {
      const ok = await UI.confirmDialog("Delete this post? This can't be undone.");
      if (!ok) return;
      try {
        await API.del(`/api/admin/blog/posts/${id}`);
        toast("Post deleted.", "success");
        await this.load();
      } catch (err) { reportError(err); }
    },
    openCategoryManager() {
      const renderList = () => this.categories.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);">
          <span>${UI.escapeHtml(c.name)} <code style="color:var(--ink-faint);">${UI.escapeHtml(c.slug)}</code></span>
          <button class="btn btn-ghost btn-sm" data-del="${c.id}">Delete</button>
        </div>`).join("") || `<p style="color:var(--ink-faint);">No categories yet.</p>`;

      UI.openModal("Blog categories", `
        <div id="catList">${renderList()}</div>
        <form id="newCatForm" style="margin-top:16px;display:flex;gap:8px;">
          <input type="text" id="newCatName" placeholder="New category name" style="flex-grow:1;padding:10px;border-radius:8px;border:1px solid var(--line);">
          <button class="btn btn-primary btn-sm" type="submit">Add</button>
        </form>
        <div class="modal-actions"><button class="btn btn-ghost" id="doneBtn">Done</button></div>
      `, {
        onMount: body => {
          body.querySelector("#doneBtn").onclick = () => UI.closeModal();
          body.querySelectorAll("[data-del]").forEach(b => {
            b.onclick = async () => {
              try {
                await API.del(`/api/admin/blog/categories/${b.dataset.del}`);
                this.categories = await API.get("/api/admin/blog/categories");
                this.openCategoryManager(); // re-open fresh with updated list and rebound handlers
              } catch (err) { reportError(err); }
            };
          });
          body.querySelector("#newCatForm").onsubmit = async e => {
            e.preventDefault();
            const name = body.querySelector("#newCatName").value.trim();
            if (!name) return;
            try {
              await API.post("/api/admin/blog/categories", { name });
              this.categories = await API.get("/api/admin/blog/categories");
              this.openCategoryManager(); // re-render fresh
            } catch (err) { reportError(err); }
          };
        },
      });
    },
  },
};

// ================= LEADS =================
const LEAD_STATUSES = ["new", "read", "contacted", "in_progress", "completed", "archived"];
const LEAD_STATUS_COLOR = { new: "blue", read: "gray", contacted: "amber", in_progress: "amber", completed: "green", archived: "gray" };

SECTIONS.leads = {
  label: "Leads", group: "Marketing", role: "editor",
  controller: {
    leads: [], filter: "",
    async load() {
      const qs = this.filter ? `?status=${this.filter}` : "";
      this.leads = await API.get(`/api/admin/leads${qs}`);
      this.render();
    },
    render() {
      const container = document.getElementById("content");
      const rows = this.leads.map(l => ({
        ...l, __id: l.id,
        __actions: `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${l.id}">Open</button>
                    <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${l.id}">Delete</button>`,
      }));
      container.innerHTML = `
        <div class="admin-toolbar">
          <select id="statusFilter" style="padding:9px 14px;border-radius:999px;border:1px solid var(--line);">
            <option value="">All statuses</option>
            ${LEAD_STATUSES.map(s => `<option value="${s}" ${this.filter === s ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}
          </select>
          <div></div>
        </div>
        ${UI.renderTable({
          columns: [
            { label: "Name", key: "name" },
            { label: "Email", key: "email" },
            { label: "Service", key: "service_interest", render: l => l.service_interest || "—" },
            { label: "Source", key: "utm_source", render: l => l.utm_source ? `${l.utm_source}${l.utm_campaign ? " / " + l.utm_campaign : ""}` : "—" },
            { label: "Status", key: "status", render: l => UI.pill(l.status.replace("_", " "), LEAD_STATUS_COLOR[l.status] || "gray") },
            { label: "Received", key: "created_at" },
          ],
          rows, emptyMessage: "No leads yet — they'll appear here as soon as someone submits the contact form.",
        })}
      `;
      container.querySelector("#statusFilter").onchange = e => { this.filter = e.target.value; this.load(); };
      container.querySelectorAll('[data-action="view"]').forEach(b => b.onclick = () => this.openLead(b.dataset.id));
      container.querySelectorAll('[data-action="delete"]').forEach(b => b.onclick = () => this.deleteLead(b.dataset.id));
    },
    async openLead(id) {
      const lead = await API.get(`/api/admin/leads/${id}`);
      UI.openModal(lead.name, `
        <p><strong>Email:</strong> ${UI.escapeHtml(lead.email)}</p>
        ${lead.phone ? `<p><strong>Phone:</strong> ${UI.escapeHtml(lead.phone)}</p>` : ""}
        ${lead.company ? `<p><strong>Company:</strong> ${UI.escapeHtml(lead.company)}</p>` : ""}
        ${lead.service_interest ? `<p><strong>Interested in:</strong> ${UI.escapeHtml(lead.service_interest)}</p>` : ""}
        ${lead.message ? `<p><strong>Message:</strong><br>${UI.escapeHtml(lead.message)}</p>` : ""}
        <p style="font-size:0.8rem;color:var(--ink-faint);">
          Source: ${UI.escapeHtml(lead.source_page || "—")} ·
          UTM: ${[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || "—"} ·
          Received ${UI.escapeHtml(lead.created_at)}
        </p>
        <div class="form-field">
          <label for="leadStatus">Status</label>
          <select id="leadStatus">${LEAD_STATUSES.map(s => `<option value="${s}" ${lead.status === s ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}</select>
        </div>
        <div class="form-field">
          <label for="leadNote">Internal note</label>
          <textarea id="leadNote" rows="3">${UI.escapeHtml(lead.internal_note || "")}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancelBtn">Close</button>
          <button class="btn btn-primary" id="saveBtn">Save</button>
        </div>
      `, {
        onMount: body => {
          body.querySelector("#cancelBtn").onclick = () => { UI.closeModal(); this.load(); };
          body.querySelector("#saveBtn").onclick = async () => {
            try {
              await API.put(`/api/admin/leads/${id}`, {
                status: body.querySelector("#leadStatus").value,
                internal_note: body.querySelector("#leadNote").value,
              });
              toast("Lead updated.", "success");
              UI.closeModal();
              await this.load();
            } catch (err) { reportError(err); }
          };
        },
      });
    },
    async deleteLead(id) {
      const ok = await UI.confirmDialog("Delete this lead? This can't be undone.");
      if (!ok) return;
      try {
        await API.del(`/api/admin/leads/${id}`);
        toast("Lead deleted.", "success");
        await this.load();
      } catch (err) { reportError(err); }
    },
  },
};

// ================= MEDIA =================
SECTIONS.media = {
  label: "Media Library", group: "Marketing", role: "editor",
  controller: {
    files: [],
    async load() {
      this.files = await API.get("/api/admin/media");
      this.render();
    },
    render() {
      const container = document.getElementById("content");
      container.innerHTML = `
        <div class="dropzone" id="dropzone">
          <p style="margin:0;"><strong>Click to upload</strong> or drag an image here — JPG, PNG, WEBP, GIF, or SVG, up to 5MB.</p>
          <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" class="hidden">
        </div>
        ${this.files.length ? `
          <div class="media-grid">
            ${this.files.map(f => `
              <div class="media-tile">
                <img src="${f.url}" alt="${UI.escapeHtml(f.alt_text || f.original_name)}" loading="lazy">
                <div class="media-tile-body">
                  <input type="text" value="${UI.escapeHtml(f.alt_text || "")}" placeholder="Alt text" data-alt="${f.id}">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <button class="btn btn-ghost btn-sm" data-copy="${f.url}" style="font-size:0.72rem;padding:4px 8px;">Copy URL</button>
                    <button class="btn btn-ghost btn-sm" data-del="${f.id}" style="font-size:0.72rem;padding:4px 8px;">Delete</button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `<div class="data-table-wrap"><div class="table-empty">No media uploaded yet.</div></div>`}
      `;

      const dz = container.querySelector("#dropzone");
      const input = container.querySelector("#fileInput");
      dz.onclick = () => input.click();
      input.onchange = () => this.handleUpload(input.files[0]);
      ["dragover", "dragleave", "drop"].forEach(evt => dz.addEventListener(evt, e => {
        e.preventDefault();
        dz.classList.toggle("drag", evt === "dragover");
        if (evt === "drop" && e.dataTransfer.files[0]) this.handleUpload(e.dataTransfer.files[0]);
      }));

      container.querySelectorAll("[data-alt]").forEach(el => {
        el.onchange = async () => {
          try { await API.put(`/api/admin/media/${el.dataset.alt}`, { alt_text: el.value }); toast("Alt text saved.", "success"); }
          catch (err) { reportError(err); }
        };
      });
      container.querySelectorAll("[data-copy]").forEach(btn => {
        btn.onclick = () => { navigator.clipboard.writeText(window.location.origin + btn.dataset.copy); toast("URL copied."); };
      });
      container.querySelectorAll("[data-del]").forEach(btn => {
        btn.onclick = async () => {
          const ok = await UI.confirmDialog("Delete this file? Anything referencing it will show a broken image.");
          if (!ok) return;
          try { await API.del(`/api/admin/media/${btn.dataset.del}`); toast("Deleted.", "success"); await this.load(); }
          catch (err) { reportError(err); }
        };
      });
    },
    async handleUpload(file) {
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      try {
        await API.upload("/api/admin/media", fd);
        toast("Uploaded.", "success");
        await this.load();
      } catch (err) { reportError(err); }
    },
  },
};

// ================= SETTINGS (owner-only) =================
const SETTINGS_FIELDS = [
  { group: "Brand", fields: [
    { name: "brand_name", label: "Brand name", type: "text" },
    { name: "brand_tagline", label: "Tagline", type: "text" },
    { name: "logo_url", label: "Logo URL", type: "url" },
    { name: "favicon_url", label: "Favicon URL", type: "url" },
  ]},
  { group: "Contact", fields: [
    { name: "contact_email", label: "Business email", type: "email" },
    { name: "contact_phone", label: "Business phone", type: "text" },
    { name: "contact_whatsapp", label: "WhatsApp number (with country code, digits only, e.g. 919876543210)", type: "text" },
    { name: "contact_address", label: "Address", type: "text" },
    { name: "business_hours", label: "Business hours", type: "text" },
  ]},
  { group: "Social", fields: [
    { name: "social_instagram", label: "Instagram URL", type: "url" },
    { name: "social_facebook", label: "Facebook URL", type: "url" },
    { name: "social_youtube", label: "YouTube URL", type: "url" },
    { name: "social_linkedin", label: "LinkedIn URL", type: "url" },
    { name: "social_github", label: "GitHub URL", type: "url" },
    { name: "social_telegram", label: "Telegram URL", type: "url" },
    { name: "social_twitter", label: "Twitter / X URL", type: "url" },
  ]},
  { group: "SEO defaults", fields: [
    { name: "seo_default_title", label: "Default SEO title", type: "text" },
    { name: "seo_default_description", label: "Default SEO description", type: "textarea", rows: 2 },
    { name: "social_sharing_image", label: "Social sharing image URL", type: "url" },
  ]},
  { group: "Appearance (theme colors)", fields: [
    { name: "theme_primary", label: "Primary color", type: "color", default: "#4C7CFF" },
    { name: "theme_accent", label: "Accent color", type: "color", default: "#FF7A1A" },
    { name: "theme_accent2", label: "Secondary accent color", type: "color", default: "#22D3EE" },
  ]},
  { group: "Announcement Bar (scrolling banner at the top of every page)", fields: [
    { name: "promo_ticker_text", label: "Banner text (leave blank to hide the bar entirely)", type: "textarea", rows: 2 },
  ]},
  { group: "Footer", fields: [
    { name: "footer_copyright_name", label: "Copyright name", type: "text" },
  ]},
  { group: "Founder", fields: [
    { name: "founder_name", label: "Founder name", type: "text" },
    { name: "founder_role", label: "Role / title", type: "text" },
    { name: "founder_photo_url", label: "Photo URL", type: "url" },
    { name: "founder_bio", label: "About Me (bio)", type: "textarea", rows: 6 },
    { name: "founder_belief", label: "What I Believe", type: "textarea", rows: 3 },
    { name: "founder_approach", label: "My Approach", type: "textarea", rows: 3 },
    { name: "founder_vision", label: "Founder Vision", type: "textarea", rows: 3 },
    { name: "founder_skills", label: "Core skills (one per line, format: Name | Description)", type: "textarea", rows: 6 },
    { name: "founder_highlights", label: "Professional highlights (one per line)", type: "textarea", rows: 6 },
  ]},
  { group: "Analytics & Ads (leave blank until you have real IDs)", fields: [
    { name: "ga_measurement_id", label: "Google Analytics Measurement ID", type: "text" },
    { name: "meta_pixel_id", label: "Meta Pixel ID", type: "text" },
    { name: "google_ads_conversion_id", label: "Google Ads Conversion ID", type: "text" },
  ]},
];

SECTIONS.settings = {
  label: "Website Settings", group: "System", role: "owner",
  controller: {
    async load() {
      const settings = await API.get("/api/admin/settings");
      const container = document.getElementById("content");
      container.innerHTML = `
        <div class="empty-note">Any field you leave blank stays hidden on the public site — nothing is ever invented.</div>
        <form id="settingsForm">
          ${SETTINGS_FIELDS.map(g => `
            <div class="card" style="margin-bottom:16px;">
              <h3>${UI.escapeHtml(g.group)}</h3>
              <div class="field-row">
                ${g.fields.map(f => UI.renderField(f, settings[f.name] || "")).join("")}
              </div>
            </div>
          `).join("")}
          <button type="submit" class="btn btn-primary">Save settings</button>
        </form>
      `;
      container.querySelector("#settingsForm").onsubmit = async e => {
        e.preventDefault();
        const allFields = SETTINGS_FIELDS.flatMap(g => g.fields);
        const data = UI.readForm(allFields);
        try {
          await API.put("/api/admin/settings", data);
          toast("Settings saved.", "success");
        } catch (err) { reportError(err); }
      };
    },
  },
};

// ================= USERS (owner-only) =================
SECTIONS.users = {
  label: "Users & Roles", group: "System", role: "owner",
  controller: {
    users: [],
    async load() {
      this.users = await API.get("/api/admin/users");
      this.render();
    },
    render() {
      const container = document.getElementById("content");
      const rows = this.users.map(u => ({
        ...u, __id: u.id,
        __actions: `<button class="btn btn-ghost btn-sm" data-action="edit" data-id="${u.id}">Edit</button>
                    <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${u.id}">Delete</button>`,
      }));
      container.innerHTML = `
        <div class="admin-toolbar"><div></div><button class="btn btn-primary btn-sm" id="newUserBtn">+ New user</button></div>
        ${UI.renderTable({
          columns: [
            { label: "Name", key: "name" },
            { label: "Email", key: "email" },
            { label: "Role", key: "role", render: u => UI.pill(u.role, u.role === "owner" ? "blue" : "gray") },
            { label: "Status", key: "is_active", render: u => UI.pill(u.is_active ? "Active" : "Disabled", u.is_active ? "green" : "red") },
          ],
          rows, emptyMessage: "No users.",
        })}
      `;
      container.querySelector("#newUserBtn").onclick = () => this.openForm(null);
      container.querySelectorAll('[data-action="edit"]').forEach(b => b.onclick = () => this.openForm(this.users.find(u => u.id == b.dataset.id)));
      container.querySelectorAll('[data-action="delete"]').forEach(b => b.onclick = () => this.deleteUser(b.dataset.id));
    },
    openForm(user) {
      const fields = user
        ? [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "role", label: "Role", type: "select", options: [{ value: "editor", label: "Editor" }, { value: "owner", label: "Owner" }] },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]
        : [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "password", label: "Password (10+ characters)", type: "text", required: true },
            { name: "role", label: "Role", type: "select", options: [{ value: "editor", label: "Editor" }, { value: "owner", label: "Owner" }] },
          ];
      UI.openModal(user ? "Edit user" : "New user", `
        ${UI.renderForm(fields, user || {})}
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button class="btn btn-primary" id="saveBtn">${user ? "Save changes" : "Create"}</button>
        </div>
      `, {
        onMount: body => {
          body.querySelector("#cancelBtn").onclick = () => UI.closeModal();
          body.querySelector("#saveBtn").onclick = async () => {
            const data = UI.readForm(fields);
            try {
              if (user) await API.put(`/api/admin/users/${user.id}`, data);
              else await API.post("/api/admin/users", data);
              toast("User saved.", "success");
              UI.closeModal();
              await this.load();
            } catch (err) { reportError(err); }
          };
        },
      });
    },
    async deleteUser(id) {
      const ok = await UI.confirmDialog("Delete this user account? This can't be undone.");
      if (!ok) return;
      try {
        await API.del(`/api/admin/users/${id}`);
        toast("User deleted.", "success");
        await this.load();
      } catch (err) { reportError(err); }
    },
  },
};

// ================= AUDIT LOG (owner-only, read-only) =================
SECTIONS.audit = {
  label: "Audit Logs", group: "System", role: "owner",
  controller: {
    async load() {
      const logs = await API.get("/api/admin/audit?limit=150");
      const container = document.getElementById("content");
      const actionColor = a => a.includes("delete") ? "red" : a.includes("create") ? "green" : a.includes("login") ? "blue" : "amber";
      container.innerHTML = UI.renderTable({
        columns: [
          { label: "When", key: "created_at" },
          { label: "User", key: "user_email", render: l => l.user_email || "—" },
          { label: "Action", key: "action", render: l => UI.pill(l.action, actionColor(l.action)) },
          { label: "Entity", key: "entity", render: l => `${l.entity}${l.entity_id ? " #" + l.entity_id : ""}` },
          { label: "IP", key: "ip" },
        ],
        rows: logs.map(l => ({ ...l, __id: l.id, __actions: "" })),
        emptyMessage: "No activity logged yet.",
      });
    },
  },
};
