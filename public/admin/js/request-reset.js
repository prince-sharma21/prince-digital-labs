document.getElementById("requestForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {}
  document.getElementById("requestForm").classList.add("hidden");
  document.getElementById("successBox").classList.add("show");
});
