/* =========================================================
   VYBE — ONBOARDING
   3 STEP FRESH FLOW
   STEP 1 → Personal context
   STEP 2 → Minimum 3 interests
   STEP 3 → Minimum 1 goal
   Syncs to backend via window.api on finish.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        step: 1,
        field: "",
        institution: "",
        year: "",
        interests: [],
        goals: []
    };

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const steps = [
        document.querySelector("#step1"),
        document.querySelector("#step2"),
        document.querySelector("#step3")
    ];

    const progressFill = document.querySelector("#progressFill");
    const stepLabel = document.querySelector("#stepLabel");
    const backButton = document.querySelector("#backButton");
    const fieldInput = document.querySelector("#field");
    const institutionInput = document.querySelector("#institution");
    const otherYearInput = document.querySelector("#otherYear");

    const yearButtons = Array.from(document.querySelectorAll(".year-option"));
    const interestCards = Array.from(document.querySelectorAll(".interest-card"));
    const goalCards = Array.from(document.querySelectorAll(".goal-card"));

    const interestCount = document.querySelector("#interestCount");
    const step1Continue = document.querySelector("#step1Continue");
    const step2Continue = document.querySelector("#step2Continue");
    const finishButton = document.querySelector("#finishOnboarding");

    /* =====================================================
       RESET / CLEAN UI
    ===================================================== */

    function resetEverything() {
        state.step = 1;
        state.field = "";
        state.institution = "";
        state.year = "";
        state.interests = [];
        state.goals = [];

        if (fieldInput) fieldInput.value = "";
        if (institutionInput) institutionInput.value = "";
        if (otherYearInput) {
            otherYearInput.value = "";
            otherYearInput.classList.remove("visible");
        }

        yearButtons.forEach(b => b.classList.remove("selected"));
        interestCards.forEach(c => c.classList.remove("selected"));
        goalCards.forEach(c => c.classList.remove("selected"));

        clearErrors();
        updateInterestCount();
        updateProgress();
        showStep(1);
    }

    /* =====================================================
       ERRORS
    ===================================================== */

    function clearErrors() {
        document.querySelectorAll(".error-message").forEach(el => {
            el.textContent = "";
        });
    }

    function showError(id, message) {
        const el = document.querySelector(`#${id}`);
        if (el) el.textContent = message;
    }

    /* =====================================================
       NAVIGATION (the missing function)
    ===================================================== */

    function updateNavigation() {
        // Toggle back button visibility and label depending on step
        if (!backButton) return;

        if (state.step === 1) {
            backButton.textContent = "← back to login";
            backButton.style.visibility = "visible";
        } else {
            backButton.textContent = "← back";
            backButton.style.visibility = "visible";
        }
    }

    /* =====================================================
       STEP DISPLAY
    ===================================================== */

    function showStep(number) {
        state.step = number;

        steps.forEach((step, index) => {
            if (!step) return;
            const active = index + 1 === number;
            step.classList.toggle("active", active);
            step.style.display = active ? "block" : "none";
        });

        updateProgress();
        updateNavigation();
    }

    function updateProgress() {
        const pct = (state.step / 3) * 100;
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (stepLabel) stepLabel.textContent = `STEP ${state.step} OF 3`;
    }

    /* =====================================================
       VALIDATION
    ===================================================== */

    function validateStepOne() {
        clearErrors();

        state.field = (fieldInput?.value || "").trim();
        state.institution = (institutionInput?.value || "").trim();

        if (!state.field) {
            showError("fieldError", "Tell us what you're studying or working in.");
            fieldInput?.focus();
            return false;
        }
        if (!state.institution) {
            showError("institutionError", "Tell us which institution you're in.");
            institutionInput?.focus();
            return false;
        }
        if (!state.year) {
            showError("yearError", "Pick your current year.");
            return false;
        }
        if (state.year === "Other" && !(otherYearInput?.value || "").trim()) {
            showError("yearError", "Tell us your year.");
            otherYearInput?.focus();
            return false;
        }
        if (state.year === "Other") {
            state.year = otherYearInput.value.trim();
        }
        return true;
    }

    function validateInterests() {
        if (state.interests.length < 3) {
            showError("interestError", "Pick at least 3 interests before continuing.");
            return false;
        }
        return true;
    }

    function validateGoals() {
        if (state.goals.length < 1) {
            showError("goalError", "Choose at least one thing you want from campus.");
            return false;
        }
        return true;
    }

    /* =====================================================
       YEAR SELECTION
    ===================================================== */

    yearButtons.forEach(button => {
        button.addEventListener("click", () => {
            yearButtons.forEach(b => b.classList.remove("selected"));
            button.classList.add("selected");
            state.year = button.dataset.year;

            if (state.year === "Other") {
                otherYearInput?.classList.add("visible");
                otherYearInput?.focus();
            } else {
                otherYearInput?.classList.remove("visible");
                if (otherYearInput) otherYearInput.value = "";
            }

            const yErr = document.querySelector("#yearError");
            if (yErr) yErr.textContent = "";
        });
    });

    /* =====================================================
       INTERESTS
    ===================================================== */

    interestCards.forEach(card => {
        card.addEventListener("click", () => {
            const value = card.dataset.interest;
            if (!value) return;

            const idx = state.interests.indexOf(value);
            if (idx >= 0) {
                state.interests.splice(idx, 1);
                card.classList.remove("selected");
            } else {
                state.interests.push(value);
                card.classList.add("selected");
            }

            updateInterestCount();

            const iErr = document.querySelector("#interestError");
            if (iErr) iErr.textContent = "";
        });
    });

    function updateInterestCount() {
        if (interestCount) interestCount.textContent = state.interests.length;
    }

    /* =====================================================
       GOALS
    ===================================================== */

    goalCards.forEach(card => {
        card.addEventListener("click", () => {
            const value = card.dataset.goal;
            if (!value) return;

            const idx = state.goals.indexOf(value);
            if (idx >= 0) {
                state.goals.splice(idx, 1);
                card.classList.remove("selected");
            } else {
                state.goals.push(value);
                card.classList.add("selected");
            }

            const gErr = document.querySelector("#goalError");
            if (gErr) gErr.textContent = "";
        });
    });

    /* =====================================================
       STEP BUTTONS
    ===================================================== */

    step1Continue?.addEventListener("click", () => {
        if (!validateStepOne()) return;
        showStep(2);
    });

    step2Continue?.addEventListener("click", () => {
        if (!validateInterests()) return;
        showStep(3);
    });

    /* =====================================================
       BACK
    ===================================================== */

    backButton?.addEventListener("click", () => {
        if (state.step === 1) {
            window.location.href = "member-login.html";
            return;
        }
        showStep(state.step - 1);
    });

    /* =====================================================
       FINISH — save locally + sync to backend
    ===================================================== */

    finishButton?.addEventListener("click", async () => {

        if (!validateGoals()) return;

        let user = null;
        try {
            user = JSON.parse(localStorage.getItem("vybeUser") || "null");
        } catch { user = null; }

        // If no user in storage, try window.api's stored user
        if (!user && window.api?.getUser) {
            user = window.api.getUser();
        }

        if (!user) {
            window.location.href = "member-login.html";
            return;
        }

        const updatedUser = {
            ...user,
            field: state.field,
            institution: state.institution,
            year: state.year,
            interests: [...state.interests],
            goals: [...state.goals],
            onboardingCompleted: true,
            onboardingComplete: true,
            updatedAt: new Date().toISOString()
        };

        // Save locally so home.html can read it immediately
        localStorage.setItem("vybeUser", JSON.stringify(updatedUser));
        localStorage.setItem("vybeMember", JSON.stringify(updatedUser));
        localStorage.setItem("vybeRole", "member");

        sessionStorage.removeItem("vybePendingMember");
        sessionStorage.removeItem("vybeOnboardingState");

        // Update button UI
        finishButton.disabled = true;
        finishButton.innerHTML = `saving… <span>✦</span>`;

        /* =================================================
           SYNC TO BACKEND
           Non-blocking — if it fails we still go to home.
        ================================================= */
        try {
            if (window.api) {
                // 1. Save course/year
                await window.api.updateProfile({
                    course: state.field,
                    year: state.year
                });

                // 2. Save interests + goals
                await window.api.updateInterests(state.interests, state.goals);

                // 3. Mark onboarding complete
                await window.api.completeOnboarding();
            }
        } catch (err) {
            console.warn("[onboarding] backend sync failed (non-fatal):", err.message);
        }

        finishButton.innerHTML = `VYBE IS READY <span>✦</span>`;

        setTimeout(() => {
            window.location.replace("home.html");
        }, 350);
    });

    /* =====================================================
       BROWSER BACK/FORWARD SAFETY
    ===================================================== */

    window.addEventListener("pageshow", event => {
        if (event.persisted) {
            resetEverything();
        }
    });

    /* =====================================================
       START
    ===================================================== */

    resetEverything();
    console.log("VYBE onboarding: fresh 3-step flow initialized (backend-synced).");

});