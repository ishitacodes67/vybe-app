/* =========================================================
   VYBE — MEMBER LOGIN
   ALWAYS START A FRESH ONBOARDING
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    const form =
        document.querySelector(
            '[data-login-role="member"]'
        );


    if (!form) return;


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = selector =>
        form.querySelector(selector);


    function clearErrors() {

        form.querySelectorAll(".field")
            .forEach(field => {

                field.classList.remove(
                    "has-error"
                );

            });


        form.querySelectorAll(".field-error")
            .forEach(error => {

                error.textContent = "";

            });

    }


    function showError(
        fieldName,
        message
    ) {

        const field =
            form.querySelector(
                `[name="${fieldName}"]`
            );


        const wrapper =
            field?.closest(".field");


        const error =
            form.querySelector(
                `[data-error-for="${fieldName}"]`
            );


        wrapper?.classList.add(
            "has-error"
        );


        if (error) {

            error.textContent =
                message;

        }

    }


    function normalizePhone(value) {

        return String(value || "")
            .replace(/\D/g, "")
            .slice(0, 10);

    }


    function normalizeText(value) {

        return String(value || "")
            .trim()
            .replace(/\s+/g, " ");

    }


    function normalizeEmail(value) {

        return String(value || "")
            .trim()
            .toLowerCase();

    }


    function validEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
            .test(email);

    }


    function validPhone(phone) {

        return /^[6-9]\d{9}$/
            .test(phone);

    }


    /* =====================================================
       PHONE INPUT
    ===================================================== */

    const phoneInput =
        $("#memberPhone");


    phoneInput?.addEventListener(
        "input",
        () => {

            phoneInput.value =
                normalizePhone(
                    phoneInput.value
                );

        }
    );


    /* =====================================================
       LOGIN
    ===================================================== */

    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            clearErrors();


            const name =
                normalizeText(
                    form.elements.name?.value
                );


            const email =
                normalizeEmail(
                    form.elements.email?.value
                );


            const phone =
                normalizePhone(
                    form.elements.phone?.value
                );


            const institution =
                normalizeText(
                    form.elements.institution?.value
                );


            let valid = true;


            /* NAME */

            if (name.length < 2) {

                showError(
                    "name",
                    "Enter your full name."
                );

                valid = false;
            }


            /* EMAIL */

            if (!validEmail(email)) {

                showError(
                    "email",
                    "Enter a valid email address."
                );

                valid = false;
            }


            /* PHONE */

            if (!validPhone(phone)) {

                showError(
                    "phone",
                    "Enter a valid 10-digit Indian mobile number."
                );

                valid = false;
            }


            /* INSTITUTION */

            if (institution.length < 2) {

                showError(
                    "institution",
                    "Enter your institution."
                );

                valid = false;
            }


            if (!valid) return;


            /* =================================================
               IMPORTANT FIX
               =================================================

               DO NOT read the old vybeUser.

               DO NOT reuse onboardingCompleted.

               DO NOT reuse interests.

               DO NOT reuse goals.

               EVERY MEMBER LOGIN STARTS A NEW ONBOARDING.
            */

            const user = {

                id:
                    `member-${Date.now()}`,

                role:
                    "member",

                name,

                email,

                phone:
                    `+91${phone}`,

                institution,

                onboardingCompleted:
                    false,

                onboardingComplete:
                    false,

                interests:
                    [],

                goals:
                    [],

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()

            };


            /* =================================================
               DESTROY OLD ONBOARDING STATE
            ================================================= */

            const onboardingKeys = [

                "vybeOnboarding",
                "vybeOnboardingUser",
                "vybe_current_user",
                "vybe_onboarding_complete",
                "vybeOnboardingState",
                "onboardingData"

            ];


            onboardingKeys.forEach(
                key => {

                    localStorage.removeItem(
                        key
                    );

                    sessionStorage.removeItem(
                        key
                    );

                }
            );


            /* =================================================
               SAVE NEW LOGIN IDENTITY
            ================================================= */

            localStorage.setItem(
                "vybeUser",
                JSON.stringify(user)
            );


            localStorage.setItem(
                "vybeMember",
                JSON.stringify(user)
            );


            localStorage.setItem(
                "vybeRole",
                "member"
            );


            /*
             * Pending user is useful if the onboarding
             * page needs to know who started the flow.
             */

            sessionStorage.setItem(
                "vybePendingMember",
                JSON.stringify(user)
            );


            /* =================================================
               RESET REGISTRATION SESSION FOR THIS LOGIN
            ================================================= */

            /*
             * Registrations belong to a member identity.
             * We DO NOT delete the global list blindly.
             *
             * Instead, every new registration created from
             * now on gets this user's ID.
             */


            /* =================================================
               BUTTON
            ================================================= */

            const button =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (button) {

                button.disabled =
                    true;

                button.innerHTML =
                    `
                    onboarding
                    <span>→</span>
                    `;

            }


            /* =================================================
               ALWAYS GO TO ONBOARDING
            ================================================= */

            setTimeout(
                () => {

                    window.location.replace(
                        "onboarding.html"
                    );

                },
                250
            );

        }
    );


    /* =====================================================
       EXTRA SAFETY
       Prevent browser restoring old form values.
    ===================================================== */

    window.addEventListener(
        "pageshow",
        () => {

            form.reset();

            clearErrors();

        }
    );


});