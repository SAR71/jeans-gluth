(function () {
    'use strict';

    const WRAPPER_SELECTOR = '.product-benefits';
    const LIST_SELECTOR = '.product-benefits_list';
    const TEXT_SELECTOR = '.elementor-icon-list-text';
    const STACKED_CLASS = 'product-benefits_stacked';

    function initProductBenefits(wrapper) {
        const listContainer = wrapper.querySelector(
            LIST_SELECTOR
        );

        if (!listContainer) {
            return;
        }

        let resizeTimer = null;
        let updateRunning = false;

        function textIsWrapped(textElement) {
            const style = window.getComputedStyle(textElement);

            let lineHeight = parseFloat(style.lineHeight);

            if (!Number.isFinite(lineHeight)) {
                const fontSize =
                    parseFloat(style.fontSize) || 16;

                lineHeight = fontSize * 1.2;
            }

            const actualHeight =
                textElement.getBoundingClientRect().height;

            return actualHeight > lineHeight * 1.5;
        }

        function hasWrappedText() {
            const texts = Array.from(
                listContainer.querySelectorAll(
                    TEXT_SELECTOR
                )
            );

            return texts.some(textIsWrapped);
        }

        function updateLayout() {
            if (updateRunning) {
                return;
            }

            updateRunning = true;

            /*
             * Zuerst immer den normalen Zustand herstellen.
             * Dadurch wird geprüft, ob beide Container wirklich
             * nebeneinander passen.
             */
            wrapper.classList.remove(STACKED_CLASS);

            /*
             * Browser zur Neuberechnung des Layouts zwingen.
             */
            void wrapper.offsetWidth;

            window.requestAnimationFrame(function () {
                const mustStack = hasWrappedText();

                wrapper.classList.toggle(
                    STACKED_CLASS,
                    mustStack
                );

                wrapper.setAttribute(
                    'data-benefits-layout',
                    mustStack ? 'stacked' : 'row'
                );

                updateRunning = false;
            });
        }

        function scheduleUpdate() {
            window.clearTimeout(resizeTimer);

            resizeTimer = window.setTimeout(
                updateLayout,
                120
            );
        }

        /*
         * Beim Ändern der Fensterbreite erneut prüfen.
         * Kein ResizeObserver, damit keine Umschaltschleife entsteht.
         */
        window.addEventListener(
            'resize',
            scheduleUpdate,
            { passive: true }
        );

        /*
         * Nach dem Laden der Schriftarten erneut prüfen.
         */
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(updateLayout);
        }

        /*
         * Nach dem vollständigen Laden der Seite prüfen.
         */
        window.addEventListener(
            'load',
            updateLayout
        );

        updateLayout();
    }

    function startProductBenefits() {
        document
            .querySelectorAll(WRAPPER_SELECTOR)
            .forEach(initProductBenefits);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            startProductBenefits
        );
    } else {
        startProductBenefits();
    }
})();