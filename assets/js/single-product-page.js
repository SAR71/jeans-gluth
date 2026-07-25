(function () {
    'use strict';

    const WRAPPER_SELECTOR = '.product-benefits';
    const LIST_SELECTOR = '.product-benefits_list';
    const TEXT_SELECTOR = '.elementor-icon-list-text';

    const COMPACT_CLASS = 'product-benefits_compact';
    const STACKED_CLASS = 'product-benefits_stacked';

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

        /*
         * Eine zweite Zeile ist ungefähr doppelt so hoch.
         * 1,5 verhindert Fehlmessungen durch Rundungsdifferenzen.
         */
        return actualHeight > lineHeight * 1.5;
    }

    function listHasWrappedText(listContainer) {
        const texts = Array.from(
            listContainer.querySelectorAll(TEXT_SELECTOR)
        );

        return texts.some(textIsWrapped);
    }

    function initializeBenefits(wrapper) {
        if (
            wrapper.getAttribute(
                'data-benefits-script-initialized'
            ) === 'true'
        ) {
            return;
        }

        const listContainer =
            wrapper.querySelector(LIST_SELECTOR);

        if (!listContainer) {
            console.error(
                'Product Benefits: Icon-List-Container nicht gefunden.',
                wrapper
            );

            return;
        }

        wrapper.setAttribute(
            'data-benefits-script-initialized',
            'true'
        );

        let resizeTimer = null;
        let updateRunning = false;

        function setLayout(mode) {
            wrapper.classList.toggle(
                COMPACT_CLASS,
                mode === 'compact'
            );

            wrapper.classList.toggle(
                STACKED_CLASS,
                mode === 'stacked'
            );

            wrapper.setAttribute(
                'data-benefits-layout',
                mode
            );
        }

        function finishUpdate() {
            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );

            updateRunning = false;
        }

        function updateLayout() {
            if (updateRunning) {
                return;
            }

            updateRunning = true;

            /*
             * Schritt 1:
             * Normal nebeneinander messen.
             */
            setLayout('row');

            void wrapper.offsetWidth;

            window.requestAnimationFrame(function () {
                if (!listHasWrappedText(listContainer)) {
                    setLayout('row');
                    finishUpdate();
                    return;
                }

                /*
                 * Schritt 2:
                 * Abstand reduzieren und erneut messen.
                 */
                setLayout('compact');

                void wrapper.offsetWidth;

                window.requestAnimationFrame(function () {
                    if (!listHasWrappedText(listContainer)) {
                        setLayout('compact');
                    } else {
                        /*
                         * Schritt 3:
                         * Nur wenn der Text weiterhin umbricht,
                         * Bild unter die Liste setzen.
                         */
                        setLayout('stacked');
                    }

                    finishUpdate();
                });
            });
        }

        function scheduleUpdate() {
            window.clearTimeout(resizeTimer);

            resizeTimer = window.setTimeout(
                updateLayout,
                120
            );
        }

        window.addEventListener(
            'resize',
            scheduleUpdate,
            { passive: true }
        );

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(updateLayout);
        }

        window.addEventListener(
            'load',
            updateLayout
        );

        updateLayout();
    }

    function startBenefitsLayout() {
        document
            .querySelectorAll(WRAPPER_SELECTOR)
            .forEach(initializeBenefits);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            startBenefitsLayout
        );
    } else {
        startBenefitsLayout();
    }
})();