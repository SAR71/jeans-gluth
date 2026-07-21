/* ===========================
   Produkt Benefits Layout
   =========================== */
(function () {
    'use strict';

    const WRAPPER_SELECTOR = '.product-benefits';
    const LIST_SELECTOR = '.product-benefits_list';
    const IMAGE_SELECTOR = '.product-benefits_image';
    const TEXT_SELECTOR = '.elementor-icon-list-text';
    const STACKED_CLASS = 'product-benefits_stacked';

    function initializeProductBenefits(wrapper) {
        const listContainer = wrapper.querySelector(
            LIST_SELECTOR
        );

        const imageContainer = wrapper.querySelector(
            IMAGE_SELECTOR
        );

        if (!listContainer || !imageContainer) {
            console.error(
                'Product Benefits: Listen- oder Bildcontainer wurde nicht gefunden.',
                {
                    wrapper: wrapper,
                    listContainer: listContainer,
                    imageContainer: imageContainer
                }
            );

            return;
        }

        let updateScheduled = false;
        let resizeTimer = null;

        /*
         * Prüft, ob ein Text mehr als eine Zeile hoch ist.
         */
        function textIsWrapped(textElement) {
            const computedStyle =
                window.getComputedStyle(textElement);

            let lineHeight = parseFloat(
                computedStyle.lineHeight
            );

            if (!Number.isFinite(lineHeight)) {
                const fontSize =
                    parseFloat(computedStyle.fontSize) || 16;

                lineHeight = fontSize * 1.2;
            }

            const actualHeight =
                textElement.getBoundingClientRect().height;

            /*
             * Bei dir ist eine Zeile ungefähr 33,6 px hoch
             * und zwei Zeilen ungefähr 67,2 px.
             */
            return actualHeight > lineHeight * 1.5;
        }

        /*
         * Prüft alle Texte der Icon List.
         */
        function hasWrappedText() {
            const textElements = Array.from(
                listContainer.querySelectorAll(
                    TEXT_SELECTOR
                )
            );

            return textElements.some(
                textIsWrapped
            );
        }

        /*
         * Aktualisiert die Ausrichtung.
         */
        function updateLayout() {
            if (updateScheduled) {
                return;
            }

            updateScheduled = true;

            window.requestAnimationFrame(function () {
                /*
                 * Zum Messen immer zuerst nebeneinander anzeigen.
                 */
                wrapper.classList.remove(
                    STACKED_CLASS
                );

                /*
                 * Browser zur Layout-Neuberechnung zwingen.
                 */
                void wrapper.offsetWidth;

                window.requestAnimationFrame(function () {
                    const mustStack =
                        hasWrappedText();

                    wrapper.classList.toggle(
                        STACKED_CLASS,
                        mustStack
                    );

                    wrapper.setAttribute(
                        'data-benefits-layout',
                        mustStack
                            ? 'stacked'
                            : 'row'
                    );

                    wrapper.setAttribute(
                        'data-benefits-initialized',
                        'true'
                    );

                    updateScheduled = false;

                    console.log(
                        'Product Benefits:',
                        mustStack
                            ? 'Bild unter der Icon-Liste'
                            : 'Bild neben der Icon-Liste'
                    );
                });
            });
        }

        /*
         * Auf Änderungen der Containerbreite reagieren.
         */
        const resizeObserver =
            new ResizeObserver(function () {
                window.clearTimeout(resizeTimer);

                resizeTimer =
                    window.setTimeout(
                        updateLayout,
                        80
                    );
            });

        resizeObserver.observe(wrapper);
        resizeObserver.observe(listContainer);

        /*
         * Zusätzlich auf Fenstergrößenänderungen reagieren.
         */
        window.addEventListener(
            'resize',
            function () {
                window.clearTimeout(resizeTimer);

                resizeTimer =
                    window.setTimeout(
                        updateLayout,
                        80
                    );
            },
            {
                passive: true
            }
        );

        /*
         * Nach dem Laden der Schriftarten erneut prüfen.
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
         * Nach dem Laden des Bildes erneut prüfen.
         */
        imageContainer
            .querySelectorAll('img')
            .forEach(function (image) {
                if (!image.complete) {
                    image.addEventListener(
                        'load',
                        updateLayout,
                        {
                            once: true
                        }
                    );
                }
            });

        /*
         * Initiale Prüfungen.
         */
        updateLayout();

        window.setTimeout(
            updateLayout,
            250
        );

        window.setTimeout(
            updateLayout,
            1000
        );
    }

    function startProductBenefits() {
        document
            .querySelectorAll(
                WRAPPER_SELECTOR
            )
            .forEach(
                initializeProductBenefits
            );
    }

    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            startProductBenefits
        );
    } else {
        startProductBenefits();
    }

    window.addEventListener(
        'load',
        startProductBenefits
    );
})();