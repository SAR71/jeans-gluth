// LastChanged: 2026-08-10
/* =========================================================
   JEANS GLUTH – WISHLIST STATUS
   ========================================================= */

(() => {

    function syncWishlistButton(button) {
        if (!button) return;

        const text = button
            .querySelector('.wd-action-text')
            ?.textContent
            .trim()
            .toLowerCase() || '';

        const active =
            text.includes('von wunschliste entfernen') ||
            text.includes('remove from wishlist');

        button.classList.toggle('jg-wishlist-active', active);
    }


    function syncAllWishlistButtons() {
        document
            .querySelectorAll('.wd-wishlist-btn')
            .forEach(syncWishlistButton);
    }


    /* Initial */
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            syncAllWishlistButtons
        );
    } else {
        syncAllWishlistButtons();
    }


    /* Klick: sofort optisch umschalten */
    document.addEventListener('click', (event) => {

        const link = event.target.closest('.wd-wishlist-btn a');
        if (!link) return;

        const button = link.closest('.wd-wishlist-btn');
        if (!button) return;

        button.classList.toggle('jg-wishlist-active');

        /* nach WoodMart-AJAX wieder mit echtem Zustand abgleichen */
        setTimeout(syncAllWishlistButtons, 250);
        setTimeout(syncAllWishlistButtons, 750);
        setTimeout(syncAllWishlistButtons, 1500);

    }, true);


    /*
     * WoodMart tauscht Inhalte per AJAX aus.
     * Änderungen deshalb automatisch erkennen.
     */
    const observer = new MutationObserver(() => {
        syncAllWishlistButtons();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });


    window.addEventListener(
        'pageshow',
        syncAllWishlistButtons
    );

})();