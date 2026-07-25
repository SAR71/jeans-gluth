(function () {
    'use strict';

    const WRAPPER_SELECTOR = '.product-benefits';
    const LIST_SELECTOR = '.product-benefits_list';
    const TEXT_SELECTOR = '.elementor-icon-list-text';

    const COMPACT_CLASS = 'product-benefits_compact';
    const STACKED_CLASS = 'product-benefits_stacked';

    /**
     * Prüft, ob ein Text mehr als eine sichtbare Zeile benötigt.
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

        /*
         * Eine zweite Zeile ist ungefähr doppelt so hoch.
         * Faktor 1,5 vermeidet Fehlmessungen durch Rundungen.
         */
        return actualHeight > lineHeight * 1.5;
    }

    /**
     * Prüft alle Texte innerhalb der Icon List.
     */
    function listHasWrappedText(listContainer) {
        const textElements = Array.from(
            listContainer.querySelectorAll(TEXT_SELECTOR)
        );

        return textElements.some(textIsWrapped);
    }

    /**
     * Initialisiert einen einzelnen Benefits-Container.
     */
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
            console.error(
                'Product Benefits: Icon-List-Container wurde nicht gefunden.',
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
         * Speichert die aktuelle Höhe der Icon-Liste
         * in einer CSS-Variable.
         *
         * Diese Variable begrenzt im Row-Layout die Bildhöhe.
         */
        function updateListHeightVariable() {
            const listHeight =
                listContainer.getBoundingClientRect().height;

            if (listHeight > 0) {
                wrapper.style.setProperty(
                    '--benefits-list-height',
                    Math.round(listHeight) + 'px'
                );
            }
        }

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
         * Beendet die Messung und markiert das Element als bereit.
         */
        function finishUpdate() {
            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );

            updateRunning = false;
        }

        /**
         * Prüft die Layouts in dieser Reihenfolge:
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
             * Schritt 1:
             * Normalen Row-Zustand herstellen.
             */
            setLayout('row');

            /*
             * Browser zur Layout-Neuberechnung zwingen.
             */
            void wrapper.offsetWidth;

            /*
             * Höhe der Icon-Liste für die Bildbegrenzung speichern.
             */
            updateListHeightVariable();

            window.requestAnimationFrame(function () {
                /*
                 * Passt alles normal nebeneinander?
                 */
                if (!listHasWrappedText(listContainer)) {
                    setLayout('row');

                    /*
                     * Nach dem finalen Layout noch einmal messen.
                     */
                    void wrapper.offsetWidth;
                    updateListHeightVariable();

                    finishUpdate();
                    return;
                }

                /*
                 * Schritt 2:
                 * Abstand auf 10 px reduzieren.
                 */
                setLayout('compact');

                void wrapper.offsetWidth;
                updateListHeightVariable();

                window.requestAnimationFrame(function () {
                    /*
                     * Passt es im kompakten Zustand?
                     */
                    if (!listHasWrappedText(listContainer)) {
                        setLayout('compact');

                        void wrapper.offsetWidth;
                        updateListHeightVariable();
                    } else {
                        /*
                         * Schritt 3:
                         * Bild unter die Icon-Liste setzen.
                         */
                        setLayout('stacked');

                        /*
                         * Die Variable bleibt gespeichert,
                         * greift im gestapelten Zustand aber nicht.
                         */
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

        /*
         * Auf echte Größenänderungen des Fensters reagieren.
         * Kein ResizeObserver, damit keine Umschaltschleife entsteht.
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
            document.fonts.ready.then(
                updateLayout
            );
        }

        /*
         * Nach vollständigem Laden der Seite erneut messen.
         */
        window.addEventListener(
            'load',
            updateLayout
        );

        /*
         * Initiale Prüfung.
         */
        updateLayout();
    }

    /**
     * Initialisiert alle passenden Container.
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