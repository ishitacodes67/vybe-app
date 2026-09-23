/* =========================================================
   VYBE — SMART CUSTOM CURSOR
   Phase 5 Revision
   ========================================================= */

(function () {
    "use strict";

    const isTouch =
        window.matchMedia(
            "(hover: none), (pointer: coarse)"
        ).matches;

    if (isTouch) {
        return;
    }

    function initCursor() {

        if (
            document.querySelector(
                ".vybe-cursor"
            )
        ) {
            return;
        }

        const cursor =
            document.createElement("div");

        cursor.className =
            "vybe-cursor";

        const label =
            document.createElement("div");

        label.className =
            "vybe-cursor-label";

        document.body.appendChild(
            cursor
        );

        document.body.appendChild(
            label
        );

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;

        let cursorX = mouseX;
        let cursorY = mouseY;

        let active = false;

        document.addEventListener(
            "mousemove",
            event => {

                mouseX =
                    event.clientX;

                mouseY =
                    event.clientY;

                active = true;

                cursor.classList.add(
                    "visible"
                );
            },
            { passive: true }
        );

        function animate() {

            cursorX +=
                (mouseX - cursorX) *
                0.18;

            cursorY +=
                (mouseY - cursorY) *
                0.18;

            cursor.style.left =
                `${cursorX}px`;

            cursor.style.top =
                `${cursorY}px`;

            label.style.left =
                `${mouseX + 24}px`;

            label.style.top =
                `${mouseY + 24}px`;

            requestAnimationFrame(
                animate
            );
        }

        animate();

        document.addEventListener(
            "mouseover",
            event => {

                const target =
                    event.target.closest(
                        "a, button, input, select, textarea, [role='button'], .event-card, .category-chip"
                    );

                if (!target) return;

                cursor.classList.add(
                    "hover"
                );

                const text =
                    target.dataset.cursor ||
                    target.getAttribute(
                        "aria-label"
                    ) ||
                    target.getAttribute(
                        "title"
                    );

                if (text) {

                    label.textContent =
                        text;

                    label.classList.add(
                        "show"
                    );
                }
            }
        );

        document.addEventListener(
            "mouseout",
            event => {

                const target =
                    event.target.closest(
                        "a, button, input, select, textarea, [role='button'], .event-card, .category-chip"
                    );

                if (!target) return;

                if (
                    event.relatedTarget &&
                    target.contains(
                        event.relatedTarget
                    )
                ) {
                    return;
                }

                cursor.classList.remove(
                    "hover"
                );

                label.classList.remove(
                    "show"
                );
            }
        );

        document.addEventListener(
            "mousedown",
            () => {
                cursor.classList.add(
                    "click"
                );
            }
        );

        document.addEventListener(
            "mouseup",
            () => {
                cursor.classList.remove(
                    "click"
                );
            }
        );

        document.addEventListener(
            "mouseleave",
            () => {
                cursor.classList.remove(
                    "visible"
                );
            }
        );

        document.addEventListener(
            "mouseenter",
            () => {
                if (active) {
                    cursor.classList.add(
                        "visible"
                    );
                }
            }
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initCursor
        );
    } else {
        initCursor();
    }
})();