/* =========================================================
   VYBE — VIX
   Functional frontend prototype
   ========================================================= */

(function () {

    "use strict";


    function getUser() {

        if (
            window.VYBE_STORAGE &&
            typeof VYBE_STORAGE.getUser === "function"
        ) {
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


    function getEvents() {

        return Array.isArray(
            window.VYBE_EVENTS
        )
            ? window.VYBE_EVENTS
            : [];
    }


    function getRegistrations() {

        if (
            window.VYBE_STORAGE &&
            typeof VYBE_STORAGE.getRegistrations ===
                "function"
        ) {

            return VYBE_STORAGE
                .getRegistrations();

        }

        try {

            return JSON.parse(
                localStorage.getItem(
                    "vybeRegistrations"
                )
            ) || [];

        } catch {

            return [];

        }
    }


    function getUpcomingEvents() {

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        return getEvents()
            .filter(event => {

                const date =
                    new Date(
                        `${event.date}T12:00:00`
                    );

                return (
                    !Number.isNaN(
                        date.getTime()
                    ) &&
                    date >= today
                );

            })
            .sort(
                (a, b) =>
                    a.date.localeCompare(
                        b.date
                    )
            );

    }


    function getRecommendedEvents() {

        const user =
            getUser();

        const events =
            getUpcomingEvents();

        const registrations =
            getRegistrations();

        const registeredIds =
            new Set(
                registrations.map(
                    item =>
                        item.eventId
                )
            );


        if (!user) {

            return events
                .slice(0, 3);

        }


        const interests =
            Array.isArray(
                user.interests
            )
                ? user.interests
                    .map(
                        item =>
                            String(item)
                                .toLowerCase()
                    )
                : [];


        const goals =
            Array.isArray(
                user.goals
            )
                ? user.goals
                    .map(
                        item =>
                            String(item)
                                .toLowerCase()
                    )
                : [];


        return events

            .filter(
                event =>
                    !registeredIds.has(
                        event.id
                    )
            )

            .map(event => {

                const searchable =
                    `
                    ${event.title}
                    ${event.category}
                    ${(event.tags || []).join(" ")}
                    ${event.description}
                    ${event.organizer}
                    `
                        .toLowerCase();


                let score = 0;


                interests.forEach(
                    interest => {

                        if (
                            searchable.includes(
                                interest
                            )
                        ) {

                            score += 5;

                        }

                    }
                );


                goals.forEach(
                    goal => {

                        goal
                            .split(/\s+/)
                            .forEach(
                                term => {

                                    if (
                                        term.length > 3 &&
                                        searchable.includes(
                                            term
                                        )
                                    ) {

                                        score += 2;

                                    }

                                }
                            );

                    }
                );


                if (
                    event.registered >
                    event.capacity * .70
                ) {

                    score += 1;

                }


                return {
                    event,
                    score
                };

            })

            .sort(
                (a, b) =>
                    b.score - a.score
            )

            .slice(0, 4)

            .map(
                item =>
                    item.event
            );

    }


    function buildMessage() {

        const recommendations =
            getRecommendedEvents();


        if (!recommendations.length) {

            return {
                title: "okay... 👀",
                message:
                    "You've explored most of your current matches. Discover the full campus feed."
            };

        }


        return {

            title:
                "Vix found something ✦",

            message:
                `you might actually like ${recommendations[0].title}.`

        };

    }


    function createPanel() {

        if (
            document.getElementById(
                "vixPanel"
            )
        ) {

            return;

        }


        const panel =
            document.createElement(
                "aside"
            );


        panel.id =
            "vixPanel";

        panel.className =
            "vix-panel";


        panel.innerHTML = `

            <div
                class="vix-panel-backdrop"
            ></div>


            <div
                class="vix-panel-content"
                role="dialog"
                aria-modal="true"
                aria-label="Vix AI"
            >

                <button
                    class="vix-close"
                    id="vixClose"
                    type="button"
                    aria-label="Close Vix"
                >
                    ×
                </button>


                <div class="vix-panel-icon">
                    ✦
                </div>


                <span class="vix-panel-eyebrow">
                    VIX AI
                </span>


                <h2>
                    your slightly chaotic
                    campus AI friend.
                </h2>


                <p class="vix-panel-intro">
                    Ask me what to attend,
                    what's happening soon,
                    or what matches your interests.
                </p>


                <div
                    class="vix-response"
                    id="vixResponse"
                ></div>


                <div class="vix-suggestions">

                    <button
                        type="button"
                        data-vix-question="recommend"
                    >
                        ✦ What should I attend?
                    </button>


                    <button
                        type="button"
                        data-vix-question="upcoming"
                    >
                        ⚡ What's happening soon?
                    </button>


                    <button
                        type="button"
                        data-vix-question="interests"
                    >
                        ♡ Show my matches
                    </button>

                </div>


                <a
                    href="discover.html"
                    class="vix-discover-link"
                >
                    Explore all events →
                </a>

            </div>

        `;


        document.body.appendChild(
            panel
        );


        document
            .getElementById("vixClose")
            .addEventListener(
                "click",
                closePanel
            );


        panel
            .querySelector(
                ".vix-panel-backdrop"
            )
            .addEventListener(
                "click",
                closePanel
            );


        panel
            .querySelectorAll(
                "[data-vix-question]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            showAnswer(
                                button.dataset
                                    .vixQuestion
                            );

                        }
                    );

                }
            );

    }


    function showAnswer(type) {

        const response =
            document.getElementById(
                "vixResponse"
            );


        if (!response) {
            return;
        }


        const user =
            getUser();


        if (
            type ===
            "recommend"
        ) {

            const events =
                getRecommendedEvents();


            response.innerHTML = `

                <strong>
                    okay, here's my shortlist 👀
                </strong>

                ${
                    events.length
                        ? `
                            <div
                                class="vix-event-list"
                            >

                                ${
                                    events
                                        .map(
                                            event => `

                                                <button
                                                    type="button"
                                                    class="vix-event-option"
                                                    data-event-id="${event.id}"
                                                >

                                                    <span>
                                                        ${escapeHTML(
                                                            event.title
                                                        )}
                                                    </span>

                                                    <small>
                                                        ${formatDate(
                                                            event.date
                                                        )}
                                                    </small>

                                                </button>

                                            `
                                        )
                                        .join("")
                                }

                            </div>
                        `
                        : `
                            <p>
                                Nothing is matching
                                right now. Try Discover.
                            </p>
                        `
                }

            `;


            response
                .querySelectorAll(
                    "[data-event-id]"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                const eventId =
                                    button.dataset
                                        .eventId;


                                if (
                                    window.VYBE_STORAGE
                                ) {

                                    const event =
                                        getEvents()
                                            .find(
                                                item =>
                                                    item.id ===
                                                    eventId
                                            );

                                    if (event) {

                                        VYBE_STORAGE
                                            .setSelectedEvent(
                                                event
                                            );

                                    }

                                }


                                window.location.href =
                                    `event-details.html?id=${encodeURIComponent(
                                        eventId
                                    )}`;

                            }
                        );

                    }
                );


            return;

        }


        if (
            type ===
            "upcoming"
        ) {

            const events =
                getUpcomingEvents()
                    .slice(0, 4);


            response.innerHTML = `

                <strong>
                    here's what's coming up.
                </strong>

                ${
                    events.length
                        ? events
                            .map(
                                event => `

                                    <div
                                        class="vix-mini-event"
                                    >

                                        <span>
                                            ${escapeHTML(
                                                event.title
                                            )}
                                        </span>

                                        <small>
                                            ${formatDate(
                                                event.date
                                            )}
                                        </small>

                                    </div>

                                `
                            )
                            .join("")
                        : `
                            <p>
                                The calendar is quiet
                                for now.
                            </p>
                        `
                }

            `;


            return;

        }


        if (
            type ===
            "interests"
        ) {

            const interests =
                user &&
                Array.isArray(
                    user.interests
                )
                    ? user.interests
                    : [];


            response.innerHTML = `

                <strong>
                    your VYBE is giving...
                </strong>

                ${
                    interests.length
                        ? `
                            <div
                                class="vix-interest-list"
                            >

                                ${
                                    interests
                                        .map(
                                            interest =>
                                                `<span>${escapeHTML(
                                                    interest
                                                )}</span>`
                                        )
                                        .join("")
                                }

                            </div>
                        `
                        : `
                            <p>
                                Complete onboarding
                                so I can learn your vibe.
                            </p>
                        `
                }

            `;

        }

    }


    function openPanel() {

        createPanel();


        const panel =
            document.getElementById(
                "vixPanel"
            );


        panel.classList.add(
            "open"
        );


        document.body.classList.add(
            "vix-open"
        );


        showAnswer(
            "recommend"
        );

    }


    function closePanel() {

        const panel =
            document.getElementById(
                "vixPanel"
            );


        if (!panel) {
            return;
        }


        panel.classList.remove(
            "open"
        );


        document.body.classList.remove(
            "vix-open"
        );

    }


    function init() {

        createPanel();


        document
            .querySelectorAll(
                "[data-vix-open]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        openPanel
                    );

                }
            );


        const message =
            buildMessage();


        const vixMessage =
            document.getElementById(
                "vixMessage"
            );


        if (vixMessage) {

            vixMessage.textContent =
                message.message;

        }

    }


    function formatDate(date) {

        return new Date(
            `${date}T12:00:00`
        ).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short"
            }
        );

    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    window.VYBE_VIX = {

        open:
            openPanel,

        close:
            closePanel,

        recommend:
            getRecommendedEvents,

        refresh:
            buildMessage

    };


    document.addEventListener(
        "DOMContentLoaded",
        init
    );

})();