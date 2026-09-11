/**
 * API — thin fetch wrapper for the admin dashboard. Cookies are sent
 * automatically (same-origin), and the CSRF token obtained at login is
 * attached to every mutating request.
 */
const API = (() => {
  let csrfToken = null;
  let currentUser = null;

  function setCsrfToken(token) { csrfToken = token; }
  function setUser(user) { currentUser = user; }
  function getUser() { return currentUser; }

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
    };
    if (method !== "GET" && csrfToken) opts.headers["X-CSRF-Token"] = csrfToken;
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(path, opts);

    if (res.status === 401) {
      window.location.href = "/admin/login.html";
      throw new Error("Not authenticated");
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }

    if (!res.ok) {
      const message = (data && data.error) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  }

  async function upload(path, formData) {
    const res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      body: formData,
    });
    if (res.status === 401) {
      window.location.href = "/admin/login.html";
      throw new Error("Not authenticated");
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || "Upload failed");
    return data;
  }

  return {
    get: path => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    del: path => request("DELETE", path),
    upload,
    setCsrfToken,
    setUser,
    getUser,
  };
})();

/** Toast notifications */
function toast(message, type = "") {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/** Central place to report an API error to the user. */
function reportError(err) {
  console.error(err);
  toast(err.message || "Something went wrong.", "error");
}
