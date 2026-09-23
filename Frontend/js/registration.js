document.addEventListener("DOMContentLoaded", () => {

    const user =
        JSON.parse(
            localStorage.getItem("vybeUser") || "null"
        );


    if (!user?.onboardingCompleted) {

        window.location.href =
            "member-login.html";

        return;
    }


    const container =
        document.querySelector(
            "#registrationContent"
        );


    const params =
        new URLSearchParams(
            window.location.search
        );


    const eventId =
        params.get("id");


    const event =
        getEventById(eventId);


    if (!event) {

        container.innerHTML = `
            <div class="registration-card">

                <p class="eyebrow">
                    NO EVENT
                </p>

                <h1>
                    We could not find that event.
                </h1>

                <a
                    class="primary-button"
                    href="discover.html"
                >
                    Back to Discover →
                </a>

            </div>
        `;

        return;
    }


    const registrations =
        JSON.parse(
            localStorage.getItem(
                "vybeRegistrations"
            ) || "[]"
        );


    const existing =
        registrations.find(
            item =>
                item.eventId === eventId
        );


    if (existing) {

        container.innerHTML =
            success(existing.status);

        return;
    }


    const past =
        eventDate(event) < new Date();

    const full =
        event.registered >= event.capacity;


    container.innerHTML = `

        <div class="registration-card">

            <a
                class="back-link"
                href="event-details.html?id=${encodeURIComponent(eventId)}"
            >
                ← event details
            </a>


            <p class="eyebrow">
                REGISTRATION
            </p>


            <h1>
                ready to
                <em>show up?</em>
            </h1>


            <div class="summary">

                <div>
                    <small>EVENT</small>
                    <strong>
                        ${escapeHTML(event.title)}
                    </strong>
                </div>

                <div>
                    <small>WHEN</small>
                    <strong>
                        ${formatEventDate(event.date)}
                        ·
                        ${escapeHTML(event.time)}
                    </strong>
                </div>

                <div>
                    <small>WHERE</small>
                    <strong>
                        ${escapeHTML(event.venue)}
                    </strong>
                </div>

                <div>
                    <small>ENTRY</small>
                    <strong>
                        ${formatPrice(event.price)}
                    </strong>
                </div>

            </div>


            <div class="notice">

                ${
                    event.registrationMode === "approval"
                        ? "Your request will be sent to the host for approval."
                        : "Your registration will be confirmed immediately."
                }

            </div>


            <button
                id="confirmRegistration"
                class="primary-button"
                ${past || full ? "disabled" : ""}
            >
                ${
                    past
                        ? "REGISTRATION CLOSED"
                        : full
                            ? "EVENT FULL"
                            : "CONFIRM REGISTRATION →"
                }
            </button>


            <p class="fine-print">

                By continuing, you are registering as
                ${escapeHTML(user.name)}
                from
                ${escapeHTML(user.institution)}.

            </p>

        </div>
    `;


    document
        .querySelector("#confirmRegistration")
        ?.addEventListener(
            "click",
            () => {

                const next =
                    JSON.parse(
                        localStorage.getItem(
                            "vybeRegistrations"
                        ) || "[]"
                    );


                const status =
                    event.registrationMode === "approval"
                        ? "pending"
                        : "confirmed";


                next.push({

                    id:
                        `reg-${Date.now()}`,

                    eventId:
                        event.id,

                    eventTitle:
                        event.title,

                    status,

                    registeredAt:
                        new Date().toISOString(),

                    userId:
                        user.id ||
                        user.email

                });


                localStorage.setItem(
                    "vybeRegistrations",
                    JSON.stringify(next)
                );


                container.innerHTML =
                    success(status);

            }
        );


    function success(status) {

        return `

            <div class="registration-card success-card">

                <div class="success-icon">
                    ✦
                </div>

                <p class="eyebrow">
                    ${
                        status === "pending"
                            ? "REQUEST SENT"
                            : "YOU ARE IN"
                    }
                </p>


                <h1>

                    ${
                        status === "pending"
                            ? "your spot is <em>requested.</em>"
                            : "see you <em>there.</em>"
                    }

                </h1>


                <p>

                    ${
                        status === "pending"
                            ? "The host will review your request. You can track the status from your Tracker."
                            : "Your registration is saved. We have added this event to your Tracker."
                    }

                </p>


                <div class="summary">

                    <div>
                        <small>EVENT</small>
                        <strong>
                            ${escapeHTML(event.title)}
                        </strong>
                    </div>

                    <div>
                        <small>DATE</small>
                        <strong>
                            ${formatEventDate(event.date)}
                        </strong>
                    </div>

                </div>


                <div class="button-row">

                    <a
                        class="primary-button"
                        href="tracker.html"
                    >
                        Open Tracker →
                    </a>

                    <a
                        class="secondary-button"
                        href="discover.html"
                    >
                        Keep Discovering
                    </a>

                </div>

            </div>
        `;

    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }

});