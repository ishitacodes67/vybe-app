/* =========================================================
   VYBE — ONBOARDING
   3 STEP FRESH FLOW

   STEP 1 → Personal context
   STEP 2 → Minimum 3 interests
   STEP 3 → Minimum 1 goal
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


    const progressFill =
        document.querySelector("#progressFill");


    const stepLabel =
        document.querySelector("#stepLabel");


    const backButton =
        document.querySelector("#backButton");


    const fieldInput =
        document.querySelector("#field");


    const institutionInput =
        document.querySelector("#institution");


    const otherYearInput =
        document.querySelector("#otherYear");


    const yearButtons =
        Array.from(
            document.querySelectorAll(
                ".year-option"
            )
        );


    const interestCards =
        Array.from(
            document.querySelectorAll(
                ".interest-card"
            )
        );


    const goalCards =
        Array.from(
            document.querySelectorAll(
                ".goal-card"
            )
        );


    const interestCount =
        document.querySelector(
            "#interestCount"
        );


    const step1Continue =
        document.querySelector(
            "#step1Continue"
        );


    const step2Continue =
        document.querySelector(
            "#step2Continue"
        );


    const finishButton =
        document.querySelector(
            "#finishOnboarding"
        );


    /* =====================================================
       FORCE A CLEAN UI
       ===================================================== */

    function resetEverything() {

        state.step = 1;

        state.field = "";

        state.institution = "";

        state.year = "";

        state.interests = [];

        state.goals = [];


        if (fieldInput) {

            fieldInput.value = "";

        }


        if (institutionInput) {

            institutionInput.value = "";

        }


        if (otherYearInput) {

            otherYearInput.value = "";

            otherYearInput.classList.remove(
                "visible"
            );

        }


        yearButtons.forEach(
            button => {

                button.classList.remove(
                    "selected"
                );

            }
        );


        interestCards.forEach(
            card => {

                card.classList.remove(
                    "selected"
                );

            }
        );


        goalCards.forEach(
            card => {

                card.classList.remove(
                    "selected"
                );

            }
        );


        clearErrors();

        updateInterestCount();

        updateProgress();

        showStep(1);

    }


    /* =====================================================
       CLEAR ERRORS
       ===================================================== */

    function clearErrors() {

        document
            .querySelectorAll(
                ".error-message"
            )
            .forEach(
                element => {

                    element.textContent =
                        "";

                }
            );

    }


    function showError(
        id,
        message
    ) {

        const element =
            document.querySelector(
                `#${id}`
            );


        if (element) {

            element.textContent =
                message;

        }

    }


    /* =====================================================
       STEP DISPLAY
       ===================================================== */

    function showStep(number) {

        state.step = number;


        steps.forEach(
            (step, index) => {

                if (!step) return;

                const active =
                    index + 1 === number;

                step.classList.toggle(
                    "active",
                    active
                );

                step.style.display =
                    active
                        ? "block"
                        : "none";

            }
        );


        updateProgress();

        updateNavigation();

    }


    /* =====================================================
       PROGRESS
       ===================================================== */

    function updateProgress() {

        const percentage =
            (state.step / 3) * 100;


        if (progressFill) {

            progressFill.style.width =
                `${percentage}%`;

        }


        if (stepLabel) {

            stepLabel.textContent =
                `STEP ${state.step} OF 3`;

        }

    }


    /* =====================================================
       STEP 1 VALIDATION
       ===================================================== */

    function validateStepOne() {

        clearErrors();


        state.field =
            fieldInput?.value
                .trim() || "";


        state.institution =
            institutionInput?.value
                .trim() || "";


        if (!state.field) {

            showError(
                "fieldError",
                "Tell us what you're studying or working in."
            );

            fieldInput?.focus();

            return false;

        }


        if (!state.institution) {

            showError(
                "institutionError",
                "Tell us which institution you're in."
            );

            institutionInput?.focus();

            return false;

        }


        if (!state.year) {

            showError(
                "yearError",
                "Pick your current year."
            );

            return false;

        }


        if (
            state.year === "Other" &&
            !otherYearInput.value.trim()
        ) {

            showError(
                "yearError",
                "Tell us your year."
            );

            otherYearInput.focus();

            return false;

        }


        if (
            state.year === "Other"
        ) {

            state.year =
                otherYearInput.value
                    .trim();

        }


        return true;

    }


    /* =====================================================
       YEAR SELECTION
       ===================================================== */

    yearButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    yearButtons.forEach(
                        item => {

                            item.classList.remove(
                                "selected"
                            );

                        }
                    );


                    button.classList.add(
                        "selected"
                    );


                    state.year =
                        button.dataset.year;


                    if (
                        state.year ===
                        "Other"
                    ) {

                        otherYearInput
                            ?.classList.add(
                                "visible"
                            );

                        otherYearInput?.focus();

                    } else {

                        otherYearInput
                            ?.classList.remove(
                                "visible"
                            );

                        if (otherYearInput) {

                            otherYearInput.value =
                                "";

                        }

                    }


                    document
                        .querySelector(
                            "#yearError"
                        )
                        .textContent =
                        "";

                }
            );

        }
    );


    /* =====================================================
       STEP 2 — INTERESTS
       ===================================================== */

    interestCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    const value =
                        card.dataset.interest;


                    if (!value) return;


                    const index =
                        state.interests.indexOf(
                            value
                        );


                    if (index >= 0) {

                        state.interests.splice(
                            index,
                            1
                        );

                        card.classList.remove(
                            "selected"
                        );

                    } else {

                        state.interests.push(
                            value
                        );

                        card.classList.add(
                            "selected"
                        );

                    }


                    updateInterestCount();

                    document
                        .querySelector(
                            "#interestError"
                        )
                        .textContent =
                        "";

                }
            );

        }
    );


    function updateInterestCount() {

        if (interestCount) {

            interestCount.textContent =
                state.interests.length;

        }

    }


    function validateInterests() {

        if (
            state.interests.length < 3
        ) {

            showError(
                "interestError",
                "Pick at least 3 interests before continuing."
            );

            return false;

        }


        return true;

    }


    /* =====================================================
       STEP 3 — GOALS
       ===================================================== */

    goalCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    const value =
                        card.dataset.goal;


                    if (!value) return;


                    const index =
                        state.goals.indexOf(
                            value
                        );


                    if (index >= 0) {

                        state.goals.splice(
                            index,
                            1
                        );

                        card.classList.remove(
                            "selected"
                        );

                    } else {

                        state.goals.push(
                            value
                        );

                        card.classList.add(
                            "selected"
                        );

                    }


                    document
                        .querySelector(
                            "#goalError"
                        )
                        .textContent =
                        "";

                }
            );

        }
    );


    function validateGoals() {

        if (
            state.goals.length < 1
        ) {

            showError(
                "goalError",
                "Choose at least one thing you want from campus."
            );

            return false;

        }


        return true;

    }


    /* =====================================================
       STEP 1 → STEP 2
       ===================================================== */

    step1Continue?.addEventListener(
        "click",
        () => {

            if (!validateStepOne()) {
                return;
            }


            showStep(2);

        }
    );


    /* =====================================================
       STEP 2 → STEP 3
       ===================================================== */

    step2Continue?.addEventListener(
        "click",
        () => {

            if (!validateInterests()) {
                return;
            }


            showStep(3);

        }
    );


    /* =====================================================
       BACK
       ===================================================== */

    backButton?.addEventListener(
        "click",
        () => {

            if (state.step === 1) {

                /*
                 * Going back from step 1 means
                 * returning to login.
                 */

                window.location.href =
                    "member-login.html";

                return;

            }


            showStep(
                state.step - 1
            );

        }
    );


    /* =====================================================
       COMPLETE ONBOARDING
       ===================================================== */

    finishButton?.addEventListener(
        "click",
        () => {

            if (!validateGoals()) {
                return;
            }


            /*
             * Pull the member identity created
             * during login.
             */

            let user = null;


            try {

                user =
                    JSON.parse(
                        localStorage.getItem(
                            "vybeUser"
                        ) || "null"
                    );

            } catch {

                user = null;

            }


            if (!user) {

                window.location.href =
                    "member-login.html";

                return;

            }


            /* =================================================
               FINAL USER
               ================================================= */

            const updatedUser = {

                ...user,

                field:
                    state.field,

                institution:
                    state.institution,

                year:
                    state.year,

                interests:
                    [...state.interests],

                goals:
                    [...state.goals],

                onboardingCompleted:
                    true,

                onboardingComplete:
                    true,

                updatedAt:
                    new Date().toISOString()

            };


            /*
             * IMPORTANT:
             *
             * Home uses localStorage.
             * Therefore the completed user MUST be saved
             * back into localStorage here.
             */

            localStorage.setItem(
                "vybeUser",
                JSON.stringify(
                    updatedUser
                )
            );


            localStorage.setItem(
                "vybeMember",
                JSON.stringify(
                    updatedUser
                )
            );


            localStorage.setItem(
                "vybeRole",
                "member"
            );


            /* Remove temporary onboarding data */

            sessionStorage.removeItem(
                "vybePendingMember"
            );


            sessionStorage.removeItem(
                "vybeOnboardingState"
            );


            /* =================================================
               SUCCESS
               ================================================= */

            finishButton.disabled =
                true;

            finishButton.innerHTML =
                `
                VYBE IS READY
                <span>✦</span>
                `;


            setTimeout(
                () => {

                    window.location.replace(
                        "home.html"
                    );

                },
                350
            );

        }
    );


    /* =====================================================
       BROWSER BACK/FORWARD SAFETY
       ===================================================== */

    window.addEventListener(
        "pageshow",
        event => {

            if (event.persisted) {

                resetEverything();

            }

        }
    );


    /* =====================================================
       START CLEAN
       ===================================================== */

    resetEverything();


    console.log(
        "VYBE onboarding: fresh 3-step flow initialized."
    );

});