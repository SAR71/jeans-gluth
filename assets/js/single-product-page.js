(function () {
    'use strict';

    const WRAPPER_SELECTOR = '.product-benefits';
    const LIST_SELECTOR = '.product-benefits_list';
    const TEXT_SELECTOR = '.elementor-icon-list-text';

    const COMPACT_CLASS = 'product-benefits_compact';
    const STACKED_CLASS = 'product-benefits_stacked';

    /**
     * Prüft, ob das Textelement tatsächlich mehr als
     * eine sichtbare Textzeile enthält.
     */
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

    /**
     * Prüft alle Texte der Elementor Icon List.
     */
    function listHasWrappedText(listContainer) {
        const textElements = Array.from(
            listContainer.querySelectorAll(TEXT_SELECTOR)
        );

        return textElements.some(textIsWrapped);
    }

    function initializeBenefits(wrapper) {
        /*
         * Mehrfache Initialisierung verhindern.
         */
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
            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );

            console.error(
                'Product Benefits: Icon-List-Container fehlt.',
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

        /**
         * Setzt einen eindeutigen Layoutzustand.
         */
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

        /**
         * Prüft die Zustände in der gewünschten Reihenfolge:
         *
         * 1. Normal nebeneinander
         * 2. Kompakt nebeneinander
         * 3. Untereinander
         */
        function updateLayout() {
            if (updateRunning) {
                return;
            }

            updateRunning = true;

            /*
             * Zunächst den normalen Zustand herstellen.
             */
            setLayout('row');

            /*
             * Browser zur sofortigen Layoutberechnung zwingen.
             */
            void wrapper.offsetWidth;

            window.requestAnimationFrame(function () {
                /*
                 * Passt alles normal nebeneinander?
                 */
                if (!listHasWrappedText(listContainer)) {
                    setLayout('row');

                    wrapper.setAttribute(
                        'data-benefits-ready',
                        'true'
                    );

                    updateRunning = false;
                    return;
                }

                /*
                 * Erster Textumbruch:
                 * Bild weiter nach rechts schieben und Abstand reduzieren.
                 */
                setLayout('compact');

                void wrapper.offsetWidth;

                window.requestAnimationFrame(function () {
                    /*
                     * Passt es im kompakten Zustand?
                     */
                    if (!listHasWrappedText(listContainer)) {
                        setLayout('compact');
                    } else {
                        /*
                         * Auch kompakt nicht ausreichend:
                         * Bild unter die Icon-Liste setzen.
                         */
                        setLayout('stacked');
                    }

                    wrapper.setAttribute(
                        'data-benefits-ready',
                        'true'
                    );

                    updateRunning = false;
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

        /*
         * Nur auf echte Größenänderungen des Browserfensters
         * reagieren. Kein ResizeObserver, damit keine
         * Umschaltschleife entsteht.
         */
        window.addEventListener(
            'resize',
            scheduleUpdate,
            { passive: true }
        );

        /*
         * Nach dem Laden der Schriftarten erneut messen.
         */
        if (
            document.fonts &&
            document.fonts.ready
        ) {
            document.fonts.ready.then(updateLayout);
        }

        /*
         * Nach vollständigem Laden der Seite erneut messen.
         */
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