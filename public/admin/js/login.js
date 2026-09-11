const form = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");
const totpField = document.getElementById("totpField");
const submitBtn = document.getElementById("submitBtn");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add("show");
}
function clearError() {
  errorBox.classList.remove("show");
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  clearError();
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const totpToken = document.getElementById("totp").value.trim();

  try {
    const body = { email, password };
    if (totpToken) body.totpToken = totpToken;

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Login failed.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
      return;
    }

    if (data.requiresTotp) {
      totpField.classList.remove("hidden");
      document.getElementById("totp").focus();
      submitBtn.disabled = false;
      submitBtn.textContent = "Verify code";
      return;
    }

    // Success — the session cookie is set; go to the dashboard.
    window.location.href = "/admin/dashboard.html";
  } catch (err) {
    showError("Could not reach the server. Please try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});
