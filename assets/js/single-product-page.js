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