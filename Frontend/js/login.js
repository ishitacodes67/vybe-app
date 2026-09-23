/* =========================================================
   VYBE — MEMBER LOGIN / REGISTER
   Two modes on the same form:
     • register (default) — name, email, phone, institution, password
     • login              — email + password only
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form = document.querySelector('[data-login-role="member"]');
    if (!form) return;

    const toggleButtons = form.querySelectorAll("[data-mode-btn]");
    const registerOnly = form.querySelectorAll("[data-register-only]");
    const submitBtn = form.querySelector("#memberSubmitBtn");
    const privacyNote = form.querySelector("#memberPrivacyNote");

    let mode = "register"; // or "login"

    /* =====================================================
       MODE TOGGLE
    ===================================================== */

    function setMode(newMode) {
        mode = newMode;
        form.dataset.mode = newMode;

        toggleButtons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.modeBtn === newMode);
        });

        // Hide/show register-only fields
        registerOnly.forEach(field => {
            field.style.display = newMode === "register" ? "" : "none";
        });

        // Update submit button label
        if (submitBtn) {
            submitBtn.innerHTML = newMode === "register"
                ? `START YOUR VYBE <span>→</span>`
                : `SIGN ME IN <span>→</span>`;
        }

        // Update hint text
        if (privacyNote) {
            privacyNote.textContent = newMode === "register"
                ? "You'll complete your VYBE profile after signing in."
                : "Welcome back. Your onboarding is already saved.";
        }

        clearErrors();
    }

    toggleButtons.forEach(btn => {
        btn.addEventListener("click", () => setMode(btn.dataset.modeBtn));
    });

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

        const email = normalizeEmail(form.elements.email?.value);
        const password = String(form.elements.password?.value || "");

        let valid = true;
        if (!validEmail(email)) { showError("email", "Enter a valid email address."); valid = false; }
        if (password.length < 6) { showError("password", "Password must be at least 6 characters."); valid = false; }

        // Register-only fields
        let name = "", phone = "", institution = "";
        if (mode === "register") {
            name = normalizeText(form.elements.name?.value);
            phone = normalizePhone(form.elements.phone?.value);
            institution = normalizeText(form.elements.institution?.value);

            if (name.length < 2) { showError("name", "Enter your full name."); valid = false; }
            if (!validPhone(phone)) { showError("phone", "Enter a valid 10-digit Indian mobile number."); valid = false; }
            if (institution.length < 2) { showError("institution", "Enter your institution."); valid = false; }
        }

        if (!valid) return;

        /* ---------- Button state ---------- */
        const originalLabel = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `working… <span>→</span>`;

        let user = null;
        let errorMsg = "";

        try {
            if (mode === "login") {
                const result = await window.api.login(email, password);
                user = result.user;
            } else {
                const payload = {
                    name,
                    email,
                    phone: `+91${phone}`,
                    password,
                    role: "member",
                    institutionName: institution
                };
                const result = await window.api.register(payload);
                user = result.user;
            }
        } catch (err) {
            if (err.status === 409) {
                errorMsg = "This email is already registered. Switch to 'ALREADY HAVE AN ACCOUNT' above to sign in.";
            } else if (err.status === 401) {
                errorMsg = "Invalid email or password.";
            } else {
                errorMsg = err.message || "Something went wrong.";
            }
        }

        if (errorMsg || !user) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalLabel;
            showError("email", errorMsg);
            return;
        }

        /* ---------- Success ---------- */
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

        // Where to go next?
        const needsOnboarding = !user.onboardingCompleted;

        submitBtn.innerHTML = needsOnboarding
            ? `onboarding <span>→</span>`
            : `welcome back <span>→</span>`;

        setTimeout(() => {
            window.location.replace(needsOnboarding ? "onboarding.html" : "home.html");
        }, 250);
    });

    /* =====================================================
       Prevent stale form values on back button
    ===================================================== */

    window.addEventListener("pageshow", () => {
        form.reset();
        clearErrors();
        setMode(mode); // keep current mode
    });

    // Initialize
    setMode("register");
});