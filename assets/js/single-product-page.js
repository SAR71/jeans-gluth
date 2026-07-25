(function () {
    'use strict';

    const WRAPPER_SELECTOR = '.product-benefits';
    const LIST_SELECTOR = '.product-benefits_list';
    const IMAGE_SELECTOR = '.product-benefits_image';
    const TEXT_SELECTOR = '.elementor-icon-list-text';

    const SHRINK_1_CLASS = 'product-benefits_shrink-1';
    const SHRINK_2_CLASS = 'product-benefits_shrink-2';
    const STACKED_CLASS = 'product-benefits_stacked';

    /**
     * Prüft, ob ein Text sichtbar auf mehrere Zeilen umbricht.
     */
    function textIsWrapped(textElement) {
        const style = window.getComputedStyle(textElement);

        let lineHeight = parseFloat(style.lineHeight);

        if (!Number.isFinite(lineHeight)) {
            const fontSize =
                parseFloat(style.fontSize) || 18;

            lineHeight = fontSize * 1.35;
        }

        const actualHeight =
            textElement.getBoundingClientRect().height;

        return actualHeight > lineHeight * 1.5;
    }

    /**
     * Prüft alle Texte der Icon List.
     */
    function listHasWrappedText(listContainer) {
        const textElements = Array.from(
            listContainer.querySelectorAll(TEXT_SELECTOR)
        );

        return textElements.some(textIsWrapped);
    }

    /**
     * Initialisiert einen Product-Benefits-Bereich.
     */
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

        const imageContainer =
            wrapper.querySelector(IMAGE_SELECTOR);

        const image =
            imageContainer?.querySelector('img');

        if (
            !listContainer ||
            !imageContainer ||
            !image
        ) {
            console.error(
                'Product Benefits: Benötigte Elemente fehlen.',
                {
                    wrapper,
                    listContainer,
                    imageContainer,
                    image
                }
            );

            /*
             * Nicht dauerhaft unsichtbar lassen,
             * falls ein Element fehlt.
             */
            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );

            return;
        }

        wrapper.setAttribute(
            'data-benefits-script-initialized',
            'true'
        );

        /*
         * Inline-Höhen aus älteren Script-Versionen entfernen.
         */
        image.style.removeProperty('height');
        image.style.removeProperty('max-height');

        imageContainer.style.removeProperty('height');
        imageContainer.style.removeProperty('max-height');

        let updateRunning = false;
        let resizeTimer = null;

        /**
         * Setzt exakt einen Layoutzustand.
         */
        function setLayout(mode) {
            wrapper.classList.toggle(
                SHRINK_1_CLASS,
                mode === 'shrink-1'
            );

            wrapper.classList.toggle(
                SHRINK_2_CLASS,
                mode === 'shrink-2'
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
         * Browser zur Neuberechnung des Layouts zwingen.
         */
        function forceLayout() {
            void wrapper.offsetWidth;
        }

        /**
         * Einen Layoutzustand setzen und nach dem Rendern prüfen.
         */
        function testLayout(mode, callback) {
            setLayout(mode);
            forceLayout();

            window.requestAnimationFrame(function () {
                callback(
                    listHasWrappedText(listContainer)
                );
            });
        }

        /**
         * Prüfreihenfolge:
         *
         * 1. 190 px Bild / normale Schrift
         * 2. 160 px Bild
         * 3. 130 px Bild / 18 px Schrift / 10 px Listenabstand
         * 4. Bild unter die Liste
         */
        function updateLayout() {
            if (updateRunning) {
                return;
            }

            updateRunning = true;

            testLayout('row', function (rowWrapped) {
                if (!rowWrapped) {
                    finishUpdate();
                    return;
                }

                testLayout(
                    'shrink-1',
                    function (shrink1Wrapped) {
                        if (!shrink1Wrapped) {
                            finishUpdate();
                            return;
                        }

                        testLayout(
                            'shrink-2',
                            function (shrink2Wrapped) {
                                if (!shrink2Wrapped) {
                                    finishUpdate();
                                    return;
                                }

                                setLayout('stacked');
                                finishUpdate();
                            }
                        );
                    }
                );
            });
        }

        /**
         * Messung abschließen.
         */
        function finishUpdate() {
            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );

            updateRunning = false;
        }

        /**
         * Größenänderungen entprellen.
         */
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

        /*
         * Nach dem Laden der Webfonts neu messen.
         */
        if (
            document.fonts &&
            document.fonts.ready
        ) {
            document.fonts.ready.then(
                updateLayout
            );
        }

        /*
         * Nach dem Laden des Bildes neu messen.
         */
        if (!image.complete) {
            image.addEventListener(
                'load',
                updateLayout,
                { once: true }
            );
        }

        window.addEventListener(
            'load',
            updateLayout
        );

        updateLayout();
    }

    /**
     * Alle Benefits-Bereiche starten.
     */
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