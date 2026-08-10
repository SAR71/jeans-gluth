// LastChanged: 2026-08-10
/* =========================================================
   JEANS GLUTH – WISHLIST STATUS
   WoodMart 8.5+
   ========================================================= */

(function () {

    function isWishlistActive(button) {
        if (!button) return false;

        const textElement = button.querySelector('.wd-action-text');

        if (!textElement) return false;

        const text = textElement.textContent
            .trim()
            .toLowerCase();

        /*
         * WoodMart kennzeichnet den Zustand bei uns nicht mehr
         * zuverlässig über "added".
         *
         * Deshalb verwenden wir den tatsächlich ausgegebenen
         * Button-Text.
         */
        return (
            text.includes('von wunschliste entfernen') ||
            text.includes('remove from wishlist')
        );
    }


    function syncButton(button) {
        if (!button) return;

        button.classList.toggle(
            'jg-wishlist-active',
            isWishlistActive(button)
        );
    }


    function syncAllButtons() {
        document
            .querySelectorAll('.wd-wishlist-btn')
            .forEach(syncButton);
    }


    /* Beim Laden */
    document.addEventListener('DOMContentLoaded', function () {
        syncAllButtons();
    });


    /* Back/Forward Cache */
    window.addEventListener('pageshow', function () {
        syncAllButtons();
    });


    /*
     * Sofortiges visuelles Feedback beim Klick.
     * Wir schalten unsere Klasse direkt um.
     */
    document.addEventListener('click', function (event) {

        const link = event.target.closest('.wd-wishlist-btn a');

        if (!link) return;

        const button = link.closest('.wd-wishlist-btn');

        if (!button) return;

        button.classList.toggle('jg-wishlist-active');


        /*
         * WoodMart arbeitet per AJAX.
         * Danach nochmal mit dem tatsächlichen Zustand
         * synchronisieren.
         */
        setTimeout(syncAllButtons, 300);
        setTimeout(syncAllButtons, 800);
        setTimeout(syncAllButtons, 1500);

    }, true);


    /*
     * WoodMart kann Produkte/Button-Inhalte durch AJAX ersetzen.
     * Deshalb beobachten wir Änderungen am DOM.
     */
    let rafPending = false;

    const observer = new MutationObserver(function () {

        if (rafPending) return;

        rafPending = true;

        requestAnimationFrame(function () {
            rafPending = false;
            syncAllButtons();
        });

    });


    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

})();
