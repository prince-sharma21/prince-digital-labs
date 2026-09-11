const NAV_GROUPS = ["", "Content", "Marketing", "System"];
const NAV_ORDER = ["overview", "services", "pricing", "blog", "portfolio", "testimonials", "faqs", "notifications", "landing", "leads", "media", "settings", "users", "audit"];

let activeKey = "overview";

async function boot() {
  let me;
  try {
    me = await API.get("/api/auth/me");
  } catch {
    return; // API layer already redirects to login on 401
  }
  API.setCsrfToken(me.csrfToken);
  API.setUser(me.user);

  document.getElementById("userName").textContent = me.user.name;
  document.getElementById("userRole").textContent = me.user.role;

  renderNav(me.user.role);
  bindShell();
  await goTo("overview");
}

function renderNav(role) {
  const nav = document.getElementById("navList");
  let html = "";
  let lastGroup = null;
  for (const key of NAV_ORDER) {
    const section = SECTIONS[key];
    if (!section) continue;
    if (section.role === "owner" && role !== "owner") continue;
    if (section.group !== lastGroup) {
      if (section.group) html += `<div class="admin-nav-group-label">${section.group}</div>`;
      lastGroup = section.group;
    }
    html += `<button data-key="${key}" class="${key === activeKey ? "active" : ""}">${section.label}</button>`;
  }
  nav.innerHTML = html;
  nav.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => goTo(btn.dataset.key);
  });
}

async function goTo(key) {
  const section = SECTIONS[key];
  if (!section) return;
  activeKey = key;
  document.getElementById("sectionTitle").textContent = section.label;
  document.querySelectorAll(".admin-nav button").forEach(b => b.classList.toggle("active", b.dataset.key === key));
  document.getElementById("content").innerHTML = `<p style="color:var(--ink-faint);">Loading…</p>`;
  document.getElementById("sidebar").classList.remove("open");
  try {
    await section.controller.load();
  } catch (err) {
    reportError(err);
    document.getElementById("content").innerHTML = `<p style="color:var(--danger);">Could not load this section.</p>`;
  }
}

function bindShell() {
  document.getElementById("logoutBtn").onclick = async () => {
    try { await API.post("/api/auth/logout"); } catch {}
    window.location.href = "/admin/login.html";
  };
  document.getElementById("mobileToggle").onclick = () => {
    document.getElementById("sidebar").classList.toggle("open");
  };
}

boot();
