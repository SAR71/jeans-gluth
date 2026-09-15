/* =========================================================
   Hero-Kacheln komplett klickbar 
   ========================================================= */
 document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.hero-clickable').forEach(hero => {

        hero.addEventListener('click', event => {
            const button = hero.querySelector('.elementor-button');

            if (!button || !button.href) {
                return;
            }

            if (event.target.closest('a')) {
                return;
            }

            window.location.href = button.href;
        });

    });
});