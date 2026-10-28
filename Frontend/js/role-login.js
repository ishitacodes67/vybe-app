/* VYBE Host / Authority login — uses the real API client, never a fake local session. */
document.addEventListener("DOMContentLoaded", () => {
  const configs = [
    { role: "organizer", formId: "organizerLoginForm", destination: "organizer-dashboard.html", aliasKey: "vybeOrganizer" },
    { role: "authority", formId: "authorityLoginForm", destination: "authority-dashboard.html", aliasKey: "vybeAuthority" }
  ];
  configs.forEach(({ role, formId, destination, aliasKey }) => {
    const form = document.getElementById(formId);
    if (!form) return;
    const field = name => form.querySelector(`[name="${name}"]`);
    const message = form.querySelector("[data-login-message]");
    const button = form.querySelector('button[type="submit"]');
    const showError = (name, text) => {
      const input = field(name);
      const error = form.querySelector(`[data-error-for="${name}"]`);
      if (error) error.textContent = text || "";
      if (input) input.setAttribute("aria-invalid", text ? "true" : "false");
    };
    form.addEventListener("submit", async event => {
      event.preventDefault();
      ["identifier", "password"].forEach(n => showError(n, ""));
      if (message) { message.textContent = ""; message.className = "role-login-message"; }
      const identifier = String(field("identifier")?.value || "").trim();
      const password = String(field("password")?.value || "");
      let valid = true;
      if (!identifier) { showError("identifier", "Enter your college email or Student ID."); valid = false; }
      if (password.length < 6) { showError("password", "Password must be at least 6 characters."); valid = false; }
      if (!valid) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
      const original = button?.innerHTML;
      if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); button.textContent = "Signing in…"; }
      try {
        if (!window.api || typeof window.api.login !== "function") throw new Error("The VYBE API client did not load. Refresh and try again.");
        const result = await window.api.login(identifier, password);
        const user = result?.user;
        if (!user) throw new Error("The server did not return a user profile.");
        if (String(user.role || "").toLowerCase() !== role) {
          window.api.logout?.();
          throw new Error(`This account does not have ${role === "organizer" ? "Host" : "Authority"} access. Please use the correct role account.`);
        }
        // Maintain legacy aliases used by the existing role scripts while retaining API token storage.
        localStorage.setItem("vybeUser", JSON.stringify(user));
        localStorage.setItem("vybeRole", role);
        localStorage.setItem(aliasKey, JSON.stringify(user));
        if (message) message.textContent = "Signed in. Opening your workspace…";
        window.location.replace(destination);
      } catch (err) {
        const text = err?.status === 401 ? "Email/Student ID or password is incorrect." : (err?.message || "Could not sign in. Check the backend connection and try again.");
        if (message) { message.textContent = text; message.classList.add("is-error"); }
      } finally {
        if (button && !/Opening your workspace/.test(message?.textContent || "")) {
          button.disabled = false; button.removeAttribute("aria-busy"); button.innerHTML = original || "SIGN IN";
        }
      }
    });
    form.querySelectorAll('input[type="password"]').forEach(input => input.addEventListener("keydown", e => { if (e.key === "Enter") form.requestSubmit(); }));
  });
});
