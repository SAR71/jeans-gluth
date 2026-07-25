(function () {
    'use strict';

    const WRAPPER_SELECTOR = '.product-benefits';
    const LIST_SELECTOR = '.product-benefits_list';
    const IMAGE_SELECTOR = '.product-benefits_image';
    const TEXT_SELECTOR = '.elementor-icon-list-text';

    const COMPACT_CLASS = 'product-benefits_compact';
    const STACKED_CLASS = 'product-benefits_stacked';

    /**
     * Prüft, ob ein Text mehr als eine Zeile benötigt.
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
     * Prüft alle Texte der Icon List.
     */
    function listHasWrappedText(listContainer) {
        const textElements = Array.from(
            listContainer.querySelectorAll(TEXT_SELECTOR)
        );

        return textElements.some(textIsWrapped);
    }

    /**
     * Initialisiert einen Product-Benefits-Container.
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

            return;
        }

        wrapper.setAttribute(
            'data-benefits-script-initialized',
            'true'
        );

        let resizeTimer = null;
        let updateRunning = false;

        /**
         * Aktiviert genau einen Layoutmodus.
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
         * Begrenzt das Bild direkt auf die Höhe
         * des Icon-List-Containers.
         */
        function limitImageToListHeight() {
            const listHeight =
                listContainer.getBoundingClientRect().height;

            if (listHeight <= 0) {
                return;
            }

            const roundedHeight =
                Math.floor(listHeight);

            /*
             * Direkt am Bild mit !important setzen,
             * damit Elementor die Begrenzung nicht überschreibt.
             */
            image.style.setProperty(
                'max-height',
                roundedHeight + 'px',
                'important'
            );

            image.style.setProperty(
                'height',
                'auto',
                'important'
            );

            image.style.setProperty(
                'width',
                'auto',
                'important'
            );

            image.style.setProperty(
                'max-width',
                '100%',
                'important'
            );

            image.style.setProperty(
                'object-fit',
                'contain',
                'important'
            );

            /*
             * Auch der Bildcontainer selbst wird auf die
             * Listenhöhe begrenzt und darin zentriert.
             */
            imageContainer.style.setProperty(
                'max-height',
                roundedHeight + 'px',
                'important'
            );

            imageContainer.style.setProperty(
                'height',
                roundedHeight + 'px',
                'important'
            );
        }

        /**
         * Entfernt die Höhenbegrenzung im gestapelten Zustand.
         */
        function removeImageHeightLimit() {
            image.style.removeProperty('max-height');

            imageContainer.style.removeProperty('max-height');
            imageContainer.style.removeProperty('height');
        }

        /**
         * Markiert die Messung als abgeschlossen.
         */
        function finishUpdate() {
            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );

            updateRunning = false;
        }

        /**
         * Prüft:
         *
         * 1. normal nebeneinander
         * 2. kompakt nebeneinander
         * 3. untereinander
         */
        function updateLayout() {
            if (updateRunning) {
                return;
            }

            updateRunning = true;

            /*
             * Für die Messung zuerst wieder Row herstellen.
             */
            removeImageHeightLimit();
            setLayout('row');

            void wrapper.offsetWidth;

            /*
             * Bild auf die tatsächliche Listenhöhe begrenzen.
             */
            limitImageToListHeight();

            void wrapper.offsetWidth;

            window.requestAnimationFrame(function () {
                if (!listHasWrappedText(listContainer)) {
                    setLayout('row');
                    limitImageToListHeight();
                    finishUpdate();
                    return;
                }

                /*
                 * Zweiter Versuch mit kleinerem Abstand.
                 */
                setLayout('compact');

                void wrapper.offsetWidth;
                limitImageToListHeight();

                window.requestAnimationFrame(function () {
                    if (!listHasWrappedText(listContainer)) {
                        setLayout('compact');
                        limitImageToListHeight();
                    } else {
                        /*
                         * Untereinander:
                         * Höhenbegrenzung durch Liste entfernen.
                         */
                        setLayout('stacked');
                        removeImageHeightLimit();
                    }

                    finishUpdate();
                });
            });
        }

        /**
         * Entprellte Layoutprüfung.
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

        if (
            document.fonts &&
            document.fonts.ready
        ) {
            document.fonts.ready.then(
                updateLayout
            );
        }

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
     * Alle Benefits-Container starten.
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