/* =========================================================
   VYBE VOICE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        "use strict";


        /* =================================================
           AUTH
        ================================================= */

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


        const onboardingDone =
            user &&
            (
                user.onboardingCompleted === true ||
                user.onboardingComplete === true
            );


        if (
            !user ||
            !onboardingDone
        ) {

            window.location.replace(
                "member-login.html"
            );

            return;

        }


        /* =================================================
           ELEMENTS
        ================================================= */

        const container =
            document.querySelector(
                "#voiceFormContainer"
            );


        const cards =
            document.querySelectorAll(
                ".voice-card"
            );


        if (!container) return;


        /* =================================================
           CARD EVENTS
        ================================================= */

        cards.forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        openForm(
                            card.dataset.type
                        );

                    }
                );

            }
        );


        /* =================================================
           EVENTS
           IMPORTANT:
           events-data.js is now loaded by voice.html
        ================================================= */

        function getAllEvents() {

            if (
                !Array.isArray(
                    window.VYBE_EVENTS
                )
            ) {

                return [];

            }


            return [
                ...window.VYBE_EVENTS
            ];

        }


        /* =================================================
           REGISTRATIONS
        ================================================= */

        function getRegistrations() {

            try {

                const registrations =
                    JSON.parse(
                        localStorage.getItem(
                            "vybeRegistrations"
                        ) || "[]"
                    );


                return Array.isArray(
                    registrations
                )
                    ? registrations
                    : [];

            } catch {

                return [];

            }

        }


        /* =================================================
           EVENT ACCESS FOR VOICE
        =================================================

           A pending registration is STILL a valid
           event relationship.

           Voice must NOT say:

           "you cannot select this event"

           just because the organizer hasn't approved it.
        */

        function getVoiceEvents() {

            const events =
                getAllEvents();


            const registrations =
                getRegistrations();


            const registeredMap =
                new Map();


            registrations
                .forEach(
                    registration => {

                        registeredMap.set(
                            registration.eventId,
                            registration
                        );

                    }
                );


            return events.map(
                event => {

                    const registration =
                        registeredMap.get(
                            event.id
                        );


                    return {

                        ...event,

                        userRegistration:
                            registration || null,

                        registrationStatus:
                            registration?.status ||
                            null

                    };

                }
            );

        }


        /* =================================================
           OPEN FORM
        ================================================= */

        function openForm(type) {

            const voiceEvents =
                getVoiceEvents();


            const titles = {

                feedback:
                    "how did it feel?",

                report:
                    "what needs attention?",

                suggestion:
                    "what should VYBE build next?"

            };


            const labels = {

                feedback:
                    "EVENT FEEDBACK",

                report:
                    "REPORT SOMETHING",

                suggestion:
                    "SUGGEST A VYBE"

            };


            container.innerHTML = `

                <form
                    class="voice-form"
                    id="voiceForm"
                    data-type="${type}"
                >


                    <button
                        type="button"
                        class="close-form"
                        id="closeVoice"
                        aria-label="Close"
                    >
                        ×
                    </button>


                    <p class="eyebrow">
                        ${labels[type]}
                    </p>


                    <h2>
                        ${titles[type]}
                    </h2>


                    ${
                        type === "feedback"
                            ? feedbackFields(
                                voiceEvents
                            )
                            : ""
                    }


                    ${
                        type === "report"
                            ? reportFields(
                                voiceEvents
                            )
                            : ""
                    }


                    ${
                        type === "suggestion"
                            ? suggestionFields()
                            : ""
                    }


                    <label>

                        YOUR MESSAGE

                        <textarea
                            name="message"
                            rows="5"
                            required
                            placeholder="${
                                type === "feedback"
                                    ? "Tell us what worked, what didn't, and how it felt."
                                    : type === "report"
                                        ? "Tell us what happened. Include useful details."
                                        : "If VYBE could build anything for your campus, what should it be?"
                            }"
                        ></textarea>

                    </label>


                    ${
                        type === "feedback"
                            ? ratingField()
                            : ""
                    }


                    <button
                        class="voice-submit"
                        type="submit"
                    >
                        SEND TO VYBE →
                    </button>

                </form>

            `;


            container.scrollIntoView({
                behavior:
                    "smooth",
                block:
                    "center"
            });


            document
                .querySelector(
                    "#closeVoice"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        container.innerHTML =
                            "";

                    }
                );


            document
                .querySelector(
                    "#voiceForm"
                )
                ?.addEventListener(
                    "submit",
                    handleSubmit
                );

        }


        /* =================================================
           FEEDBACK FIELDS
        ================================================= */

        function feedbackFields(
            events
        ) {

            const options =
                events
                    .map(
                        event => {

                            let statusText =
                                "";


                            if (
                                event.userRegistration
                                    ?.status ===
                                "pending"
                            ) {

                                statusText =
                                    " · approval pending";

                            } else if (
                                event.userRegistration
                                    ?.status ===
                                "confirmed"
                            ) {

                                statusText =
                                    " · registered";

                            }


                            return `
                                <option
                                    value="${escapeHTML(
                                        event.id
                                    )}"
                                >
                                    ${escapeHTML(
                                        event.title
                                    )}
                                    ${statusText}
                                </option>
                            `;

                        }
                    )
                    .join("");


            return `

                <label>

                    EVENT

                    <select
                        name="eventId"
                        required
                    >

                        <option value="">
                            Select an event
                        </option>

                        ${options}

                    </select>


                    <small class="voice-helper">
                        You can choose an event even if
                        your registration is still awaiting approval.
                    </small>

                </label>

            `;

        }


        /* =================================================
           REPORT FIELDS
        ================================================= */

        function reportFields(
            events
        ) {

            const options =
                events
                    .map(
                        event => {

                            return `
                                <option
                                    value="${escapeHTML(
                                        event.id
                                    )}"
                                >
                                    ${escapeHTML(
                                        event.title
                                    )}
                                </option>
                            `;

                        }
                    )
                    .join("");


            return `

                <label>

                    EVENT

                    <select
                        name="eventId"
                    >

                        <option value="">
                            General campus issue
                        </option>

                        ${options}

                    </select>

                </label>


                <label>

                    TYPE

                    <select
                        name="reportType"
                        required
                    >

                        <option value="">
                            Select issue type
                        </option>

                        <option value="event">
                            Event issue
                        </option>

                        <option value="organizer">
                            Organizer issue
                        </option>

                        <option value="venue">
                            Venue / facilities
                        </option>

                        <option value="safety">
                            Safety concern
                        </option>

                        <option value="other">
                            Other
                        </option>

                    </select>

                </label>

            `;

        }


        /* =================================================
           SUGGESTION FIELDS
        ================================================= */

        function suggestionFields() {

            return `

                <label>

                    VYBE CATEGORY

                    <select
                        name="suggestionType"
                        required
                    >

                        <option value="">
                            What are you suggesting?
                        </option>

                        <option value="event">
                            New event
                        </option>

                        <option value="feature">
                            New feature
                        </option>

                        <option value="club">
                            New club / community
                        </option>

                        <option value="campus">
                            Campus improvement
                        </option>

                    </select>

                </label>

            `;

        }


        /* =================================================
           RATING
           NO STARS.
           NO DEFAULT SELECTION.
        ================================================= */

        function ratingField() {

            const ratings = [

                {
                    value: 1,
                    label: "Not for me"
                },

                {
                    value: 2,
                    label: "Could improve"
                },

                {
                    value: 3,
                    label: "It was okay"
                },

                {
                    value: 4,
                    label: "Really good"
                },

                {
                    value: 5,
                    label: "Loved it"
                }

            ];


            return `

                <fieldset
                    class="rating-field"
                >

                    <legend>
                        HOW DID IT FEEL?
                    </legend>


                    <div
                        class="rating-options"
                    >

                        ${ratings
                            .map(
                                rating => `
                                    <label
                                        class="rating-option"
                                    >

                                        <input
                                            type="radio"
                                            name="rating"
                                            value="${rating.value}"
                                        >

                                        <span
                                            class="rating-number"
                                        >
                                            ${rating.value}
                                        </span>

                                        <span
                                            class="rating-label"
                                        >
                                            ${rating.label}
                                        </span>

                                    </label>
                                `
                            )
                            .join("")}

                    </div>

                </fieldset>

            `;

        }


        /* =================================================
           SUBMIT
        ================================================= */

        function handleSubmit(
            event
        ) {

            event.preventDefault();


            const form =
                event.currentTarget;


            const formData =
                new FormData(form);


            const data =
                Object.fromEntries(
                    formData.entries()
                );


            /* ---------------------------------------------
               BASIC VALIDATION
            --------------------------------------------- */

            if (
                form.dataset.type ===
                "feedback"
            ) {

                if (!data.eventId) {

                    return;

                }

            }


            if (
                form.dataset.type ===
                "feedback" &&
                !data.rating
            ) {

                alert(
                    "Choose how the experience felt before sending feedback."
                );

                return;

            }


            if (
                !data.message?.trim()
            ) {

                return;

            }


            /* ---------------------------------------------
               SAVE GENERIC VOICE ENTRY
            --------------------------------------------- */

            let allVoice = [];


            try {

                allVoice =
                    JSON.parse(
                        localStorage.getItem(
                            "vybeVoice"
                        ) || "[]"
                    );

            } catch {

                allVoice = [];

            }


            allVoice.push({

                id:
                    `voice-${Date.now()}`,

                type:
                    form.dataset.type,

                ...data,

                userId:
                    user.id,

                userEmail:
                    user.email,

                createdAt:
                    new Date().toISOString()

            });


            localStorage.setItem(
                "vybeVoice",
                JSON.stringify(
                    allVoice
                )
            );


            /* ---------------------------------------------
               FEEDBACK ALSO GOES TO vybeFeedback
            --------------------------------------------- */

            if (
                form.dataset.type ===
                "feedback"
            ) {

                let feedback = [];


                try {

                    feedback =
                        JSON.parse(
                            localStorage.getItem(
                                "vybeFeedback"
                            ) || "[]"
                        );

                } catch {

                    feedback = [];

                }


                feedback.push({

                    id:
                        `feedback-${Date.now()}`,

                    eventId:
                        data.eventId,

                    rating:
                        Number(
                            data.rating
                        ),

                    message:
                        data.message,

                    userId:
                        user.id,

                    userEmail:
                        user.email,

                    createdAt:
                        new Date().toISOString()

                });


                localStorage.setItem(
                    "vybeFeedback",
                    JSON.stringify(
                        feedback
                    )
                );

            }


            showSuccess(
                form.dataset.type
            );

        }


        /* =================================================
           SUCCESS
        ================================================= */

        function showSuccess(
            type
        ) {

            const copy = {

                feedback: {
                    kicker:
                        "FEEDBACK RECEIVED",
                    title:
                        "heard.",
                    body:
                        "Thanks for helping VYBE understand what campus experiences actually feel like."
                },

                report: {
                    kicker:
                        "REPORT RECEIVED",
                    title:
                        "we've got it.",
                    body:
                        "Your report has been recorded and can be reviewed by the campus team."
                },

                suggestion: {
                    kicker:
                        "IDEA RECEIVED",
                    title:
                        "interesting.",
                    body:
                        "That idea is now part of the conversation about where VYBE goes next."
                }

            };


            const content =
                copy[type];


            container.innerHTML = `

                <div
                    class="voice-success"
                >

                    <div
                        class="success-symbol"
                    >
                        ✦
                    </div>


                    <p class="eyebrow">
                        ${content.kicker}
                    </p>


                    <h2>
                        ${content.title}
                    </h2>


                    <p>
                        ${content.body}
                    </p>


                    <button
                        type="button"
                        class="secondary-button"
                        id="voiceAgain"
                    >
                        Say something else
                    </button>

                </div>

            `;


            document
                .querySelector(
                    "#voiceAgain"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        container.innerHTML =
                            "";

                    }
                );

        }


        /* =================================================
           ESCAPE HTML
        ================================================= */

        function escapeHTML(
            value
        ) {

            return String(
                value ?? ""
            )
                .replaceAll(
                    "&",
                    "&amp;"
                )
                .replaceAll(
                    "<",
                    "&lt;"
                )
                .replaceAll(
                    ">",
                    "&gt;"
                )
                .replaceAll(
                    '"',
                    "&quot;"
                )
                .replaceAll(
                    "'",
                    "&#039;"
                );

        }

    }
);