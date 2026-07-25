/* =========================================================
   INFO-CONTAINER JEANS GLUTH

   Elterncontainer:  .product-benefits
   Icon-Liste:       .product-benefits_list
   Bildcontainer:    .product-benefits_image

   Layoutstufen:
   1. row
   2. shrink-1
   3. shrink-2
   4. stacked
   ========================================================= */

(function () {
    'use strict';

    const WRAPPER_SELECTOR =
        '.product-benefits';

    const LIST_SELECTOR =
        '.product-benefits_list';

    const IMAGE_SELECTOR =
        '.product-benefits_image';

    const TEXT_SELECTOR =
        '.elementor-icon-list-text';

    const SHRINK_1_CLASS =
        'product-benefits_shrink-1';

    const SHRINK_2_CLASS =
        'product-benefits_shrink-2';

    const STACKED_CLASS =
        'product-benefits_stacked';


    /**
     * Prüft, ob das Element grundsätzlich darstellbar ist.
     *
     * visibility:hidden wird bewusst nicht geprüft:
     * Das CSS blendet den Benefits-Container vor der ersten
     * Messung mit visibility:hidden aus. Trotzdem muss das
     * JavaScript ihn vermessen können.
     *
     * Elementor-Ausblendungen über display:none werden
     * weiterhin berücksichtigt.
     */
    function isMeasurable(element) {
        if (!element) {
            return false;
        }

        const style =
            window.getComputedStyle(element);

        return (
            style.display !== 'none' &&
            element.getClientRects().length > 0
        );
    }


    /**
     * Prüft, ob ein Text sichtbar auf mehrere Zeilen umbricht.
     */
    function textIsWrapped(textElement) {
        const style =
            window.getComputedStyle(textElement);

        let lineHeight =
            parseFloat(style.lineHeight);

        if (!Number.isFinite(lineHeight)) {
            const fontSize =
                parseFloat(style.fontSize) || 18;

            lineHeight =
                fontSize * 1.3;
        }

        const actualHeight =
            textElement
                .getBoundingClientRect()
                .height;

        /*
         * Kleine Toleranz, damit Rundungsfehler nicht als
         * echter Zeilenumbruch erkannt werden.
         */
        return (
            actualHeight >
            lineHeight * 1.5
        );
    }


    /**
     * Prüft alle Texte der Icon-Liste.
     */
    function listHasWrappedText(
        listContainer
    ) {
        const textElements =
            Array.from(
                listContainer.querySelectorAll(
                    TEXT_SELECTOR
                )
            );

        if (!textElements.length) {
            return false;
        }

        return textElements.some(
            textIsWrapped
        );
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
            wrapper.querySelector(
                LIST_SELECTOR
            );

        const imageContainer =
            wrapper.querySelector(
                IMAGE_SELECTOR
            );

        const image =
            imageContainer?.querySelector(
                'img'
            );

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
             * Container nicht dauerhaft unsichtbar lassen.
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
        image.style.removeProperty(
            'height'
        );

        image.style.removeProperty(
            'max-height'
        );

        imageContainer.style.removeProperty(
            'height'
        );

        imageContainer.style.removeProperty(
            'max-height'
        );


        let updateRunning = false;
        let updateRequested = false;
        let animationFrameId = null;

        /*
         * Zuletzt vom ResizeObserver erkannte Breite.
         * Höhenänderungen werden absichtlich nicht beobachtet.
         */
        let lastObservedWidth = 0;


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
         * Browser zur unmittelbaren Neuberechnung zwingen.
         */
        function forceLayout() {
            void wrapper.offsetWidth;
        }


        /**
         * Layoutzustand setzen und anschließend prüfen.
         */
        function testLayout(
            mode,
            callback
        ) {
            setLayout(mode);
            forceLayout();

            window.requestAnimationFrame(
                function () {
                    callback(
                        listHasWrappedText(
                            listContainer
                        )
                    );
                }
            );
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

            /*
             * Kam während der laufenden Messung eine echte
             * weitere Änderung, noch einmal neu messen.
             */
            if (updateRequested) {
                updateRequested = false;
                scheduleUpdate();
            }
        }


        /**
         * Prüfreihenfolge:
         *
         * 1. Normales Layout
         * 2. Kleineres Bild
         * 3. Noch kompakter
         * 4. Bild unter der Icon-Liste
         */
        function updateLayout() {
            if (updateRunning) {
                updateRequested = true;
                return;
            }

            if (!isMeasurable(wrapper)) {
                return;
            }

            const wrapperWidth =
                wrapper
                    .getBoundingClientRect()
                    .width;

            if (
                !Number.isFinite(wrapperWidth) ||
                wrapperWidth <= 0
            ) {
                return;
            }

            /*
             * Eine vorherige Anforderung gilt ab jetzt
             * als verarbeitet.
             */
            updateRequested = false;
            updateRunning = true;

            testLayout(
                'row',
                function (rowWrapped) {
                    if (!rowWrapped) {
                        finishUpdate();
                        return;
                    }

                    testLayout(
                        'shrink-1',
                        function (
                            shrink1Wrapped
                        ) {
                            if (
                                !shrink1Wrapped
                            ) {
                                finishUpdate();
                                return;
                            }

                            testLayout(
                                'shrink-2',
                                function (
                                    shrink2Wrapped
                                ) {
                                    if (
                                        !shrink2Wrapped
                                    ) {
                                        finishUpdate();
                                        return;
                                    }

                                    setLayout(
                                        'stacked'
                                    );

                                    finishUpdate();
                                }
                            );
                        }
                    );
                }
            );
        }


        /**
         * Höchstens eine neue Messung pro Browser-Frame.
         */
        function scheduleUpdate() {
            if (updateRunning) {
                updateRequested = true;
                return;
            }

            if (animationFrameId !== null) {
                window.cancelAnimationFrame(
                    animationFrameId
                );
            }

            animationFrameId =
                window.requestAnimationFrame(
                    function () {
                        animationFrameId = null;
                        updateLayout();
                    }
                );
        }


        /**
         * Nur die Breite des gesamten Benefits-Containers
         * beobachten.
         *
         * Die Höhe sowie Liste und Bildcontainer werden nicht
         * beobachtet. Dadurch reagiert das Skript nicht mehr
         * auf seine eigenen row-/stacked-Änderungen.
         */
        const resizeObserver =
            new ResizeObserver(
                function (entries) {
                    const entry =
                        entries[0];

                    if (!entry) {
                        return;
                    }

                    const currentWidth =
                        Math.round(
                            entry.contentRect.width
                        );

                    if (currentWidth <= 0) {
                        return;
                    }

                    /*
                     * Änderungen unter 2 px ignorieren.
                     * Das verhindert Schleifen durch
                     * Subpixel-Rundungen.
                     */
                    if (
                        lastObservedWidth > 0 &&
                        Math.abs(
                            currentWidth -
                            lastObservedWidth
                        ) < 2
                    ) {
                        return;
                    }

                    lastObservedWidth =
                        currentWidth;

                    scheduleUpdate();
                }
            );

        resizeObserver.observe(wrapper);


        /**
         * Erkennt, wenn das andere Layoutskript den kompletten
         * JG-Info-Bereich rechts einsetzt oder unter die
         * Produktgalerie zurückverschiebt.
         *
         * Es werden ausschließlich DOM-Verschiebungen
         * beobachtet – keine Klassen oder Styles.
         * Die eigenen Layoutklassen lösen deshalb keine neue
         * Messung aus.
         */
        const productLayout =
            wrapper.closest(
                '.product-layout'
            );

        if (productLayout) {
            const layoutObserver =
                new MutationObserver(
                    function (mutations) {
                        const hasChildMovement =
                            mutations.some(
                                function (mutation) {
                                    return (
                                        mutation.type ===
                                        'childList'
                                    );
                                }
                            );

                        if (!hasChildMovement) {
                            return;
                        }

                        /*
                         * Breite beim nächsten Observer-Lauf
                         * sicher erneut bewerten.
                         */
                        lastObservedWidth = 0;

                        scheduleUpdate();
                    }
                );

            layoutObserver.observe(
                productLayout,
                {
                    subtree: true,
                    childList: true
                }
            );
        }


        /**
         * Fensterbreite und Orientierung.
         */
        window.addEventListener(
            'resize',
            scheduleUpdate,
            { passive: true }
        );

        window.addEventListener(
            'orientationchange',
            function () {
                lastObservedWidth = 0;
                scheduleUpdate();
            }
        );


        /**
         * Nach dem Laden der Webfonts erneut messen.
         */
        if (
            document.fonts &&
            document.fonts.ready
        ) {
            document.fonts.ready.then(
                function () {
                    lastObservedWidth = 0;
                    scheduleUpdate();
                }
            );
        }


        /**
         * Nach dem Laden des Bildes erneut messen.
         */
        if (!image.complete) {
            image.addEventListener(
                'load',
                function () {
                    lastObservedWidth = 0;
                    scheduleUpdate();
                },
                { once: true }
            );
        }


        /**
         * Erste unmittelbare Messung.
         */
        scheduleUpdate();
    }


    /**
     * Alle Benefits-Bereiche starten.
     */
    function startBenefitsLayout() {
        document
            .querySelectorAll(
                WRAPPER_SELECTOR
            )
            .forEach(
                initializeBenefits
            );
    }


    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            startBenefitsLayout
        );
    } else {
        startBenefitsLayout();
    }
})();

/* =========================================================
   Dynamische Anordnung der Container
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    document
        .querySelectorAll('.product-layout')
        .forEach(initializeProductFlow);
});

function initializeProductFlow(layout) {
    const productTop =
        layout.querySelector('.product-top');

    const galleryColumn =
        layout.querySelector('.product-gallery-column');

    const infoColumn =
        layout.querySelector('.product-info-column');

    const infoMain =
        layout.querySelector('.product-info-main');

    /*
     * Reihenfolge ist wichtig:
     * Zuerst JG Info, danach Additional Information.
     */
    const flowItems = [
        layout.querySelector('.product-flow-jg'),
        layout.querySelector('.product-flow-additional'),
    ].filter(Boolean);

    if (
        !productTop ||
        !galleryColumn ||
        !infoColumn ||
        !infoMain ||
        flowItems.length !== 2
    ) {
        console.warn(
            'Dynamisches Produktlayout ist unvollständig.',
            {
                productTop,
                galleryColumn,
                infoColumn,
                infoMain,
                flowItems,
            }
        );

        return;
    }

    /*
     * Für jeden verschiebbaren Container wird seine
     * ursprüngliche Elementor-Position gespeichert.
     */
    const items = flowItems.map((element) => {
        const placeholder = document.createComment(
            `original-position-${element.className}`
        );

        element.parentNode.insertBefore(
            placeholder,
            element
        );

        return {
            element,
            placeholder,
        };
    });

    let frameId = null;
    let updateRunning = false;
    let measuring = false;

function isVisible(element) {
    if (!element) {
        return false;
    }

    const style =
        window.getComputedStyle(element);

    /*
     * visibility:hidden wird hier absichtlich nicht geprüft.
     *
     * Der Benefits-Container ist während der ersten Messung
     * durch unser eigenes CSS unsichtbar. Er muss trotzdem
     * vermessen werden können.
     *
     * Elementor-Ausblendungen verwenden in der Regel
     * display:none und werden weiterhin berücksichtigt.
     */
    return (
        style.display !== 'none' &&
        element.getClientRects().length > 0
    );
}

    function getOuterHeight(element) {
        const rect =
            element.getBoundingClientRect();

        const style =
            window.getComputedStyle(element);

        const marginTop =
            parseFloat(style.marginTop) || 0;

        const marginBottom =
            parseFloat(style.marginBottom) || 0;

        return (
            rect.height +
            marginTop +
            marginBottom
        );
    }

    function moveToOriginalPosition(item) {
        const originalParent =
            item.placeholder.parentNode;

        if (!originalParent) {
            return;
        }

        const alreadyOriginal =
            item.element.parentNode === originalParent &&
            item.element.previousSibling === item.placeholder;

        if (!alreadyOriginal) {
            originalParent.insertBefore(
                item.element,
                item.placeholder.nextSibling
            );
        }

        item.element.classList.remove(
            'is-beside-gallery'
        );
    }

    function moveBesideGallery(item) {
        if (item.element.parentNode !== infoColumn) {
            infoColumn.appendChild(item.element);
        }

        item.element.classList.add(
            'is-beside-gallery'
        );

        window.dispatchEvent(new Event('resize'));

    }

    function resetAllItems() {
        items.forEach(moveToOriginalPosition);

        layout.dataset.jgInfoFlow = 'below';
        layout.dataset.additionalFlow = 'below';
    }

    function areColumnsSideBySide() {
        if (
            !isVisible(galleryColumn) ||
            !isVisible(infoColumn)
        ) {
            return false;
        }

        const galleryRect =
            galleryColumn.getBoundingClientRect();

        const infoRect =
            infoColumn.getBoundingClientRect();

        const sameRow =
            Math.abs(
                galleryRect.top -
                infoRect.top
            ) <= 15;

        const horizontallySeparated =
            infoRect.left >
            galleryRect.left + 20;

        return (
            sameRow &&
            horizontallySeparated
        );
    }

    function getInfoColumnGap() {
        const style =
            window.getComputedStyle(infoColumn);

        const rowGap =
            parseFloat(style.rowGap);

        if (Number.isFinite(rowGap)) {
            return rowGap;
        }

        const gap =
            parseFloat(style.gap);

        return Number.isFinite(gap)
            ? gap
            : 0;
    }

    /*
     * Tatsächlich sichtbares Product-Gallery-Widget ermitteln.
     * Dadurch wird nicht die eventuell von Elementor gestreckte
     * äußere Galerie-Spalte gemessen.
     */
    function getVisibleGalleryWidget() {
        const directChildren =
            Array.from(galleryColumn.children)
                .filter(isVisible);

        if (directChildren.length) {
            return directChildren.reduce(
                (largest, current) => {
                    const largestRect =
                        largest.getBoundingClientRect();

                    const currentRect =
                        current.getBoundingClientRect();

                    const largestArea =
                        largestRect.width *
                        largestRect.height;

                    const currentArea =
                        currentRect.width *
                        currentRect.height;

                    return currentArea > largestArea
                        ? current
                        : largest;
                }
            );
        }

        const candidates = Array.from(
            galleryColumn.querySelectorAll(
                [
                    '.elementor-widget-wd_single_product_gallery',
                    '.woocommerce-product-gallery',
                    '.wd-gallery-images',
                    '.wd-carousel-container',
                ].join(',')
            )
        ).filter(isVisible);

        if (!candidates.length) {
            return null;
        }

        return candidates.reduce(
            (largest, current) => {
                const largestRect =
                    largest.getBoundingClientRect();

                const currentRect =
                    current.getBoundingClientRect();

                const largestArea =
                    largestRect.width *
                    largestRect.height;

                const currentArea =
                    currentRect.width *
                    currentRect.height;

                return currentArea > largestArea
                    ? current
                    : largest;
            }
        );
    }

    /*
     * Höhe des Containers bei der tatsächlichen Breite
     * der rechten Info-Spalte unsichtbar messen.
     */
    function measureAtInfoColumnWidth(element) {
        const infoRect =
            infoColumn.getBoundingClientRect();

        if (infoRect.width <= 0) {
            return 0;
        }

        const oldStyle =
            element.getAttribute('style');

        measuring = true;

        element.style.position = 'fixed';
        element.style.left = '-100000px';
        element.style.top = '0';
        element.style.width =
            `${infoRect.width}px`;
        element.style.maxWidth =
            `${infoRect.width}px`;
        element.style.visibility = 'hidden';
        element.style.pointerEvents = 'none';
        element.style.zIndex = '-1';

        const measuredHeight =
            getOuterHeight(element);

        if (oldStyle === null) {
            element.removeAttribute('style');
        } else {
            element.setAttribute(
                'style',
                oldStyle
            );
        }

        measuring = false;

        return measuredHeight;
    }

    function updateLayout() {
        if (updateRunning) {
            return;
        }

        updateRunning = true;

        /*
         * Sichere Ausgangsposition:
         * Beide Bereiche zunächst unterhalb der Galerie.
         */
        resetAllItems();

        if (
            !isVisible(productTop) ||
            !isVisible(galleryColumn) ||
            !isVisible(infoColumn) ||
            !isVisible(infoMain)
        ) {
            updateRunning = false;
            return;
        }

        /*
         * Hat Elementor die Hauptspalten an diesem Breakpoint
         * bereits untereinander angeordnet, bleiben beide
         * Zusatzbereiche ebenfalls unten.
         */
        if (!areColumnsSideBySide()) {
            updateRunning = false;
            return;
        }

        const galleryWidget =
            getVisibleGalleryWidget();

        if (!galleryWidget) {
            console.warn(
                'Kein sichtbares Product-Gallery-Widget gefunden.'
            );

            updateRunning = false;
            return;
        }

        const galleryHeight =
            getOuterHeight(galleryWidget);

        const infoMainHeight =
            getOuterHeight(infoMain);

        const gap =
            getInfoColumnGap();

        /*
         * Unterer Sicherheitsabstand zur Galerie.
         */
        const safetySpace = 12;

        let usedRightHeight =
            infoMainHeight;

        /*
         * Sobald ein Element nicht mehr hineinpasst,
         * bleiben auch alle folgenden Elemente unten.
         *
         * So bleibt die Reihenfolge:
         * Hauptinformationen → JG Info → Additional Information.
         */
        let furtherItemsMayMove = true;

        items.forEach((item, index) => {
            const element =
                item.element;

            const datasetName =
                index === 0
                    ? 'jgInfoFlow'
                    : 'additionalFlow';

            if (
                !isVisible(element) ||
                !furtherItemsMayMove
            ) {
                layout.dataset[datasetName] =
                    isVisible(element)
                        ? 'below'
                        : 'hidden';

                return;
            }

            const itemHeight =
                measureAtInfoColumnWidth(element);

            const requiredHeight =
                usedRightHeight +
                gap +
                itemHeight +
                safetySpace;

            if (requiredHeight <= galleryHeight) {
                moveBesideGallery(item);

                usedRightHeight +=
                    gap +
                    itemHeight;

                layout.dataset[datasetName] =
                    'beside';
            } else {
                layout.dataset[datasetName] =
                    'below';

                furtherItemsMayMove = false;
            }

            element.dataset.measuredHeight =
                Math.round(itemHeight);
        });

        layout.dataset.galleryHeight =
            Math.round(galleryHeight);

        layout.dataset.usedRightHeight =
            Math.round(usedRightHeight);

        updateRunning = false;
    }

    function scheduleUpdate() {
        if (measuring) {
            return;
        }

        if (frameId !== null) {
            cancelAnimationFrame(frameId);
        }

        frameId = requestAnimationFrame(() => {
            frameId = null;
            updateLayout();
        });
    }

    const resizeObserver =
        new ResizeObserver(() => {
            if (!measuring) {
                scheduleUpdate();
            }
        });

    [
        productTop,
        galleryColumn,
        infoMain,
    ].forEach((element) => {
        resizeObserver.observe(element);
    });

    galleryColumn
        .querySelectorAll('img')
        .forEach((image) => {
            if (!image.complete) {
                image.addEventListener(
                    'load',
                    scheduleUpdate,
                    { once: true }
                );
            }
        });

    const mutationObserver =
        new MutationObserver(() => {
            if (!measuring) {
                scheduleUpdate();
            }
        });

    mutationObserver.observe(layout, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
            'style',
            'src',
            'srcset',
            'hidden',
        ],
    });

    window.addEventListener(
        'resize',
        scheduleUpdate,
        { passive: true }
    );

    window.addEventListener(
        'orientationchange',
        scheduleUpdate
    );

    if (window.jQuery) {
        window.jQuery(document).on(
            [
                'found_variation',
                'reset_data',
                'woocommerce_variation_has_changed',
            ].join(' '),
            scheduleUpdate
        );
    }

    scheduleUpdate();
}