/* =========================================================
   INFO-CONTAINER JEANS GLUTH

   Flackerfreie Version:
   - Messung an einer unsichtbaren Kopie
   - Prüfung über benötigte Textbreite
   - Bild wird bei echtem Textumbruch gestapelt
   - Reagiert automatisch auf Breitenänderungen
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

    const LAYOUT_CLASSES = [
        SHRINK_1_CLASS,
        SHRINK_2_CLASS,
        STACKED_CLASS
    ];

    /*
     * Die Messkopie wird etwas schmaler als der echte
     * Container gemessen. Das schafft eine kleine Reserve
     * gegen Rundungs- und Subpixelunterschiede.
     */
    const WIDTH_SAFETY_SPACE = 10;

    /*
     * Zusätzliche Toleranz bei der Textbreitenprüfung.
     */
    const TEXT_WIDTH_TOLERANCE = 2;


    /**
     * Prüft, ob das Element grundsätzlich vermessen werden kann.
     *
     * visibility:hidden wird bewusst nicht berücksichtigt,
     * weil der Container vor der ersten Messung durch das CSS
     * unsichtbar gemacht wird.
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
     * Entfernt IDs aus einer Messkopie.
     */
    function removeIds(element) {
        element.removeAttribute('id');

        element
            .querySelectorAll('[id]')
            .forEach(function (child) {
                child.removeAttribute('id');
            });
    }


    /**
     * Setzt einen Layoutzustand.
     */
    function setLayoutState(element, mode) {
        element.classList.remove(
            ...LAYOUT_CLASSES
        );

        if (mode === 'shrink-1') {
            element.classList.add(
                SHRINK_1_CLASS
            );
        }

        if (mode === 'shrink-2') {
            element.classList.add(
                SHRINK_2_CLASS
            );
        }

        if (mode === 'stacked') {
            element.classList.add(
                STACKED_CLASS
            );
        }

        element.setAttribute(
            'data-benefits-layout',
            mode
        );
    }


    /**
     * Erstellt einen unsichtbaren einzeiligen Text zum Messen
     * der tatsächlich benötigten Textbreite.
     */
    function measureNaturalTextWidth(textElement) {
        const style =
            window.getComputedStyle(textElement);

        const probe =
            document.createElement('span');

        probe.textContent =
            textElement.textContent
                .replace(/\s+/g, ' ')
                .trim();

        probe.setAttribute(
            'aria-hidden',
            'true'
        );

        probe.style.position =
            'fixed';

        probe.style.left =
            '-100000px';

        probe.style.top =
            '0';

        probe.style.display =
            'inline-block';

        probe.style.visibility =
            'hidden';

        probe.style.pointerEvents =
            'none';

        probe.style.whiteSpace =
            'nowrap';

        probe.style.width =
            'auto';

        probe.style.maxWidth =
            'none';

        /*
         * Relevante Typografie des Originaltexts übernehmen.
         */
        probe.style.fontFamily =
            style.fontFamily;

        probe.style.fontSize =
            style.fontSize;

        probe.style.fontStyle =
            style.fontStyle;

        probe.style.fontWeight =
            style.fontWeight;

        probe.style.fontStretch =
            style.fontStretch;

        probe.style.letterSpacing =
            style.letterSpacing;

        probe.style.wordSpacing =
            style.wordSpacing;

        probe.style.textTransform =
            style.textTransform;

        probe.style.lineHeight =
            style.lineHeight;

        document.body.appendChild(
            probe
        );

        const width =
            probe.getBoundingClientRect().width;

        probe.remove();

        return width;
    }


    /**
     * Prüft, ob ein Text in der vorhandenen Breite umbrechen
     * müsste.
     */
    function textNeedsWrapping(textElement) {
        if (!textElement) {
            return false;
        }

        const availableWidth =
            textElement
                .getBoundingClientRect()
                .width;

        if (
            !Number.isFinite(availableWidth) ||
            availableWidth <= 0
        ) {
            return true;
        }

        const requiredWidth =
            measureNaturalTextWidth(
                textElement
            );

        return (
            requiredWidth >
            availableWidth +
            TEXT_WIDTH_TOLERANCE
        );
    }


    /**
     * Prüft alle Texte der Icon-Liste.
     */
    function listNeedsWrapping(
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
            textNeedsWrapping
        );
    }


    /**
     * Erstellt eine unsichtbare Messkopie innerhalb derselben
     * Produktseite. Dadurch gelten dieselben übergeordneten
     * Elementor- und Woodmart-Stile.
     */
    function createMeasurementClone(
        wrapper,
        width
    ) {
        const clone =
            wrapper.cloneNode(true);

        removeIds(clone);

        clone.removeAttribute(
            'data-benefits-script-initialized'
        );

        clone.setAttribute(
            'data-benefits-ready',
            'true'
        );

        clone.setAttribute(
            'aria-hidden',
            'true'
        );

        clone.style.setProperty(
            'position',
            'fixed',
            'important'
        );

        clone.style.setProperty(
            'left',
            '-100000px',
            'important'
        );

        clone.style.setProperty(
            'top',
            '0',
            'important'
        );

        clone.style.setProperty(
            'width',
            `${Math.max(
                1,
                width - WIDTH_SAFETY_SPACE
            )}px`,
            'important'
        );

        clone.style.setProperty(
            'min-width',
            '0',
            'important'
        );

        clone.style.setProperty(
            'max-width',
            'none',
            'important'
        );

        clone.style.setProperty(
            'visibility',
            'hidden',
            'important'
        );

        clone.style.setProperty(
            'pointer-events',
            'none',
            'important'
        );

        clone.style.setProperty(
            'z-index',
            '-1',
            'important'
        );

        /*
         * Möglichst im gleichen Elementor-Kontext einfügen.
         */
        const measurementParent =
            wrapper.parentElement ||
            document.body;

        measurementParent.appendChild(
            clone
        );

        /*
         * Sofortige Layoutberechnung erzwingen.
         */
        void clone.offsetWidth;

        return clone;
    }


    /**
     * Prüft einen einzelnen Zustand an der Messkopie.
     */
    function cloneLayoutFits(
        clone,
        mode
    ) {
        setLayoutState(
            clone,
            mode
        );

        /*
         * Browser nach dem Klassenwechsel zur Neuberechnung
         * zwingen.
         */
        void clone.offsetWidth;

        const cloneList =
            clone.querySelector(
                LIST_SELECTOR
            );

        if (!cloneList) {
            return false;
        }

        return !listNeedsWrapping(
            cloneList
        );
    }


    /**
     * Ermittelt den besten Layoutzustand.
     */
    function determineLayout(
        wrapper,
        width
    ) {
        const clone =
            createMeasurementClone(
                wrapper,
                width
            );

        let result =
            'stacked';

        try {
            if (
                cloneLayoutFits(
                    clone,
                    'row'
                )
            ) {
                result = 'row';
            } else if (
                cloneLayoutFits(
                    clone,
                    'shrink-1'
                )
            ) {
                result = 'shrink-1';
            } else if (
                cloneLayoutFits(
                    clone,
                    'shrink-2'
                )
            ) {
                result = 'shrink-2';
            }
        } finally {
            clone.remove();
        }

        return result;
    }


    /**
     * Initialisiert einen Benefits-Container.
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
         * Alte Inline-Höhen entfernen.
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


        let animationFrameId = null;
        let updateRunning = false;
        let updateAgain = false;
        let lastMeasuredWidth = 0;
        let currentMode = null;


        /**
         * Endgültiges Layout anwenden.
         */
        function applyFinalLayout(mode) {
            if (mode !== currentMode) {
                setLayoutState(
                    wrapper,
                    mode
                );

                currentMode =
                    mode;
            }

            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );
        }


        /**
         * Layout vollständig neu berechnen.
         */
        function updateLayout() {
            if (updateRunning) {
                updateAgain = true;
                return;
            }

            if (!isMeasurable(wrapper)) {
                return;
            }

            const width =
                wrapper
                    .getBoundingClientRect()
                    .width;

            if (
                !Number.isFinite(width) ||
                width <= 0
            ) {
                return;
            }

            updateRunning = true;
            updateAgain = false;

            const bestMode =
                determineLayout(
                    wrapper,
                    width
                );

            applyFinalLayout(
                bestMode
            );

            lastMeasuredWidth =
                Math.round(width);

            updateRunning = false;

            if (updateAgain) {
                updateAgain = false;
                scheduleUpdate(true);
            }
        }


        /**
         * Aktualisierung für den nächsten Browser-Frame planen.
         */
        function scheduleUpdate(force) {
            if (force) {
                lastMeasuredWidth = 0;
            }

            if (updateRunning) {
                updateAgain = true;
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
         * Nur tatsächliche Breitenänderungen beobachten.
         */
        const resizeObserver =
            new ResizeObserver(
                function (entries) {
                    const entry =
                        entries[0];

                    if (!entry) {
                        return;
                    }

                    const newWidth =
                        Math.round(
                            entry.contentRect.width
                        );

                    if (newWidth <= 0) {
                        return;
                    }

                    if (
                        lastMeasuredWidth > 0 &&
                        Math.abs(
                            newWidth -
                            lastMeasuredWidth
                        ) < 2
                    ) {
                        return;
                    }

                    scheduleUpdate(false);
                }
            );

        resizeObserver.observe(
            wrapper
        );


        /**
         * Fensteränderungen.
         */
        window.addEventListener(
            'resize',
            function () {
                scheduleUpdate(false);
            },
            { passive: true }
        );

        window.addEventListener(
            'orientationchange',
            function () {
                scheduleUpdate(true);
            }
        );


        /**
         * Nach dem Laden der Schrift erneut messen.
         */
        if (
            document.fonts &&
            document.fonts.ready
        ) {
            document.fonts.ready.then(
                function () {
                    scheduleUpdate(true);
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
                    scheduleUpdate(true);
                },
                { once: true }
            );
        }


        /**
         * Erste Messung.
         */
        scheduleUpdate(true);
    }


    /**
     * Alle Benefits-Bereiche initialisieren.
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
   DYNAMISCHE ANORDNUNG DER PRODUKT-CONTAINER

   Reihenfolge:
   1. Hauptinformationen
   2. JG Info
   3. Additional Information

   Jeder Zusatzbereich wird zunächst unsichtbar rechts
   eingesetzt und dort mit seinem echten Layout vermessen.
   Nur wenn er tatsächlich über die Galerie hinausreicht,
   wird er wieder unter die Galerie verschoben.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
    document
        .querySelectorAll('.product-layout')
        .forEach(initializeProductFlow);
});


function initializeProductFlow(layout) {
    const productTop =
        layout.querySelector('.product-top');

    const galleryColumn =
        layout.querySelector(
            '.product-gallery-column'
        );

    const infoColumn =
        layout.querySelector(
            '.product-info-column'
        );

    const infoMain =
        layout.querySelector(
            '.product-info-main'
        );

    const flowElements = [
        layout.querySelector(
            '.product-flow-jg'
        ),
        layout.querySelector(
            '.product-flow-additional'
        ),
    ].filter(Boolean);

    if (
        !productTop ||
        !galleryColumn ||
        !infoColumn ||
        !infoMain ||
        flowElements.length !== 2
    ) {
        console.warn(
            'Dynamisches Produktlayout ist unvollständig.',
            {
                productTop,
                galleryColumn,
                infoColumn,
                infoMain,
                flowElements,
            }
        );

        return;
    }


    /*
     * Ursprüngliche Elementor-Positionen speichern.
     */
    const items = flowElements.map(
        function (element, index) {
            const placeholder =
                document.createComment(
                    `product-flow-position-${index}`
                );

            element.parentNode.insertBefore(
                placeholder,
                element
            );

            return {
                element,
                placeholder,
                name:
                    index === 0
                        ? 'jgInfoFlow'
                        : 'additionalFlow',
            };
        }
    );


    let animationFrameId = null;
    let updateRunning = false;
    let updateRequested = false;
    let observersPaused = false;


    /**
     * Prüft nur display:none.
     *
     * visibility:hidden wird absichtlich ignoriert,
     * weil Elemente während der Messung unsichtbar
     * dargestellt werden.
     */
    function isDisplayed(element) {
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
     * Wartet auf den nächsten Browser-Frame.
     */
    function nextFrame() {
        return new Promise(function (resolve) {
            window.requestAnimationFrame(resolve);
        });
    }


    /**
     * Mehrere Layoutzyklen abwarten.
     *
     * Dadurch können auch das separate Benefits-Skript,
     * Elementor und Woodmart auf die neue Breite reagieren.
     */
    async function waitForLayout() {
        await nextFrame();
        await nextFrame();
        await nextFrame();
    }


    /**
     * Prüft, ob Galerie und Infospalte nebeneinander stehen.
     */
    function columnsAreSideBySide() {
        if (
            !isDisplayed(galleryColumn) ||
            !isDisplayed(infoColumn)
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

        const infoIsRight =
            infoRect.left >
            galleryRect.left + 20;

        return sameRow && infoIsRight;
    }


    /**
     * Tatsächlich sichtbares Galerie-Widget bestimmen.
     *
     * Es wird nicht die eventuell gestreckte äußere
     * Galerie-Spalte verwendet.
     */
    function getVisibleGalleryWidget() {
        const directChildren =
            Array.from(
                galleryColumn.children
            ).filter(isDisplayed);

        if (directChildren.length) {
            return directChildren.reduce(
                function (largest, current) {
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

        const candidates =
            Array.from(
                galleryColumn.querySelectorAll(
                    [
                        '.elementor-widget-wd_single_product_gallery',
                        '.woocommerce-product-gallery',
                        '.wd-gallery-images',
                        '.wd-carousel-container',
                    ].join(',')
                )
            ).filter(isDisplayed);

        if (!candidates.length) {
            return null;
        }

        return candidates.reduce(
            function (largest, current) {
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


    /**
     * Element an seine ursprüngliche Position zurücksetzen.
     */
    function moveBelow(item) {
        const originalParent =
            item.placeholder.parentNode;

        if (!originalParent) {
            return;
        }

        const alreadyBelow =
            item.element.parentNode === originalParent &&
            item.element.previousSibling ===
                item.placeholder;

        if (!alreadyBelow) {
            originalParent.insertBefore(
                item.element,
                item.placeholder.nextSibling
            );
        }

        item.element.classList.remove(
            'is-beside-gallery'
        );

        item.element.style.removeProperty(
            'visibility'
        );

        item.element.style.removeProperty(
            'pointer-events'
        );
    }


    /**
     * Element zunächst unsichtbar rechts einsetzen.
     */
    function moveBesideForMeasurement(item) {
        if (
            item.element.parentNode !==
            infoColumn
        ) {
            infoColumn.appendChild(
                item.element
            );
        }

        item.element.classList.add(
            'is-beside-gallery'
        );

        item.element.style.setProperty(
            'visibility',
            'hidden',
            'important'
        );

        item.element.style.setProperty(
            'pointer-events',
            'none',
            'important'
        );
    }


    /**
     * Rechts eingesetztes Element sichtbar machen.
     */
    function showBeside(item) {
        item.element.style.removeProperty(
            'visibility'
        );

        item.element.style.removeProperty(
            'pointer-events'
        );
    }


    /**
     * Alle Zusatzbereiche nach unten setzen.
     */
    function resetAllItems() {
        items.forEach(moveBelow);

        layout.dataset.jgInfoFlow =
            'below';

        layout.dataset.additionalFlow =
            'below';
    }


    /**
     * Prüft die tatsächliche Unterkante der rechten Spalte.
     */
    function rightContentFits(
        galleryWidget,
        safetySpace
    ) {
        const galleryRect =
            galleryWidget.getBoundingClientRect();

        const infoRect =
            infoColumn.getBoundingClientRect();

        return (
            infoRect.bottom + safetySpace <=
            galleryRect.bottom
        );
    }


    /**
     * Vollständige Layoutentscheidung.
     */
    async function updateLayout() {
        if (updateRunning) {
            updateRequested = true;
            return;
        }

        updateRunning = true;
        updateRequested = false;
        observersPaused = true;

        resetAllItems();

        await waitForLayout();

        if (
            !isDisplayed(productTop) ||
            !isDisplayed(galleryColumn) ||
            !isDisplayed(infoColumn) ||
            !isDisplayed(infoMain) ||
            !columnsAreSideBySide()
        ) {
            observersPaused = false;
            updateRunning = false;
            return;
        }

        const galleryWidget =
            getVisibleGalleryWidget();

        if (!galleryWidget) {
            console.warn(
                'Kein sichtbares Galerie-Widget gefunden.'
            );

            observersPaused = false;
            updateRunning = false;
            return;
        }

        /*
         * Kleine Reserve zum unteren Galerierand.
         */
        const safetySpace = 2;

        /*
         * Elemente der Reihe nach testen.
         */
        for (
            let index = 0;
            index < items.length;
            index += 1
        ) {
            const item =
                items[index];

            if (!isDisplayed(item.element)) {
                layout.dataset[item.name] =
                    'hidden';

                continue;
            }

            /*
             * Unsichtbar rechts einsetzen.
             */
            moveBesideForMeasurement(item);

            /*
             * Benefits-Skript und Browser auf die neue
             * Spaltenbreite reagieren lassen.
             */
            await waitForLayout();

            if (
                rightContentFits(
                    galleryWidget,
                    safetySpace
                )
            ) {
                showBeside(item);

                layout.dataset[item.name] =
                    'beside';
            } else {
                /*
                 * Dieses Element passt nicht mehr.
                 */
                moveBelow(item);

                layout.dataset[item.name] =
                    'below';

                /*
                 * Alle folgenden Elemente bleiben ebenfalls
                 * unten, damit die Reihenfolge erhalten bleibt.
                 */
                for (
                    let nextIndex =
                        index + 1;
                    nextIndex < items.length;
                    nextIndex += 1
                ) {
                    const nextItem =
                        items[nextIndex];

                    moveBelow(nextItem);

                    layout.dataset[nextItem.name] =
                        isDisplayed(nextItem.element)
                            ? 'below'
                            : 'hidden';
                }

                break;
            }
        }

        const galleryRect =
            galleryWidget.getBoundingClientRect();

        const infoRect =
            infoColumn.getBoundingClientRect();

        layout.dataset.galleryBottom =
            Math.round(galleryRect.bottom);

        layout.dataset.infoBottom =
            Math.round(infoRect.bottom);

        observersPaused = false;
        updateRunning = false;

        if (updateRequested) {
            updateRequested = false;
            scheduleUpdate();
        }
    }


    /**
     * Aktualisierung für nächsten Frame einplanen.
     */
    function scheduleUpdate() {
        if (observersPaused) {
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
     * Relevante Größenänderungen beobachten.
     *
     * Die Zusatzbereiche selbst werden nicht beobachtet,
     * damit ihre interne row-/stacked-Umschaltung keine
     * Endlosschleife auslöst.
     */
    const resizeObserver =
        new ResizeObserver(function () {
            if (!observersPaused) {
                scheduleUpdate();
            }
        });

    [
        productTop,
        galleryColumn,
        infoMain,
    ].forEach(function (element) {
        resizeObserver.observe(element);
    });


    /**
     * Nachgeladene Galerie-Bilder.
     */
    galleryColumn
        .querySelectorAll('img')
        .forEach(function (image) {
            if (!image.complete) {
                image.addEventListener(
                    'load',
                    scheduleUpdate,
                    { once: true }
                );
            }
        });


    /**
     * Browser- und Geräteänderungen.
     */
    window.addEventListener(
        'resize',
        scheduleUpdate,
        { passive: true }
    );

    window.addEventListener(
        'orientationchange',
        scheduleUpdate
    );


    /**
     * WooCommerce-Variationen.
     */
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


    /**
     * Webfonts können die Texthöhen verändern.
     */
    if (
        document.fonts &&
        document.fonts.ready
    ) {
        document.fonts.ready.then(
            scheduleUpdate
        );
    }


    scheduleUpdate();
}