/* =========================================================
   VYBE — MEMBER LOGIN / REGISTER
   Register: name + studentId + gmail + password
   Login:    studentId + password
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form = document.querySelector('[data-login-role="member"]');
    if (!form) return;

    const toggleButtons = form.querySelectorAll("[data-mode-btn]");
    const registerOnly = form.querySelectorAll("[data-register-only]");
    const submitBtn = form.querySelector("#memberSubmitBtn");
    const privacyNote = form.querySelector("#memberPrivacyNote");

    let mode = "register";

    /* =====================================================
       MODE TOGGLE
    ===================================================== */

    function setMode(newMode) {
        mode = newMode;
        form.dataset.mode = newMode;

        toggleButtons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.modeBtn === newMode);
        });

        registerOnly.forEach(field => {
            field.style.display = newMode === "register" ? "" : "none";
        });

        if (submitBtn) {
            submitBtn.innerHTML = newMode === "register"
                ? `START YOUR VYBE <span>→</span>`
                : `SIGN ME IN <span>→</span>`;
        }

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

    function normalizeText(v) { return String(v || "").trim().replace(/\s+/g, " "); }
    function normalizeStudentId(v) {
        return String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    function normalizeEmail(v) { return String(v || "").trim().toLowerCase(); }

    function validStudentId(id) {
        // 3+ chars, letters and numbers only (after normalization)
        return /^[a-z0-9]{3,}$/.test(id);
    }

    function validGmail(g) {
        if (!g) return true; // optional
        return /^[^\s@]+@gmail\.com$/.test(g);
    }

    /* =====================================================
       SUBMIT
    ===================================================== */

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearErrors();

        const studentId = normalizeStudentId(form.elements.studentId?.value);
        const password = String(form.elements.password?.value || "");

        let valid = true;

        /* ----- Student ID validation ----- */
        if (!studentId) {
            showError("studentId", "Enter your Student ID.");
            valid = false;
        } else if (!validStudentId(studentId)) {
            showError("studentId", "Student ID must be at least 3 letters/numbers (e.g. 2024CS001).");
            valid = false;
        }

        /* ----- Password ----- */
        if (password.length < 6) {
            showError("password", "Password must be at least 6 characters.");
            valid = false;
        }

        /* ----- Register-only fields ----- */
        let name = "", gmail = "";
        if (mode === "register") {
            name = normalizeText(form.elements.name?.value);
            gmail = normalizeEmail(form.elements.gmail?.value);

            if (name.length < 2) {
                showError("name", "Enter your full name.");
                valid = false;
            }
            if (gmail && !validGmail(gmail)) {
                showError("gmail", "Gmail must end with @gmail.com.");
                valid = false;
            }
        }

        if (!valid) return;

        const originalLabel = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `working… <span>→</span>`;

        let user = null;
        let errorMsg = "";
        let errorField = "studentId";

        try {
            if (mode === "login") {
                const result = await window.api.login(studentId, password);
                user = result.user;
            } else {
                const payload = {
                    name,
                    studentId,
                    gmail: gmail || undefined,
                    password,
                    role: "member"
                };
                const result = await window.api.register(payload);
                user = result.user;
            }
        } catch (err) {
            if (err.status === 409) {
                errorMsg = "This Student ID is already registered. Switch to 'ALREADY HAVE AN ACCOUNT' above.";
            } else if (err.status === 401) {
                errorMsg = "Invalid Student ID or password.";
                errorField = "password";
            } else if (err.status === 400) {
                errorMsg = err.message || "Please check your details.";
            } else {
                errorMsg = err.message || "Something went wrong.";
            }
        }

        if (errorMsg || !user) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalLabel;
            showError(errorField, errorMsg);
            return;
        }

        /* ---------- Success ---------- */
        ["vybeOnboarding", "vybeOnboardingUser", "vybe_current_user",
         "vybe_onboarding_complete", "vybeOnboardingState", "onboardingData"].forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });

        localStorage.setItem("vybeUser", JSON.stringify(user));
        localStorage.setItem("vybeMember", JSON.stringify(user));
        localStorage.setItem("vybeRole", "member");
        sessionStorage.setItem("vybePendingMember", JSON.stringify(user));

        const needsOnboarding = !user.onboardingCompleted;

        submitBtn.innerHTML = needsOnboarding
            ? `onboarding <span>→</span>`
            : `welcome back <span>→</span>`;

        setTimeout(() => {
            window.location.replace(needsOnboarding ? "onboarding.html" : "home.html");
        }, 250);
    });

    window.addEventListener("pageshow", () => {
        form.reset();
        clearErrors();
        setMode(mode);
    });

    setMode("register");
});