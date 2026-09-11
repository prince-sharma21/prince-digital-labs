(async () => {
  const settings = await Site.boot("founder.html");

  const esc = Site.escapeHtml;

  const photo = document.getElementById("founderPhoto");
  photo.src = settings.founder_photo_url || "/images/founder.jpg";
  photo.alt = (settings.founder_name || "Founder") + " — Prince Digital Labs";

  document.getElementById("founderName").textContent = settings.founder_name || "Founder";
  document.getElementById("founderRole").textContent = settings.founder_role || "Founder — Prince Digital Labs";

  const bioParas = (settings.founder_bio || "")
    .split("\n")
    .filter(p => p.trim())
    .map(p => `<p>${esc(p)}</p>`)
    .join("");
  document.getElementById("founderBio").innerHTML = bioParas;

  document.getElementById("founderBelief").textContent = settings.founder_belief || "";
  document.getElementById("founderApproach").textContent = settings.founder_approach || "";
  document.getElementById("founderVision").textContent = settings.founder_vision || "";

  // Skills: lines formatted as "Name | Description"
  const skillsWrap = document.getElementById("founderSkills");
  const skillLines = (settings.founder_skills || "").split("\n").filter(l => l.trim());
  if (skillLines.length) {
    skillsWrap.innerHTML = skillLines.map(line => {
      const [name, desc] = line.split("|").map(s => (s || "").trim());
      return `<div class="card reveal"><h3>${esc(name)}</h3><p>${esc(desc || "")}</p></div>`;
    }).join("");
  } else {
    skillsWrap.innerHTML = `<div class="empty-state">Skills coming soon.</div>`;
  }

  // Highlights: one bullet per line
  const highlightsWrap = document.getElementById("founderHighlights");
  const highlightLines = (settings.founder_highlights || "").split("\n").filter(l => l.trim());
  if (highlightLines.length) {
    highlightsWrap.innerHTML = highlightLines.map(line => `<li>${esc(line)}</li>`).join("");
  } else {
    highlightsWrap.innerHTML = `<li style="color:var(--ink-faint);">Highlights coming soon.</li>`;
  }

  Site.initRevealAnimations();
})();
