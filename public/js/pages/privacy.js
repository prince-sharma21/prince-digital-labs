(async () => {
  const settings = await Site.boot("privacy.html");
  document.getElementById("lastUpdated").textContent = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  if (settings.contact_email) {
    document.getElementById("contactLine").innerHTML = `If you have questions about this policy, please contact us at <a href="mailto:${Site.escapeHtml(settings.contact_email)}">${Site.escapeHtml(settings.contact_email)}</a> or use our <a href="contact.html">contact form</a>.`;
  }
})();
