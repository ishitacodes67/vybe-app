document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const user = JSON.parse(
        localStorage.getItem("vybeUser") || "null"
    );

    if (!user?.onboardingCompleted) {
        window.location.href = "member-login.html";
        return;
    }

    const firstName =
        (user.name || "there")
            .trim()
            .split(/\s+/)[0];

    const hour = new Date().getHours();

    let greeting = "good evening";

    if (hour < 12) {
        greeting = "good morning";
    } else if (hour < 17) {
        greeting = "good afternoon";
    }

    document.getElementById("greeting").textContent =
        `${greeting}, ${firstName}.`;

    renderInterests(user);
    renderFeatured(user);
    renderTrending();
    renderDropped();


    function renderInterests(user) {

        const container =
            document.getElementById("interestTags");

        const interests =
            Array.isArray(user.interests)
                ? user.interests
                : [];

        container.innerHTML =
            interests.length
                ? interests
                    .slice(0, 5)
                    .map(
                        interest =>
                            `<span>${escapeHTML(
                                interest
                            )}</span>`
                    )
                    .join("")
                : `<span>your vibe is still loading...</span>`;
    }


    function renderFeatured(user) {

        const container =
            document.getElementById("featuredEvents");

        const events =
            getRecommendedEvents(user)
                .filter(
                    event =>
                        eventDate(event) >= new Date()
                )
                .slice(0, 2);

        if (!events.length) {
            container.innerHTML = `
                <article class="featured-event">
                    <img
                        src="${imageFor("Culture")}"
                        alt="Campus"
                    >

                    <div class="featured-content">

                        <div class="featured-top">
                            <span class="featured-category">
                                VYBE
                            </span>
                        </div>

                        <h3>
                            your campus is waiting.
                        </h3>

                        <p>
                            Explore what's happening
                            across VYBE.
                        </p>

                        <div class="featured-bottom">
                            <small>
                                Explore the full calendar
                            </small>

                            <button
                                type="button"
                                onclick="location.href='discover.html'"
                            >
                                EXPLORE →
                            </button>
                        </div>

                    </div>
                </article>
            `;

            return;
        }

        container.innerHTML =
            events
                .map(renderFeaturedCard)
                .join("");

        bindEventCards(container);
    }


    function renderFeaturedCard(event) {

        const seats =
            Math.max(
                event.capacity - event.registered,
                0
            );

        const going =
            Math.max(
                event.registered,
                0
            );

        return `
            <article
                class="featured-event"
                data-event-id="${event.id}"
                tabindex="0"
            >

                <img
                    src="${imageFor(event.category)}"
                    alt="${escapeHTML(event.title)}"
                >

                <div class="featured-content">

                    <div class="featured-top">

                        <span class="featured-category">
                            ${escapeHTML(event.category)}
                        </span>

                        <span class="featured-price">
                            ${formatPrice(event.price)}
                        </span>

                    </div>

                    <h3>
                        ${escapeHTML(event.title)}
                    </h3>

                    <p>
                        ${escapeHTML(event.description)}
                    </p>

                    <div class="featured-bottom">

                        <small>
                            👀 ${going} people going ·
                            ${seats} seats left
                        </small>

                        <button
                            type="button"
                            data-open-event="${event.id}"
                        >
                            JOIN THE VYBE →
                        </button>

                    </div>

                </div>

            </article>
        `;
    }


    function renderTrending() {

        const container =
            document.getElementById("trendingEvents");

        const events =
            [...VYBE_EVENTS]
                .filter(
                    event =>
                        eventDate(event) >= new Date()
                )
                .sort(
                    (a, b) =>
                        b.registered - a.registered
                )
                .slice(0, 3);

        container.innerHTML =
            events
                .map(renderMiniCard)
                .join("");

        bindEventCards(container);
    }


    function renderMiniCard(event) {

        return `
            <article
                class="mini-event"
                data-event-id="${event.id}"
                tabindex="0"
            >

                <div class="mini-event-image">

                    <img
                        src="${imageFor(event.category)}"
                        alt="${escapeHTML(event.title)}"
                    >

                </div>

                <div class="mini-event-content">

                    <div class="mini-event-meta">

                        <span>
                            ${escapeHTML(event.category)}
                        </span>

                        <strong>
                            ${formatPrice(event.price)}
                        </strong>

                    </div>

                    <h3>
                        ${escapeHTML(event.title)}
                    </h3>

                    <div class="mini-event-foot">

                        <span>
                            ${formatEventDate(event.date)}
                        </span>

                        <span>
                            👀 ${event.registered} going
                        </span>

                    </div>

                </div>

            </article>
        `;
    }


    function renderDropped() {

        const container =
            document.getElementById("droppedEvents");

        const events =
            [...VYBE_EVENTS]
                .filter(
                    event =>
                        eventDate(event) >= new Date()
                )
                .sort(
                    (a, b) =>
                        a.date.localeCompare(b.date)
                )
                .slice(0, 4);

        container.innerHTML =
            events
                .map(
                    event => `
                        <article
                            class="dropped-card"
                            data-event-id="${event.id}"
                            tabindex="0"
                        >

                            <img
                                src="${imageFor(event.category)}"
                                alt="${escapeHTML(event.title)}"
                            >

                            <div class="dropped-content">

                                <span class="category">
                                    ${escapeHTML(
                                        event.category
                                    )}
                                </span>

                                <h3>
                                    ${escapeHTML(
                                        event.title
                                    )}
                                </h3>

                                <small>
                                    ${formatEventDate(
                                        event.date
                                    )}
                                    ·
                                    ${escapeHTML(
                                        event.time
                                    )}
                                </small>

                            </div>

                        </article>
                    `
                )
                .join("");

        bindEventCards(container);
    }


    function bindEventCards(container) {

        container
            .querySelectorAll("[data-event-id]")
            .forEach(card => {

                const open = () => {

                    window.location.href =
                        `event-details.html?id=${encodeURIComponent(
                            card.dataset.eventId
                        )}`;

                };

                card.addEventListener("click", open);

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

                const button =
                    card.querySelector(
                        "[data-open-event]"
                    );

                if (button) {

                    button.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();
                            open();

                        }
                    );
                }

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

        return (
            images[category] ||
            images.Culture
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

});