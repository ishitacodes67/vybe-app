document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const user =
        JSON.parse(
            localStorage.getItem("vybeUser") || "null"
        );

    if (!user?.onboardingCompleted) {
        window.location.href = "member-login.html";
        return;
    }


    const registrations =
        JSON.parse(
            localStorage.getItem(
                "vybeRegistrations"
            ) || "[]"
        );


    const resolved =
        registrations
            .map(registration => ({
                ...registration,
                event:
                    getEventById(
                        registration.eventId
                    )
            }))
            .filter(
                item =>
                    item.event
            );


    const upcoming =
        resolved
            .filter(
                item =>
                    eventDate(item.event) >= new Date()
            )
            .sort(
                (a, b) =>
                    a.event.date.localeCompare(
                        b.event.date
                    )
            );


    const past =
        resolved
            .filter(
                item =>
                    eventDate(item.event) < new Date()
            )
            .sort(
                (a, b) =>
                    b.event.date.localeCompare(
                        a.event.date
                    )
            );


    const xp =
        Number(
            user.xp ||
            (
                resolved.length * 40 +
                past.length * 60
            )
        );


    document.getElementById(
        "heroXP"
    ).textContent = xp;


    document.getElementById(
        "monthXP"
    ).textContent =
        `+${Math.max(xp, 0)}`;


    const progress =
        Math.min(
            (xp % 1000) / 10,
            100
        );


    document.getElementById(
        "xpProgress"
    ).style.width =
        `${progress || 18}%`;


    const stats =
        document.getElementById(
            "trackerStats"
        );


    stats.innerHTML = `

        <article class="tracker-stat">

            <strong>
                ${resolved.length}
            </strong>

            <span>
                events registered
            </span>

        </article>


        <article class="tracker-stat">

            <strong>
                ${upcoming.length}
            </strong>

            <span>
                up next
            </span>

        </article>


        <article class="tracker-stat">

            <strong>
                ${user.interests?.length || 0}
            </strong>

            <span>
                interests
            </span>

        </article>


        <article class="tracker-stat">

            <strong>
                ${xp}
            </strong>

            <span>
                total XP
            </span>

        </article>

    `;


    const streak =
        calculateStreak(
            resolved
        );


    document.getElementById(
        "streakNumber"
    ).textContent = streak;


    document.getElementById(
        "upcomingCount"
    ).textContent =
        `${upcoming.length} ${
            upcoming.length === 1
                ? "event"
                : "events"
        }`;


    renderUpcoming();
    renderActivity();


    function renderUpcoming() {

        const container =
            document.getElementById(
                "upcomingEvents"
            );


        if (!upcoming.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <h3>
                        your calendar is suspiciously empty.
                    </h3>

                    <p>
                        Go find something worth
                        leaving your room for.
                    </p>

                    <a
                        class="primary-button"
                        href="discover.html"
                    >
                        Discover events →
                    </a>

                </div>

            `;

            return;
        }


        container.innerHTML =
            upcoming
                .map(
                    registration => {

                        const event =
                            registration.event;

                        return `

                            <article
                                class="tracker-card"
                                data-event-id="${event.id}"
                                tabindex="0"
                            >

                                <div class="tracker-card-image">

                                    <img
                                        src="${imageFor(
                                            event.category
                                        )}"
                                        alt="${escapeHTML(
                                            event.title
                                        )}"
                                    >

                                </div>


                                <div class="tracker-card-info">

                                    <span class="tracker-status">
                                        ${
                                            registration.status ===
                                            "pending"
                                                ? "REQUEST PENDING"
                                                : "CONFIRMED"
                                        }
                                    </span>

                                    <h3>
                                        ${escapeHTML(
                                            event.title
                                        )}
                                    </h3>

                                    <p>
                                        ${formatEventDate(
                                            event.date
                                        )}
                                        ·
                                        ${escapeHTML(
                                            event.time
                                        )}
                                        ·
                                        ${escapeHTML(
                                            event.venue
                                        )}
                                    </p>

                                </div>


                                <a
                                    href="event-details.html?id=${encodeURIComponent(
                                        event.id
                                    )}"
                                >
                                    VIEW →
                                </a>

                            </article>

                        `;
                    }
                )
                .join("");


        container
            .querySelectorAll(
                "[data-event-id]"
            )
            .forEach(card => {

                card.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target.closest("a")
                        ) {
                            return;
                        }

                        window.location.href =
                            `event-details.html?id=${encodeURIComponent(
                                card.dataset.eventId
                            )}`;

                    }
                );

            });
    }


    function renderActivity() {

        const container =
            document.getElementById(
                "activityList"
            );


        if (!past.length) {

            container.innerHTML = `

                <article class="activity-item">

                    <span class="activity-icon">
                        ✦
                    </span>

                    <div>

                        <strong>
                            Your VYBE story starts here.
                        </strong>

                        <p>
                            Attend your first event
                            and this space comes alive.
                        </p>

                    </div>

                    <small>
                        +20 XP
                    </small>

                </article>

            `;

            return;
        }


        container.innerHTML =
            past
                .map(
                    registration => `

                        <article
                            class="activity-item"
                        >

                            <span class="activity-icon">
                                ✓
                            </span>

                            <div>

                                <strong>
                                    Joined
                                    ${escapeHTML(
                                        registration.event.title
                                    )}
                                </strong>

                                <p>
                                    ${formatEventDate(
                                        registration.event.date
                                    )}
                                </p>

                            </div>

                            <small>
                                +60 XP
                            </small>

                        </article>

                    `
                )
                .join("");
    }


    function calculateStreak(items) {

        if (!items.length) {
            return 0;
        }

        const weeks =
            new Set();

        items.forEach(item => {

            const date =
                new Date(
                    item.registeredAt ||
                    item.event.date
                );

            if (Number.isNaN(date.getTime())) {
                return;
            }

            const firstDay =
                new Date(date);

            firstDay.setDate(
                date.getDate() -
                date.getDay()
            );

            weeks.add(
                firstDay
                    .toISOString()
                    .slice(0, 10)
            );

        });

        return weeks.size;
    }


    function imageFor(category) {

        const images = {

            Tech:
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=85",

            Design:
                "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=85",

            Music:
                "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=85",

            Sports:
                "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=85",

            Business:
                "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=85",

            Culture:
                "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=85",

            Social:
                "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=85",

            Wellness:
                "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=85"

        };

        return images[category] || images.Culture;
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