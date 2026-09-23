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
            "#eventDetails"
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
            <section class="not-found">

                <p class="eyebrow">
                    EVENT NOT FOUND
                </p>

                <h1>
                    that VYBE <em>moved.</em>
                </h1>

                <a
                    class="primary-button"
                    href="discover.html"
                >
                    Back to Discover →
                </a>

            </section>
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
            registration =>
                registration.eventId === event.id
        );


    const past =
        eventDate(event) < new Date();


    const full =
        event.registered >= event.capacity;


    const seats =
        Math.max(
            0,
            event.capacity - event.registered
        );


    container.innerHTML = `

        <section class="event-hero">

            <a
                class="back-link"
                href="discover.html"
            >
                ← back to discover
            </a>


            <div class="event-kicker">

                <span>
                    ${escapeHTML(event.category)}
                </span>

                <span>
                    ${
                        past
                            ? "COMPLETED"
                            : full
                                ? "FULL"
                                : "UPCOMING"
                    }
                </span>

            </div>


            <h1>
                ${escapeHTML(event.title)}
            </h1>


            <p class="event-lead">
                ${escapeHTML(event.description)}
            </p>


            <div class="event-tags">

                ${event.tags
                    .map(
                        tag =>
                            `<span>#${escapeHTML(tag)}</span>`
                    )
                    .join("")}

            </div>

        </section>


        <section class="event-layout">

            <div class="event-main">

                <div class="detail-grid">

                    <div>
                        <small>DATE</small>
                        <strong>
                            ${formatEventDate(event.date)}
                        </strong>
                    </div>

                    <div>
                        <small>TIME</small>
                        <strong>
                            ${escapeHTML(event.time)}
                        </strong>
                    </div>

                    <div>
                        <small>VENUE</small>
                        <strong>
                            ${escapeHTML(event.venue)}
                        </strong>
                    </div>

                    <div>
                        <small>INSTITUTION</small>
                        <strong>
                            ${escapeHTML(event.institution)}
                        </strong>
                    </div>

                </div>


                <div class="about-event">

                    <p class="eyebrow">
                        ABOUT THIS VYBE
                    </p>

                    <p>
                        ${escapeHTML(event.description)}
                    </p>

                </div>

            </div>


            <aside class="event-aside">

                <div class="host-card">

                    <small>
                        HOSTED BY
                    </small>

                    <h2>
                        ${escapeHTML(event.organizer)}
                        ${event.organizerVerified ? "✓" : ""}
                    </h2>

                    <p>
                        Verified campus organizer
                    </p>

                </div>


                <div class="seat-card">

                    <span>
                        ${
                            past
                                ? "Event completed"
                                : `${seats} seats remaining`
                        }
                    </span>

                    <strong>
                        ${formatPrice(event.price)}
                    </strong>

                    <small>
                        ${
                            event.registrationMode === "approval"
                                ? "Registration requires host approval."
                                : "First-come registration."
                        }
                    </small>

                </div>


                ${
                    existing

                        ? `
                            <div class="registered-box">

                                <strong>
                                    ${
                                        existing.status === "pending"
                                            ? "Request sent"
                                            : "You are registered"
                                    }
                                </strong>

                                <span>
                                    ${
                                        existing.status === "pending"
                                            ? "Waiting for host approval."
                                            : "See this event in your Tracker."
                                    }
                                </span>

                                <a href="tracker.html">
                                    Open Tracker →
                                </a>

                            </div>
                        `

                        : `
                            <button
                                class="primary-button full-button"
                                id="registerButton"
                                ${past || full ? "disabled" : ""}
                            >
                                ${
                                    past
                                        ? "REGISTRATION CLOSED"
                                        : full
                                            ? "EVENT FULL"
                                            : "JOIN THIS VYBE →"
                                }
                            </button>
                        `
                }

            </aside>

        </section>
    `;


    document
        .querySelector("#registerButton")
        ?.addEventListener(
            "click",
            () => {

                window.location.href =
                    `registration.html?id=${encodeURIComponent(
                        event.id
                    )}`;

            }
        );


    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }

});