/* =========================================================
   VYBE — AUTHENTICATION UTILITIES
   ========================================================= */

window.VYBEAuth = {

    validateEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
            email
        );
    },


    validatePhone(phone) {

        return /^[6-9]\d{9}$/.test(
            phone
        );
    },


    normalizeName(name) {

        return name
            .trim()
            .replace(/\s+/g, " ");
    },


    normalizeEmail(email) {

        return email
            .trim()
            .toLowerCase();
    },


    normalizePhone(phone) {

        return phone
            .replace(/\D/g, "")
            .slice(0, 10);
    },


    normalizeInstitution(institution) {

        return institution
            .trim()
            .replace(/\s+/g, " ");
    },


    clearErrors(form) {

        form.querySelectorAll(".field")
            .forEach(field => {
                field.classList.remove("has-error");
            });


        form.querySelectorAll(".field-error")
            .forEach(error => {
                error.textContent = "";
            });
    },


    showError(form, fieldName, message) {

        const field =
            form.querySelector(
                `[name="${fieldName}"]`
            )?.closest(".field");


        const error =
            form.querySelector(
                `[data-error-for="${fieldName}"]`
            );


        if (field) {
            field.classList.add("has-error");
        }


        if (error) {
            error.textContent = message;
        }
    },


    saveIdentity(data) {

        const existing =
            window.VYBE?.getUser?.() || {};


        const user = {
            ...existing,

            ...data,

            updatedAt:
                new Date().toISOString()
        };


        if (window.VYBE) {
            VYBE.saveUser(user);
        } else {

            localStorage.setItem(
                "vybeUser",
                JSON.stringify(user)
            );
        }


        return user;
    }

};