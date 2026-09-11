const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const form = document.getElementById("resetForm");
const errorBox = document.getElementById("errorBox");

if (!token) {
  errorBox.textContent = "This reset link is missing its token. Request a new one.";
  errorBox.classList.add("show");
  form.classList.add("hidden");
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  errorBox.classList.remove("show");
  const newPassword = document.getElementById("newPassword").value;
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not reset password.");
    form.classList.add("hidden");
    document.getElementById("successBox").classList.add("show");
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add("show");
  }
});
