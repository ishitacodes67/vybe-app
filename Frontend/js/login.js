/* =========================================================
   VYBE — MEMBER LOGIN / REGISTER
   Talks to the real backend via window.api
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const form = document.querySelector('[data-login-role="member"]');
    if (!form) return;

    /* =====================================================
       HELPERS
    ===================================================== */

    function clearErrors() {
        form.querySelectorAll(".field").forEach(f => f.classList.remove("has-error"));
        form.querySelectorAll(".field-error").forEach(e => (e.textContent = ""));
    }

    function showError(fieldName, message) {
        const field = form.querySelector(`[name="${fieldName}"]`);
        const wrapper = field?.closest(".field");
        const error = form.querySelector(`[data-error-for="${fieldName}"]`);
        wrapper?.classList.add("has-error");
        if (error) error.textContent = message;
    }

    function normalizePhone(v) { return String(v || "").replace(/\D/g, "").slice(0, 10); }
    function normalizeText(v) { return String(v || "").trim().replace(/\s+/g, " "); }
    function normalizeEmail(v) { return String(v || "").trim().toLowerCase(); }
    function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
    function validPhone(p) { return /^[6-9]\d{9}$/.test(p); }

    /* =====================================================
       PHONE INPUT — digits only
    ===================================================== */

    const phoneInput = form.querySelector("#memberPhone");
    phoneInput?.addEventListener("input", () => {
        phoneInput.value = normalizePhone(phoneInput.value);
    });

    /* =====================================================
       SUBMIT
    ===================================================== */

    form.addEventListener("submit", async (event) => {

        event.preventDefault();
        clearErrors();

        const name = normalizeText(form.elements.name?.value);
        const email = normalizeEmail(form.elements.email?.value);
        const phone = normalizePhone(form.elements.phone?.value);
        const institution = normalizeText(form.elements.institution?.value);
        const password = String(form.elements.password?.value || "");

        let valid = true;

        if (name.length < 2) { showError("name", "Enter your full name."); valid = false; }
        if (!validEmail(email)) { showError("email", "Enter a valid email address."); valid = false; }
        if (!validPhone(phone)) { showError("phone", "Enter a valid 10-digit Indian mobile number."); valid = false; }
        if (institution.length < 2) { showError("institution", "Enter your institution."); valid = false; }
        if (password.length < 6) { showError("password", "Password must be at least 6 characters."); valid = false; }

        if (!valid) return;

        /* ---------- Button state ---------- */
        const button = form.querySelector('button[type="submit"]');
        const originalLabel = button ? button.innerHTML : "";
        if (button) {
            button.disabled = true;
            button.innerHTML = `working… <span>→</span>`;
        }

        const payload = {
            name,
            email,
            phone: `+91${phone}`,
            password,
            role: "member",
            institutionName: institution
        };

        let user = null;
        let errorMsg = "";

        try {
            // Try register first (new account)
            const result = await window.api.register(payload);
            user = result.user;
        } catch (err) {
            // If the email already exists, try logging in with the same password
            if (err.status === 409) {
                try {
                    const result = await window.api.login(email, password);
                    user = result.user;
                } catch (loginErr) {
                    errorMsg = loginErr.status === 401
                        ? "This email is already registered. Wrong password, or try a different email."
                        : (loginErr.message || "Login failed.");
                }
            } else {
                errorMsg = err.message || "Registration failed.";
            }
        }

        if (errorMsg || !user) {
            if (button) {
                button.disabled = false;
                button.innerHTML = originalLabel;
            }
            showError("email", errorMsg || "Something went wrong.");
            return;
        }

        /* ---------- Success ---------- */
        // Clear any stale onboarding state
        ["vybeOnboarding", "vybeOnboardingUser", "vybe_current_user",
         "vybe_onboarding_complete", "vybeOnboardingState", "onboardingData"].forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });

        // Also store in the keys the old pages expect
        localStorage.setItem("vybeUser", JSON.stringify(user));
        localStorage.setItem("vybeMember", JSON.stringify(user));
        localStorage.setItem("vybeRole", "member");
        sessionStorage.setItem("vybePendingMember", JSON.stringify(user));

        if (button) button.innerHTML = `onboarding <span>→</span>`;

        setTimeout(() => {
            window.location.replace("onboarding.html");
        }, 250);
    });

    /* =====================================================
       Prevent stale form values on back button
    ===================================================== */

    window.addEventListener("pageshow", () => {
        form.reset();
        clearErrors();
    });

});