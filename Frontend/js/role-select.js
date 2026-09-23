/* =========================================================
   VYBE — ROLE SELECTION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const cards =
        document.querySelectorAll("[data-role][data-target]");


    cards.forEach(card => {

        card.addEventListener("click", () => {

            const role = card.dataset.role;
            const target = card.dataset.target;

            if (!role || !target) {
                console.error(
                    "VYBE: role card is missing role or target."
                );
                return;
            }


            cards.forEach(item => {
                item.classList.remove("role-selected");
            });


            card.classList.add("role-selected");


            if (window.VYBE) {

                VYBE.setRole(role);

                VYBE.setSession({
                    role,
                    selectedAt: new Date().toISOString()
                });

            }


            setTimeout(() => {

                window.location.assign(target);

            }, 180);

        });

    });

});