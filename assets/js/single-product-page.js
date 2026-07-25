/* =========================================================
   JEANS GLUTH – SINGLE PRODUCT PAGE

   Enthält:
   1. Responsive Anordnung innerhalb von JG Info
   2. Dynamische Position von JG Info und Additional Info

   Wichtige Eigenschaften:
   - Messungen erfolgen ausschließlich an unsichtbaren Kopien
   - Sichtbare Container werden nicht testweise verschoben
   - Keine gegenseitigen Observer-Endlosschleifen
   - Elementor-Ausblendungen per display:none bleiben erhalten
   ========================================================= */

(function () {
    'use strict';


    /* =====================================================
       GEMEINSAME EINSTELLUNGEN
       ===================================================== */

    const BENEFITS_SELECTOR =
        '.product-benefits';

    const BENEFITS_LIST_SELECTOR =
        '.product-benefits_list';

    const BENEFITS_IMAGE_SELECTOR =
        '.product-benefits_image';

    const BENEFITS_TEXT_SELECTOR =
        '.elementor-icon-list-text';

    const SHRINK_1_CLASS =
        'product-benefits_shrink-1';

    const SHRINK_2_CLASS =
        'product-benefits_shrink-2';

    const STACKED_CLASS =
        'product-benefits_stacked';

    const BENEFITS_LAYOUT_CLASSES = [
        SHRINK_1_CLASS,
        SHRINK_2_CLASS,
        STACKED_CLASS
    ];

    /*
     * Reserve bei der Breitenmessung.
     */
    const BENEFITS_WIDTH_RESERVE = 10;

    /*
     * Toleranz bei der Textbreite.
     */
    const TEXT_WIDTH_TOLERANCE = 2;

    /*
     * Reserve zum unteren Galerierand.
     */
    const FLOW_HEIGHT_RESERVE = 2;


    /* =====================================================
       ALLGEMEINE HILFSFUNKTIONEN
       ===================================================== */

    function isDisplayed(element) {
        if (!element) {
            return false;
        }

        const style =
            window.getComputedStyle(element);

        /*
         * visibility:hidden wird nicht geprüft.
         * Messkopien und der Benefits-Container vor der
         * Initialisierung dürfen unsichtbar sein.
         */
        return (
            style.display !== 'none' &&
            element.getClientRects().length > 0
        );
    }


    function removeIds(element) {
        element.removeAttribute('id');

        element
            .querySelectorAll('[id]')
            .forEach(function (child) {
                child.removeAttribute('id');
            });
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


    function nextFrame() {
        return new Promise(function (resolve) {
            window.requestAnimationFrame(resolve);
        });
    }


    /* =====================================================
       PRODUCT BENEFITS – LAYOUTLOGIK
       ===================================================== */

    function setBenefitsLayout(element, mode) {
        element.classList.remove(
            ...BENEFITS_LAYOUT_CLASSES
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
     * Ermittelt die Textbreite ohne Zeilenumbruch.
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

        Object.assign(
            probe.style,
            {
                position: 'fixed',
                left: '-100000px',
                top: '0',
                display: 'inline-block',
                visibility: 'hidden',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                width: 'auto',
                maxWidth: 'none',
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontStyle: style.fontStyle,
                fontWeight: style.fontWeight,
                fontStretch: style.fontStretch,
                letterSpacing: style.letterSpacing,
                wordSpacing: style.wordSpacing,
                textTransform: style.textTransform,
                lineHeight: style.lineHeight
            }
        );

        document.body.appendChild(probe);

        const width =
            probe.getBoundingClientRect().width;

        probe.remove();

        return width;
    }


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


    function benefitsListNeedsWrapping(
        listContainer
    ) {
        const textElements =
            Array.from(
                listContainer.querySelectorAll(
                    BENEFITS_TEXT_SELECTOR
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
     * Bestimmt den Benefits-Zustand direkt an einem bereits
     * unsichtbaren und korrekt breiten Element.
     */
    function determineBenefitsModeOnClone(
        benefitsClone
    ) {
        const list =
            benefitsClone.querySelector(
                BENEFITS_LIST_SELECTOR
            );

        if (!list) {
            return 'row';
        }

        setBenefitsLayout(
            benefitsClone,
            'row'
        );

        void benefitsClone.offsetWidth;

        if (!benefitsListNeedsWrapping(list)) {
            return 'row';
        }

        setBenefitsLayout(
            benefitsClone,
            'shrink-1'
        );

        void benefitsClone.offsetWidth;

        if (!benefitsListNeedsWrapping(list)) {
            return 'shrink-1';
        }

        setBenefitsLayout(
            benefitsClone,
            'shrink-2'
        );

        void benefitsClone.offsetWidth;

        if (!benefitsListNeedsWrapping(list)) {
            return 'shrink-2';
        }

        return 'stacked';
    }


    /**
     * Bestimmt den Benefits-Zustand für eine bestimmte Breite
     * mittels einer unsichtbaren Kopie.
     */
    function measureBenefitsMode(
        wrapper,
        targetWidth
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
                targetWidth -
                BENEFITS_WIDTH_RESERVE
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

        document.body.appendChild(clone);

        let mode = 'row';

        try {
            mode =
                determineBenefitsModeOnClone(
                    clone
                );
        } finally {
            clone.remove();
        }

        return mode;
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
            wrapper.querySelector(
                BENEFITS_LIST_SELECTOR
            );

        const imageContainer =
            wrapper.querySelector(
                BENEFITS_IMAGE_SELECTOR
            );

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
         * Überbleibsel älterer Versionen entfernen.
         */
        image.style.removeProperty('height');
        image.style.removeProperty('max-height');

        imageContainer.style.removeProperty(
            'height'
        );

        imageContainer.style.removeProperty(
            'max-height'
        );

        let frameId = null;
        let running = false;
        let requestedAgain = false;
        let lastWidth = 0;
        let currentMode = null;


        function updateBenefitsLayout() {
            if (running) {
                requestedAgain = true;
                return;
            }

            if (!isDisplayed(wrapper)) {
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

            running = true;
            requestedAgain = false;

            const mode =
                measureBenefitsMode(
                    wrapper,
                    width
                );

            if (mode !== currentMode) {
                setBenefitsLayout(
                    wrapper,
                    mode
                );

                currentMode = mode;
            }

            lastWidth =
                Math.round(width);

            wrapper.setAttribute(
                'data-benefits-ready',
                'true'
            );

            running = false;

            if (requestedAgain) {
                requestedAgain = false;
                scheduleBenefitsUpdate(true);
            }
        }


        function scheduleBenefitsUpdate(force) {
            if (force) {
                lastWidth = 0;
            }

            if (running) {
                requestedAgain = true;
                return;
            }

            if (frameId !== null) {
                window.cancelAnimationFrame(
                    frameId
                );
            }

            frameId =
                window.requestAnimationFrame(
                    function () {
                        frameId = null;
                        updateBenefitsLayout();
                    }
                );
        }


        const resizeObserver =
            new ResizeObserver(
                function (entries) {
                    const entry =
                        entries[0];

                    if (!entry) {
                        return;
                    }

                    const width =
                        Math.round(
                            entry.contentRect.width
                        );

                    if (width <= 0) {
                        return;
                    }

                    if (
                        lastWidth > 0 &&
                        Math.abs(
                            width - lastWidth
                        ) < 2
                    ) {
                        return;
                    }

                    scheduleBenefitsUpdate(false);
                }
            );

        resizeObserver.observe(wrapper);


        /*
         * Wird vom Flow-Skript nach einer endgültigen
         * Positionsänderung ausgelöst.
         */
        wrapper.addEventListener(
            'jg-benefits-recalculate',
            function () {
                scheduleBenefitsUpdate(true);
            }
        );


        window.addEventListener(
            'resize',
            function () {
                scheduleBenefitsUpdate(false);
            },
            { passive: true }
        );


        window.addEventListener(
            'orientationchange',
            function () {
                scheduleBenefitsUpdate(true);
            }
        );


        if (
            document.fonts &&
            document.fonts.ready
        ) {
            document.fonts.ready.then(
                function () {
                    scheduleBenefitsUpdate(true);
                }
            );
        }


        if (!image.complete) {
            image.addEventListener(
                'load',
                function () {
                    scheduleBenefitsUpdate(true);
                },
                { once: true }
            );
        }


        scheduleBenefitsUpdate(true);
    }


    /* =====================================================
       DYNAMISCHE FLOW-ANORDNUNG
       ===================================================== */

    function initializeProductFlow(layout) {
        const productTop =
            layout.querySelector(
                '.product-top'
            );

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
            )
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
                    flowElements
                }
            );

            return;
        }


        const items =
            flowElements.map(
                function (element, index) {
                    const placeholder =
                        document.createComment(
                            `product-flow-${index}`
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
                                : 'additionalFlow'
                    };
                }
            );


        let frameId = null;
        let running = false;
        let requestedAgain = false;
        let applyingResult = false;


        function columnsAreSideBySide() {
            if (
                !isDisplayed(galleryColumn) ||
                !isDisplayed(infoColumn)
            ) {
                return false;
            }

            const galleryRect =
                galleryColumn
                    .getBoundingClientRect();

            const infoRect =
                infoColumn
                    .getBoundingClientRect();

            return (
                Math.abs(
                    galleryRect.top -
                    infoRect.top
                ) <= 15 &&
                infoRect.left >
                    galleryRect.left + 20
            );
        }


        function getInfoColumnGap() {
            const style =
                window.getComputedStyle(
                    infoColumn
                );

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


        function getVisibleGalleryWidget() {
            const selectors = [
                '.elementor-widget-wd_single_product_gallery',
                '.woocommerce-product-gallery',
                '.wd-gallery-images',
                '.wd-carousel-container'
            ];

            const directChildren =
                Array.from(
                    galleryColumn.children
                ).filter(isDisplayed);

            if (directChildren.length) {
                return directChildren.reduce(
                    function (largest, current) {
                        const largestRect =
                            largest
                                .getBoundingClientRect();

                        const currentRect =
                            current
                                .getBoundingClientRect();

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
                    galleryColumn
                        .querySelectorAll(
                            selectors.join(',')
                        )
                ).filter(isDisplayed);

            if (!candidates.length) {
                return null;
            }

            return candidates.reduce(
                function (largest, current) {
                    const largestRect =
                        largest
                            .getBoundingClientRect();

                    const currentRect =
                        current
                            .getBoundingClientRect();

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
         * Misst einen kompletten Flow-Container in der Breite
         * der rechten Info-Spalte, ohne das Original zu bewegen.
         */
        function measureFlowItem(
            element,
            targetWidth
        ) {
            const clone =
                element.cloneNode(true);

            removeIds(clone);

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
                `${targetWidth}px`,
                'important'
            );

            clone.style.setProperty(
                'min-width',
                '0',
                'important'
            );

            clone.style.setProperty(
                'max-width',
                `${targetWidth}px`,
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
             * Innerhalb der Info-Spalte einfügen, damit
             * übergeordnete CSS-Selektoren erhalten bleiben.
             *
             * position:fixed verhindert eine Änderung
             * des sichtbaren Layouts.
             */
            infoColumn.appendChild(clone);

            /*
             * In der Kopie enthaltene Benefits-Container
             * auf den für diese Breite passenden Zustand setzen.
             */
            clone
                .querySelectorAll(
                    BENEFITS_SELECTOR
                )
                .forEach(function (
                    benefitsClone
                ) {
                    benefitsClone.setAttribute(
                        'data-benefits-ready',
                        'true'
                    );

                    const mode =
                        determineBenefitsModeOnClone(
                            benefitsClone
                        );

                    setBenefitsLayout(
                        benefitsClone,
                        mode
                    );
                });

            void clone.offsetWidth;

            const height =
                getOuterHeight(clone);

            clone.remove();

            return height;
        }


        function moveBelow(item) {
            const originalParent =
                item.placeholder.parentNode;

            if (!originalParent) {
                return;
            }

            const alreadyBelow =
                item.element.parentNode ===
                    originalParent &&
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
        }


        function moveBeside(item) {
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
        }


        function notifyBenefits(element) {
            element
                .querySelectorAll(
                    BENEFITS_SELECTOR
                )
                .forEach(function (benefits) {
                    benefits.dispatchEvent(
                        new CustomEvent(
                            'jg-benefits-recalculate'
                        )
                    );
                });
        }


        function updateFlowLayout() {
            if (running) {
                requestedAgain = true;
                return;
            }

            running = true;
            requestedAgain = false;

            if (
                !isDisplayed(productTop) ||
                !isDisplayed(galleryColumn) ||
                !isDisplayed(infoColumn) ||
                !isDisplayed(infoMain) ||
                !columnsAreSideBySide()
            ) {
                applyingResult = true;

                items.forEach(moveBelow);

                applyingResult = false;
                running = false;

                return;
            }

            const galleryWidget =
                getVisibleGalleryWidget();

            if (!galleryWidget) {
                running = false;
                return;
            }

            const infoWidth =
                infoColumn
                    .getBoundingClientRect()
                    .width;

            if (
                !Number.isFinite(infoWidth) ||
                infoWidth <= 0
            ) {
                running = false;
                return;
            }

            const galleryHeight =
                getOuterHeight(galleryWidget);

            const infoMainHeight =
                getOuterHeight(infoMain);

            const gap =
                getInfoColumnGap();

            let usedHeight =
                infoMainHeight;

            let furtherItemsMayMove =
                true;

            const decisions =
                items.map(
                    function (item) {
                        if (
                            !isDisplayed(
                                item.element
                            )
                        ) {
                            return 'hidden';
                        }

                        if (!furtherItemsMayMove) {
                            return 'below';
                        }

                        const itemHeight =
                            measureFlowItem(
                                item.element,
                                infoWidth
                            );

                        const requiredHeight =
                            usedHeight +
                            gap +
                            itemHeight +
                            FLOW_HEIGHT_RESERVE;

                        if (
                            requiredHeight <=
                            galleryHeight
                        ) {
                            usedHeight +=
                                gap +
                                itemHeight;

                            return 'beside';
                        }

                        furtherItemsMayMove =
                            false;

                        return 'below';
                    }
                );


            /*
             * Erst jetzt die sichtbaren Originale genau einmal
             * entsprechend dem fertigen Ergebnis verschieben.
             */
            applyingResult = true;

            items.forEach(
                function (item, index) {
                    const decision =
                        decisions[index];

                    if (decision === 'beside') {
                        moveBeside(item);
                    } else {
                        moveBelow(item);
                    }

                    layout.dataset[item.name] =
                        decision;
                }
            );

            applyingResult = false;


            /*
             * Benefits-Layout nach der endgültigen Position
             * gezielt neu berechnen.
             */
            items.forEach(function (item) {
                notifyBenefits(item.element);
            });


            layout.dataset.galleryHeight =
                Math.round(galleryHeight);

            layout.dataset.usedRightHeight =
                Math.round(usedHeight);

            running = false;

            if (requestedAgain) {
                requestedAgain = false;
                scheduleFlowUpdate();
            }
        }


        function scheduleFlowUpdate() {
            if (applyingResult) {
                return;
            }

            if (running) {
                requestedAgain = true;
                return;
            }

            if (frameId !== null) {
                window.cancelAnimationFrame(
                    frameId
                );
            }

            frameId =
                window.requestAnimationFrame(
                    function () {
                        frameId = null;
                        updateFlowLayout();
                    }
                );
        }


        /*
         * Die Flow-Elemente selbst werden nicht beobachtet.
         * Dadurch löst deren internes Benefits-Layout keine
         * erneute Flow-Berechnung aus.
         */
        const resizeObserver =
            new ResizeObserver(
                function () {
                    if (!applyingResult) {
                        scheduleFlowUpdate();
                    }
                }
            );

        [
            productTop,
            galleryColumn,
            infoMain
        ].forEach(function (element) {
            resizeObserver.observe(element);
        });


        galleryColumn
            .querySelectorAll('img')
            .forEach(function (image) {
                if (!image.complete) {
                    image.addEventListener(
                        'load',
                        scheduleFlowUpdate,
                        { once: true }
                    );
                }
            });


        window.addEventListener(
            'resize',
            scheduleFlowUpdate,
            { passive: true }
        );


        window.addEventListener(
            'orientationchange',
            scheduleFlowUpdate
        );


        if (window.jQuery) {
            window.jQuery(document).on(
                [
                    'found_variation',
                    'reset_data',
                    'woocommerce_variation_has_changed'
                ].join(' '),
                scheduleFlowUpdate
            );
        }


        if (
            document.fonts &&
            document.fonts.ready
        ) {
            document.fonts.ready.then(
                scheduleFlowUpdate
            );
        }


        scheduleFlowUpdate();
    }


    /* =====================================================
       INITIALISIERUNG
       ===================================================== */

    function startLayouts() {
        document
            .querySelectorAll(
                BENEFITS_SELECTOR
            )
            .forEach(
                initializeBenefits
            );

        document
            .querySelectorAll(
                '.product-layout'
            )
            .forEach(
                initializeProductFlow
            );
    }


    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            startLayouts
        );
    } else {
        startLayouts();
    }

})();