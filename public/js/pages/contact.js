function renderContactDetails(settings) {
  const el = document.getElementById("contactDetails");
  const lines = [];
  if (settings.contact_email) lines.push(`<p><strong>Email:</strong> <a href="mailto:${Site.escapeHtml(settings.contact_email)}" style="color:var(--primary);">${Site.escapeHtml(settings.contact_email)}</a></p>`);
  if (settings.contact_phone) lines.push(`<p><strong>Phone:</strong> <a href="tel:${Site.escapeHtml(settings.contact_phone.replace(/\s/g, ""))}" style="color:var(--primary);">${Site.escapeHtml(settings.contact_phone)}</a></p>`);
  if (settings.contact_address) lines.push(`<p><strong>Address:</strong> ${Site.escapeHtml(settings.contact_address)}</p>`);
  if (settings.business_hours) lines.push(`<p><strong>Hours:</strong> ${Site.escapeHtml(settings.business_hours)}</p>`);
  el.innerHTML = lines.length ? lines.join("") : `<p style="color:var(--ink-faint);">Use the form and we'll get back to you — direct contact details are coming soon.</p>`;
}

function prefillServiceFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service");
  if (!service) return;
  const select = document.getElementById("service");
  const match = [...select.options].find(o => o.value.toLowerCase() === service.toLowerCase());
  if (match) { select.value = match.value; }
  else if (service) {
    const opt = document.createElement("option");
    opt.value = service; opt.textContent = service; opt.selected = true;
    select.insertBefore(opt, select.firstChild.nextSibling);
  }
}

function setFieldError(id, hasError) {
  document.getElementById(id).closest(".form-field").classList.toggle("invalid", hasError);
}

document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  setFieldError("name", !name);
  setFieldError("email", !emailOk);
  if (!name || !emailOk) return;

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    await Site.submitContactForm({
      name,
      email,
      phone: document.getElementById("phone").value.trim(),
      company: document.getElementById("company").value.trim(),
      service: document.getElementById("service").value,
      message: document.getElementById("message").value.trim(),
    });
    document.getElementById("contactForm").style.display = "none";
    document.getElementById("successBox").classList.add("show");
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Send message";
    alert(err.message || "Something went wrong. Please try again.");
  }
});

(async () => {
  const settings = await Site.boot("contact.html");
  renderContactDetails(settings);
  prefillServiceFromQuery();
  Site.initRevealAnimations();
})();
