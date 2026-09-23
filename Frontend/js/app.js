/* =========================================================
   VYBE — GLOBAL APPLICATION FOUNDATION
   ========================================================= */

window.VYBE = {

    SESSION_KEY: "vybe_session",

    USER_KEY: "vybeUser",

    ROLE_KEY: "vybeRole",


    getSession() {

        try {

            const raw =
                localStorage.getItem(this.SESSION_KEY);

            return raw ? JSON.parse(raw) : {};

        } catch (error) {

            console.error(
                "VYBE: unable to read session.",
                error
            );

            return {};
        }
    },


    setSession(data = {}) {

        const current = this.getSession();

        const updated = {
            ...current,
            ...data,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(
            this.SESSION_KEY,
            JSON.stringify(updated)
        );

        return updated;
    },


    clearSession() {

        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.ROLE_KEY);
    },


    setRole(role) {

        localStorage.setItem(
            this.ROLE_KEY,
            role
        );

        return this.setSession({ role });
    },


    getRole() {

        return (
            localStorage.getItem(this.ROLE_KEY) ||
            this.getSession().role ||
            ""
        );
    },


    redirect(page) {

        if (!page) return;

        window.location.assign(page);
    },


    capitalize(value) {

        if (!value) return "";

        return value
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    },


    normalizeInstitution(value) {

        if (!value) return "";

        return value
            .trim()
            .replace(/\s+/g, " ");
    },


    saveUser(user) {

        localStorage.setItem(
            this.USER_KEY,
            JSON.stringify(user)
        );

        this.setSession({
            userId: user.id,
            role: user.role,
            name: user.name,
            institution: user.institution
        });

        return user;
    },


    getUser() {

        try {

            const raw =
                localStorage.getItem(this.USER_KEY);

            return raw ? JSON.parse(raw) : null;

        } catch {

            return null;
        }
    }
};


document.addEventListener("DOMContentLoaded", () => {

    document.body.classList.add("page-ready");

});