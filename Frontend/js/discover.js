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


    const grid =
        document.getElementById("discoverGrid");

    const search =
        document.getElementById("searchInput");

    const resultCount =
        document.getElementById("resultCount");

    const emptyState =
        document.getElementById("emptyState");

    const spotlight =
        document.getElementById(
            "discoverSpotlight"
        );

    let activeFilter = "All";


    const params =
        new URLSearchParams(
            window.location.search
        );

    const categoryFromURL =
        params.get("category");

    if (categoryFromURL) {

        const matchingFilter =
            document.querySelector(
                `.filter[data-filter="${CSS.escape(
                    categoryFromURL
                )}"]`
            );

        if (matchingFilter) {

            document
                .querySelectorAll(".filter")
                .forEach(
                    button =>
                        button.classList.remove(
                            "active"
                        )
                );

            matchingFilter.classList.add("active");

            activeFilter = categoryFromURL;
        }
    }


    renderSpotlight();
    render();


    document
        .querySelectorAll(".filter")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".filter")
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add("active");

                    activeFilter =
                        button.dataset.filter;

                    render();
                }
            );
        });


    search.addEventListener(
        "input",
        render
    );


    function renderSpotlight() {

        const events =
            [...VYBE_EVENTS]
                .filter(
                    event =>
                        eventDate(event) >= new Date()
                )
                .sort(
                    (a, b) =>
                        b.registered - a.registered
                );

        const event =
            events[0];

        if (!event) {
            spotlight.innerHTML = "";
            return;
        }

        spotlight.innerHTML = `

            <article
                class="spotlight-card"
                data-event-id="${event.id}"
                tabindex="0"
            >

                <img
                    src="${imageFor(event.category)}"
                    alt="${escapeHTML(event.title)}"
                >

                <div class="spotlight-content">

                    <span class="category">
                        ${escapeHTML(event.category)}
                    </span>

                    <h3>
                        ${escapeHTML(event.title)}
                    </h3>

                    <p>
                        ${escapeHTML(event.description)}
                    </p>

                    <div class="spotlight-bottom">

                        <small>
                            👀 ${event.registered}
                            people already going
                        </small>

                        <button
                            type="button"
                            data-spotlight-open
                        >
                            EXPLORE →
                        </button>

                    </div>

                </div>

            </article>
        `;

        const card =
            spotlight.querySelector(
                "[data-event-id]"
            );

        const open = () => {

            window.location.href =
                `event-details.html?id=${encodeURIComponent(
                    event.id
                )}`;
        };

        card.addEventListener(
            "click",
            open
        );

        card.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    open();
                }

            }
        );

        card
            .querySelector(
                "[data-spotlight-open]"
            )
            .addEventListener(
                "click",
                event => {

                    event.stopPropagation();
                    open();

                }
            );
    }


    function render() {

        const query =
            search.value
                .trim()
                .toLowerCase();


        const events =
            VYBE_EVENTS
                .filter(event => {

                    const matchesFilter =
                        activeFilter === "All" ||
                        event.category === activeFilter;

                    const searchable =
                        `
                        ${event.title}
                        ${event.category}
                        ${event.tags.join(" ")}
                        ${event.venue}
                        ${event.organizer}
                        ${event.description}
                        `
                            .toLowerCase();

                    return (
                        matchesFilter &&
                        (
                            !query ||
                            searchable.includes(query)
                        )
                    );
                })
                .sort(
                    (a, b) =>
                        a.date.localeCompare(
                            b.date
                        )
                );


        resultCount.textContent =
            `${events.length} ${
                events.length === 1
                    ? "event"
                    : "events"
            }`;


        emptyState.hidden =
            events.length !== 0;


        grid.innerHTML =
            events
                .map(renderCard)
                .join("");


        bindCards();
    }


    function renderCard(event) {

        const past =
            eventDate(event) < new Date();

        const seats =
            Math.max(
                event.capacity -
                event.registered,
                0
            );

        const almostFull =
            seats > 0 &&
            seats <=
                Math.ceil(
                    event.capacity * .20
                );

        return `

            <article
                class="discover-card ${
                    past ? "is-past" : ""
                }"
                data-event-id="${event.id}"
                tabindex="0"
            >

                <div class="discover-card-image">

                    <img
                        src="${imageFor(event.category)}"
                        alt="${escapeHTML(event.title)}"
                    >

                    <span class="card-floating-tag">
                        ${escapeHTML(
                            event.category
                        )}
                    </span>

                    <span class="card-price">
                        ${
                            past
                                ? "CLOSED"
                                : formatPrice(
                                    event.price
                                )
                        }
                    </span>

                </div>


                <div class="discover-card-body">

                    <h3>
                        ${escapeHTML(event.title)}
                    </h3>

                    <p>
                        ${escapeHTML(event.description)}
                    </p>


                    <div class="card-social">

                        ${
                            almostFull
                                ? `<span>⚡ ALMOST FULL</span>`
                                : ""
                        }

                        <span>
                            👀 ${event.registered} going
                        </span>

                        ${
                            event.organizerVerified
                                ? `<span>✓ VERIFIED HOST</span>`
                                : ""
                        }

                    </div>


                    <div class="card-footer">

                        <div class="card-footer-meta">

                            <span>
                                ${formatEventDate(
                                    event.date
                                )}
                            </span>

                            <span>
                                ${escapeHTML(
                                    event.time
                                )}
                                ·
                                ${escapeHTML(
                                    event.venue
                                )}
                            </span>

                        </div>

                        <a
                            href="event-details.html?id=${encodeURIComponent(
                                event.id
                            )}"
                        >
                            ${
                                past
                                    ? "VIEW"
                                    : "EXPLORE"
                            }
                            →
                        </a>

                    </div>

                </div>

            </article>
        `;
    }


    function bindCards() {

        grid
            .querySelectorAll(
                "[data-event-id]"
            )
            .forEach(card => {

                const open = () => {

                    window.location.href =
                        `event-details.html?id=${encodeURIComponent(
                            card.dataset.eventId
                        )}`;
                };

                card.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target.closest("a")
                        ) {
                            return;
                        }

                        open();
                    }
                );

                card.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {
                            event.preventDefault();
                            open();
                        }
                    }
                );
            });
    }


    function imageFor(category) {

        const images = {

            Tech:
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85",

            Design:
                "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1000&q=85",

            Music:
                "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85",

            Sports:
                "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85",

            Business:
                "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=85",

            Culture:
                "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",

            Social:
                "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=85",

            Wellness:
                "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1000&q=85"

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