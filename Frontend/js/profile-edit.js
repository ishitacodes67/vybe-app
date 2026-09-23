/* =========================================================
   VYBE — PROFILE EDITOR
   Dynamically adds profile editing to Profile page.
   ========================================================= */

(function () {
    "use strict";

    const INTERESTS = [
        "Technology",
        "Design",
        "Music",
        "Sports",
        "Business",
        "Culture",
        "Social",
        "Wellness",
        "Research",
        "Startups"
    ];

    const GOALS = [
        "Networking",
        "Build technical skills",
        "Develop soft skills",
        "Explore career opportunities",
        "Personal growth",
        "Leadership",
        "Creative expression"
    ];

    function getUser() {

        if (window.VYBE_STORAGE) {
            return VYBE_STORAGE.getUser();
        }

        try {
            return JSON.parse(
                localStorage.getItem(
                    "vybeUser"
                )
            );
        } catch {
            return null;
        }
    }

    function saveUser(user) {

        if (window.VYBE_STORAGE) {
            return VYBE_STORAGE.setUser(
                user
            );
        }

        try {
            localStorage.setItem(
                "vybeUser",
                JSON.stringify(user)
            );

            return true;
        } catch {
            return false;
        }
    }

    function createEditor() {

        if (
            document.getElementById(
                "profileEditModal"
            )
        ) {
            return;
        }

        const user =
            getUser() || {};

        const modal =
            document.createElement("div");

        modal.id =
            "profileEditModal";

        modal.className =
            "profile-edit-modal";

        modal.innerHTML = `

            <div class="profile-edit-backdrop"></div>

            <div class="profile-edit-dialog">

                <button
                    class="profile-edit-close"
                    id="profileEditClose"
                    type="button"
                    aria-label="Close"
                >
                    ×
                </button>

                <span class="profile-edit-eyebrow">
                    YOUR VYBE
                </span>

                <h2>
                    Edit your profile.
                </h2>

                <p class="profile-edit-intro">
                    Keep your VYBE profile current.
                </p>

                <form id="profileEditForm">

                    <label>
                        Full name

                        <input
                            id="editName"
                            type="text"
                            value="${escapeHtml(
                                user.name || ""
                            )}"
                            required
                        >
                    </label>

                    <label>
                        Institution

                        <input
                            id="editUniversity"
                            type="text"
                            value="${escapeHtml(
                                user.university || ""
                            )}"
                        >
                    </label>

                    <label>
                        Field

                        <input
                            id="editMajor"
                            type="text"
                            value="${escapeHtml(
                                user.major || ""
                            )}"
                        >
                    </label>

                    <label>
                        Year

                        <input
                            id="editYear"
                            type="text"
                            value="${escapeHtml(
                                user.year || ""
                            )}"
                        >
                    </label>

                    <div class="edit-section">

                        <span>
                            Interests
                        </span>

                        <div
                            class="edit-choice-grid"
                            id="editInterests"
                        >
                            ${INTERESTS.map(
                                interest => `
                                    <button
                                        type="button"
                                        class="edit-choice"
                                        data-interest="${escapeHtml(
                                            interest
                                        )}"
                                    >
                                        ${escapeHtml(
                                            interest
                                        )}
                                    </button>
                                `
                            ).join("")}
                        </div>

                    </div>

                    <div class="edit-section">

                        <span>
                            Goals
                        </span>

                        <div
                            class="edit-choice-grid"
                            id="editGoals"
                        >
                            ${GOALS.map(
                                goal => `
                                    <button
                                        type="button"
                                        class="edit-choice"
                                        data-goal="${escapeHtml(
                                            goal
                                        )}"
                                    >
                                        ${escapeHtml(
                                            goal
                                        )}
                                    </button>
                                `
                            ).join("")}
                        </div>

                    </div>

                    <button
                        type="submit"
                        class="profile-save-btn"
                    >
                        Save changes →
                    </button>

                </form>

                <div
                    class="profile-edit-success"
                    id="profileEditSuccess"
                    hidden
                >
                    Profile updated ✦
                </div>

            </div>
        `;

        document.body.appendChild(modal);

        setupChoices(user);
        setupEvents();
    }

    function setupChoices(user) {

        const currentInterests =
            Array.isArray(user.interests)
                ? user.interests
                : [];

        const currentGoals =
            Array.isArray(user.goals)
                ? user.goals
                : [];

        document
            .querySelectorAll(
                "[data-interest]"
            )
            .forEach(button => {

                if (
                    currentInterests.includes(
                        button.dataset.interest
                    )
                ) {
                    button.classList.add(
                        "selected"
                    );
                }

                button.addEventListener(
                    "click",
                    () => {
                        button.classList.toggle(
                            "selected"
                        );
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-goal]"
            )
            .forEach(button => {

                if (
                    currentGoals.includes(
                        button.dataset.goal
                    )
                ) {
                    button.classList.add(
                        "selected"
                    );
                }

                button.addEventListener(
                    "click",
                    () => {
                        button.classList.toggle(
                            "selected"
                        );
                    }
                );
            });
    }

    function setupEvents() {

        const modal =
            document.getElementById(
                "profileEditModal"
            );

        const close =
            () => {
                modal.classList.remove(
                    "open"
                );
            };

        document
            .getElementById(
                "profileEditClose"
            )
            .addEventListener(
                "click",
                close
            );

        modal
            .querySelector(
                ".profile-edit-backdrop"
            )
            .addEventListener(
                "click",
                close
            );

        document
            .getElementById(
                "profileEditForm"
            )
            .addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    const user =
                        getUser() || {};

                    const interests =
                        [
                            ...document
                                .querySelectorAll(
                                    "[data-interest].selected"
                                )
                        ].map(
                            button =>
                                button.dataset
                                    .interest
                        );

                    const goals =
                        [
                            ...document
                                .querySelectorAll(
                                    "[data-goal].selected"
                                )
                        ].map(
                            button =>
                                button.dataset
                                    .goal
                        );

                    const updatedUser = {
                        ...user,

                        name:
                            document
                                .getElementById(
                                    "editName"
                                )
                                .value.trim(),

                        university:
                            document
                                .getElementById(
                                    "editUniversity"
                                )
                                .value.trim(),

                        major:
                            document
                                .getElementById(
                                    "editMajor"
                                )
                                .value.trim(),

                        year:
                            document
                                .getElementById(
                                    "editYear"
                                )
                                .value.trim(),

                        interests,
                        goals,

                        updatedAt:
                            new Date()
                                .toISOString()
                    };

                    const saved =
                        saveUser(
                            updatedUser
                        );

                    if (!saved) {
                        alert(
                            "We couldn't save your profile. Please try again."
                        );
                        return;
                    }

                    const success =
                        document.getElementById(
                            "profileEditSuccess"
                        );

                    if (success) {
                        success.hidden =
                            false;
                    }

                    setTimeout(
                        () => {
                            window.location.reload();
                        },
                        650
                    );
                }
            );
    }

    function openEditor() {

        createEditor();

        const modal =
            document.getElementById(
                "profileEditModal"
            );

        modal.classList.add("open");
    }

    function escapeHtml(value) {

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    function init() {

        createEditor();

        document
            .querySelectorAll(
                "#editProfile, .edit-profile, [data-edit-profile]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();
                        openEditor();
                    }
                );

            });

        window.VYBE_PROFILE_EDIT = {
            open: openEditor
        };
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );
})();