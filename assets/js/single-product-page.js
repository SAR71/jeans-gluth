/* =========================================================
   JEANS GLUTH – SINGLE PRODUCT PAGE

   Enthält:
   1. Responsive Anordnung innerhalb von JG Info
   2. Dynamische Position von JG Info und Additional Info

   Wichtige Eigenschaften:
   - Messungen erfolgen an unsichtbaren Kopien
   - Sichtbare Container werden nicht testweise verschoben
   - Keine gegenseitigen Observer-Endlosschleifen
   - Die tatsächliche Inhaltshöhe der Info-Spalte wird benutzt
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
     * Reserve bei der Breitenmessung des JG-Info-Containers.
     */
    const BENEFITS_WIDTH_RESERVE = 10;

    /*
     * Toleranz bei der Textbreitenprüfung.
     */
    const TEXT_WIDTH_TOLERANCE = 2;

    /*
     * Reserve zum unteren Galerierand.
     */
    const FLOW_HEIGHT_RESERVE = 2;


    /* =====================================================
       ALLGEMEINE HILFSFUNKTIONEN
       ===================================================== */

    /**
     * Prüft, ob ein Element grundsätzlich angezeigt wird.
     *
     * visibility:hidden wird bewusst nicht geprüft.
     * Messkopien und der Benefits-Container dürfen während
     * der Berechnung unsichtbar sein.
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
     * Entfernt IDs aus einer Messkopie.
     *
     * Dadurch entstehen keine doppelten HTML-IDs.
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
     * Ermittelt die Höhe eines Elements einschließlich
     * vertikaler Außenabstände.
     */
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


    /* =====================================================
       PRODUCT BENEFITS – LAYOUTLOGIK
       ===================================================== */

    /**
     * Setzt einen Layoutzustand auf den Benefits-Container.
     */
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
     * Ermittelt die benötigte Textbreite ohne Zeilenumbruch.
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


    /**
     * Prüft, ob ein Text in der verfügbaren Breite
     * umbrechen müsste.
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
     * Prüft alle Texte der Icon-Liste auf Umbruch.
     */
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
     * Ermittelt den passenden Benefits-Zustand direkt an
     * einer bereits unsichtbaren Messkopie.
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
     * mithilfe einer unsichtbaren Kopie.
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

        let mode =
            'row';

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


    /**
     * Initialisiert einen sichtbaren Benefits-Container.
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

        let frameId = null;
        let running = false;
        let requestedAgain = false;
        let lastWidth = 0;
        let currentMode = null;


        /**
         * Berechnet den passenden sichtbaren Zustand.
         */
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

                currentMode =
                    mode;
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


        /**
         * Plant eine Aktualisierung für den nächsten Frame.
         */
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


        /**
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


        /**
         * Ursprüngliche Elementor-Positionen speichern.
         */
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


        /**
         * Prüft, ob Galerie und Infospalte nebeneinander sind.
         */
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


        /**
         * Ermittelt den vertikalen Abstand zwischen Elementen
         * innerhalb der rechten Info-Spalte.
         */
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


        /**
         * Ermittelt die tatsächlich vom sichtbaren Inhalt
         * belegte Höhe der Hauptinformationen.
         *
         * Elementor kann den äußeren Container über Flexbox
         * bis zur Höhe der Galerie strecken. Deshalb wird nicht
         * die Höhe von product-info-main selbst verwendet,
         * sondern die Unterkante seiner echten Inhalte.
         */
        function getActualInfoMainHeight() {
            const infoColumnRect =
                infoColumn.getBoundingClientRect();

            const infoMainRect =
                infoMain.getBoundingClientRect();

            const candidates =
                Array.from(
                    infoMain.querySelectorAll('*')
                ).filter(function (element) {
                    if (!isDisplayed(element)) {
                        return false;
                    }

                    const style =
                        window.getComputedStyle(
                            element
                        );

                    /*
                     * Absolut oder fest positionierte Elemente
                     * sollen die belegte Höhe nicht vergrößern.
                     */
                    if (
                        style.position === 'absolute' ||
                        style.position === 'fixed'
                    ) {
                        return false;
                    }

                    const rect =
                        element.getBoundingClientRect();

                    if (
                        rect.width <= 0 ||
                        rect.height <= 0
                    ) {
                        return false;
                    }

                    /*
                     * Nur Endelemente ohne weitere sichtbare
                     * Unterelemente berücksichtigen.
                     *
                     * Dadurch werden gestreckte Elementor-
                     * Elterncontainer nicht als tatsächliche
                     * Inhaltsunterkante gewertet.
                     */
                    const hasVisibleChild =
                        Array.from(
                            element.children
                        ).some(function (child) {
                            if (!isDisplayed(child)) {
                                return false;
                            }

                            const childStyle =
                                window.getComputedStyle(
                                    child
                                );

                            if (
                                childStyle.position ===
                                    'absolute' ||
                                childStyle.position ===
                                    'fixed'
                            ) {
                                return false;
                            }

                            const childRect =
                                child
                                    .getBoundingClientRect();

                            return (
                                childRect.width > 0 &&
                                childRect.height > 0
                            );
                        });

                    return !hasVisibleChild;
                });


            /*
             * Oberkante der rechten Info-Spalte dient als
             * Startpunkt für die Höhenberechnung.
             */
            let contentBottom =
                infoMainRect.top;


            candidates.forEach(
                function (element) {
                    const rect =
                        element
                            .getBoundingClientRect();

                    contentBottom =
                        Math.max(
                            contentBottom,
                            rect.bottom
                        );
                }
            );


            /*
             * Falls keine geeigneten Inhalte gefunden wurden,
             * normale Containerhöhe verwenden.
             */
            if (!candidates.length) {
                return getOuterHeight(
                    infoMain
                );
            }


            const infoMainStyle =
                window.getComputedStyle(
                    infoMain
                );

            const paddingBottom =
                parseFloat(
                    infoMainStyle.paddingBottom
                ) || 0;

            const marginBottom =
                parseFloat(
                    infoMainStyle.marginBottom
                ) || 0;


            /*
             * Tatsächlich belegte Höhe relativ zur Oberkante
             * der rechten Info-Spalte.
             */
            return Math.max(
                0,
                contentBottom -
                infoColumnRect.top +
                paddingBottom +
                marginBottom
            );
        }


        /**
         * Tatsächlich sichtbares Galerie-Widget ermitteln.
         */
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
         * Misst einen vollständigen Flow-Container in der
         * Breite der rechten Info-Spalte, ohne das sichtbare
         * Original zu bewegen.
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
             * Messkopie in die Info-Spalte einsetzen.
             * position:fixed verhindert eine Veränderung des
             * sichtbaren Layouts.
             */
            infoColumn.appendChild(clone);


            /*
             * In der Kopie enthaltene Benefits-Container
             * für die Zielbreite korrekt einstellen.
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


        /**
         * Element an seine ursprüngliche Position unterhalb
         * der Galerie zurücksetzen.
         */
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


        /**
         * Element in die rechte Info-Spalte verschieben.
         */
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


        /**
         * Benefits-Container nach einer endgültigen
         * Positionsänderung neu berechnen lassen.
         */
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


        /**
         * Berechnet die endgültigen Positionen.
         */
        function updateFlowLayout() {
            if (running) {
                requestedAgain = true;
                return;
            }

            running = true;
            requestedAgain = false;


            /*
             * Bei untereinander angeordneten Hauptspalten
             * bleiben auch beide Zusatzbereiche unten.
             */
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
                console.warn(
                    'Kein sichtbares Galerie-Widget gefunden.'
                );

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


            /*
             * Hier wird nicht mehr die möglicherweise
             * gestreckte Höhe von product-info-main verwendet.
             */
            const infoMainHeight =
                getActualInfoMainHeight();


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

                        item.element.dataset.measuredHeight =
                            Math.round(itemHeight);

                        item.element.dataset.requiredHeight =
                            Math.round(requiredHeight);


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
             * Sichtbare Originale erst nach abgeschlossener
             * Berechnung genau einmal verschieben.
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


            /*
             * Messwerte im HTML speichern.
             * Diese Werte können bei Bedarf in der
             * Browserkonsole kontrolliert werden.
             */
            layout.dataset.galleryHeight =
                Math.round(galleryHeight);

            layout.dataset.infoMainActualHeight =
                Math.round(infoMainHeight);

            layout.dataset.usedRightHeight =
                Math.round(usedHeight);


            running = false;


            if (requestedAgain) {
                requestedAgain = false;
                scheduleFlowUpdate();
            }
        }


        /**
         * Aktualisierung für den nächsten Browser-Frame planen.
         */
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


        /**
         * Relevante Größenänderungen beobachten.
         *
         * Die Flow-Elemente selbst werden nicht beobachtet.
         * Dadurch löst das interne Benefits-Layout keine
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


        /**
         * Nachgeladene Galerie-Bilder berücksichtigen.
         */
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

    /* =========================================================
   WOODMART – VERTIKALE THUMBNAIL-HÖHE KORRIGIEREN

   Problem:
   Beim ersten Laden setzt Woodmart --wd-thumbs-height auf
   die Höhe des gesamten Galeriecontainers.

   Korrekt ist jedoch die Höhe der Hauptbild-Galerie
   .wd-gallery-images.

   Dieser Code:
   - verwendet die tatsächliche Hauptgaleriehöhe
   - korrigiert die Thumbnail-Gesamthöhe
   - korrigiert die einzelnen Thumbnail-Höhen
   - verändert den von Woodmart/Elementor gesetzten Gap nicht
   - löst keine künstlichen resize-Ereignisse aus
   ========================================================= */

(function () {
    'use strict';

    const GALLERY_COLUMN_SELECTOR =
        '.product-gallery-column';

    const PRODUCT_GALLERY_SELECTOR =
        '.woocommerce-product-gallery';

    const MAIN_GALLERY_SELECTOR =
        '.wd-carousel-container.wd-gallery-images';

    const THUMB_CONTAINER_SELECTOR =
        '.wd-carousel-container.wd-gallery-thumb';

    const THUMB_CAROUSEL_SELECTOR =
        '.wd-carousel.wd-vertical';

    const THUMB_ITEM_SELECTOR =
        '.wd-carousel-item';

    const REFRESH_DELAYS = [
        0,
        100,
        300,
        700,
        1200
    ];


    /**
     * Prüft, ob ein Element sichtbar und messbar ist.
     */
    function isMeasurable(element) {
        if (!element) {
            return false;
        }

        const style =
            window.getComputedStyle(element);

        const rect =
            element.getBoundingClientRect();

        return (
            style.display !== 'none' &&
            rect.width > 0 &&
            rect.height > 0
        );
    }


    /**
     * Liest eine Ganzzahl aus einer CSS-Variable.
     */
    function readCssInteger(
        element,
        propertyName
    ) {
        const style =
            window.getComputedStyle(element);

        const value =
            parseInt(
                style.getPropertyValue(
                    propertyName
                ),
                10
            );

        return Number.isFinite(value)
            ? value
            : 0;
    }


    /**
     * Ermittelt, wie viele Thumbnails gleichzeitig
     * sichtbar sein sollen.
     */
    function getVisibleThumbnailCount(
        thumbCarousel,
        thumbItems
    ) {
        /*
         * Zunächst die von Woodmart als sichtbar markierten
         * Slides verwenden.
         */
        const visibleItems =
            thumbItems.filter(function (item) {
                return (
                    item.classList.contains(
                        'wd-slide-visible'
                    ) ||
                    item.classList.contains(
                        'wd-full-visible'
                    )
                );
            });

        if (visibleItems.length > 0) {
            return visibleItems.length;
        }

        /*
         * Fallback auf Woodmarts CSS-Variablen.
         */
        const largeCount =
            readCssInteger(
                thumbCarousel,
                '--wd-col-lg'
            );

        if (largeCount > 0) {
            return largeCount;
        }

        const mediumCount =
            readCssInteger(
                thumbCarousel,
                '--wd-col-md'
            );

        if (mediumCount > 0) {
            return mediumCount;
        }

        const smallCount =
            readCssInteger(
                thumbCarousel,
                '--wd-col-sm'
            );

        if (smallCount > 0) {
            return smallCount;
        }

        return 2;
    }


    /**
     * Korrigiert eine sichtbare Produktgalerie.
     */
    function synchronizeGallery(
        galleryColumn
    ) {
        const productGalleries =
            Array.from(
                galleryColumn.querySelectorAll(
                    PRODUCT_GALLERY_SELECTOR
                )
            );

        /*
         * Auf der Seite können unsichtbare Galerievarianten
         * für andere Breakpoints vorhanden sein.
         */
        const productGallery =
            productGalleries.find(
                isMeasurable
            );

        if (!productGallery) {
            return;
        }

        const mainGallery =
            productGallery.querySelector(
                MAIN_GALLERY_SELECTOR
            );

        const thumbContainer =
            productGallery.querySelector(
                THUMB_CONTAINER_SELECTOR
            );

        const thumbCarousel =
            thumbContainer?.querySelector(
                THUMB_CAROUSEL_SELECTOR
            );

        if (
            !isMeasurable(mainGallery) ||
            !thumbContainer ||
            !thumbCarousel
        ) {
            return;
        }

        const mainGalleryRect =
            mainGallery.getBoundingClientRect();

        const thumbContainerRect =
            thumbContainer.getBoundingClientRect();

        const thumbCarouselRect =
            thumbCarousel.getBoundingClientRect();

        const mainGalleryHeight =
            Math.round(
                mainGalleryRect.height
            );

        if (mainGalleryHeight <= 0) {
            return;
        }

        /*
         * Differenz zwischen äußerem Thumbnailbereich und
         * eigentlichem Slider. Das sind bei deiner Galerie
         * ungefähr 30px für die Navigationsbuttons.
         */
        let controlsHeight =
            Math.round(
                thumbContainerRect.height -
                thumbCarouselRect.height
            );

        if (
            !Number.isFinite(controlsHeight) ||
            controlsHeight < 0 ||
            controlsHeight > 100
        ) {
            controlsHeight = 30;
        }

        const targetCarouselHeight =
            Math.max(
                1,
                mainGalleryHeight -
                controlsHeight
            );

        /*
         * Woodmarts entscheidende Höhenvariable korrigieren.
         */
        productGallery.style.setProperty(
            '--wd-thumbs-height',
            `${mainGalleryHeight}px`
        );

        /*
         * Äußerer Thumbnailbereich.
         */
        thumbContainer.style.setProperty(
            'height',
            `${mainGalleryHeight}px`
        );

        /*
         * Nur die Höhe setzen.
         * Gap, Breite und Grid-Einstellungen bleiben erhalten.
         */
        thumbCarousel.style.setProperty(
            'height',
            `${targetCarouselHeight}px`
        );

        const thumbItems =
            Array.from(
                thumbCarousel.querySelectorAll(
                    THUMB_ITEM_SELECTOR
                )
            );

        if (!thumbItems.length) {
            return;
        }

        const visibleCount =
            Math.max(
                1,
                getVisibleThumbnailCount(
                    thumbCarousel,
                    thumbItems
                )
            );

        /*
         * Woodmart berechnet die Slidehöhe ebenfalls als
         * Sliderhöhe geteilt durch sichtbare Slides.
         *
         * Beispiel nach deinem korrekten Neuladen:
         * 882px / 2 = 441px.
         */
        const targetItemHeight =
            targetCarouselHeight /
            visibleCount;

        thumbItems.forEach(function (item) {
            item.style.setProperty(
                'height',
                `${targetItemHeight}px`
            );
        });

        productGallery.dataset
            .jgMainGalleryHeight =
            String(mainGalleryHeight);

        productGallery.dataset
            .jgThumbCarouselHeight =
            String(targetCarouselHeight);

        productGallery.dataset
            .jgThumbItemHeight =
            String(
                Math.round(
                    targetItemHeight * 10
                ) / 10
            );
    }


    /**
     * Alle sichtbaren Produktgalerien korrigieren.
     */
    function synchronizeAllGalleries() {
        document
            .querySelectorAll(
                GALLERY_COLUMN_SELECTOR
            )
            .forEach(
                synchronizeGallery
            );
    }


    /**
     * Mehrere Korrekturen einplanen, weil Woodmart und
     * Lazy Loading ihre Maße zeitversetzt setzen können.
     */
    function scheduleSynchronization() {
        REFRESH_DELAYS.forEach(
            function (delay) {
                window.setTimeout(
                    function () {
                        window.requestAnimationFrame(
                            synchronizeAllGalleries
                        );
                    },
                    delay
                );
            }
        );
    }


    /**
     * Änderungen an Galerie-Bildern berücksichtigen.
     */
    function observeGalleryImages(
        galleryColumn
    ) {
        galleryColumn
            .querySelectorAll('img')
            .forEach(function (image) {
                if (
                    image.dataset
                        .jgThumbHeightObserved ===
                    'true'
                ) {
                    return;
                }

                image.dataset
                    .jgThumbHeightObserved =
                    'true';

                image.addEventListener(
                    'load',
                    scheduleSynchronization
                );

                image.addEventListener(
                    'error',
                    scheduleSynchronization
                );
            });
    }


    /**
     * Initialisierung.
     */
    function initializeThumbnailCorrection() {
        const galleryColumns =
            document.querySelectorAll(
                GALLERY_COLUMN_SELECTOR
            );

        if (!galleryColumns.length) {
            return;
        }

        galleryColumns.forEach(
            function (galleryColumn) {
                observeGalleryImages(
                    galleryColumn
                );

                const mainGalleries =
                    galleryColumn
                        .querySelectorAll(
                            MAIN_GALLERY_SELECTOR
                        );

                /*
                 * Nur Änderungen der Hauptgaleriehöhe
                 * beobachten.
                 */
                const resizeObserver =
                    new ResizeObserver(
                        scheduleSynchronization
                    );

                mainGalleries.forEach(
                    function (mainGallery) {
                        resizeObserver.observe(
                            mainGallery
                        );
                    }
                );

                /*
                 * Lazy Loading oder Variationswechsel kann
                 * neue Bilder einsetzen.
                 */
                const mutationObserver =
                    new MutationObserver(
                        function (mutations) {
                            const hasAddedNodes =
                                mutations.some(
                                    function (
                                        mutation
                                    ) {
                                        return (
                                            mutation.type ===
                                                'childList' &&
                                            mutation
                                                .addedNodes
                                                .length > 0
                                        );
                                    }
                                );

                            if (!hasAddedNodes) {
                                return;
                            }

                            observeGalleryImages(
                                galleryColumn
                            );

                            scheduleSynchronization();
                        }
                    );

                mutationObserver.observe(
                    galleryColumn,
                    {
                        subtree: true,
                        childList: true
                    }
                );
            }
        );

        scheduleSynchronization();

        window.addEventListener(
            'pageshow',
            scheduleSynchronization
        );

        window.addEventListener(
            'orientationchange',
            scheduleSynchronization
        );

        if (window.jQuery) {
            window.jQuery(document).on(
                [
                    'found_variation',
                    'reset_data',
                    'woocommerce_variation_has_changed',
                    'woodmart-ajax-content-reloaded',
                    'pjax:complete',
                    'pjax:end'
                ].join(' '),
                scheduleSynchronization
            );
        }
    }


    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            initializeThumbnailCorrection
        );
    } else {
        initializeThumbnailCorrection();
    }
})();

/* =========================================================
   SOCIAL MEDIA – AUTOMATISCH EIN- ODER ZWEIZEILIG
   ========================================================= */

(function () {
    'use strict';

    const SOCIAL_SELECTOR =
        '.single-product .wd-social-icons';

    const TWO_LINES_CLASS =
        'jg-social-two-lines';

    const WIDTH_RESERVE = 5;

    function updateSocialLayout(container) {
        if (
            !container ||
            container.getClientRects().length === 0
        ) {
            return;
        }

        /*
         * Zuerst den einzeiligen Zustand herstellen.
         */
        container.classList.remove(
            TWO_LINES_CLASS
        );

        void container.offsetWidth;

        /*
         * scrollWidth ist die tatsächlich benötigte Breite
         * des gesamten Social-Bereichs ohne Umbruch.
         */
        const requiredWidth =
            container.scrollWidth;

        const availableWidth =
            container.clientWidth;

        container.classList.toggle(
            TWO_LINES_CLASS,
            requiredWidth >
                availableWidth + WIDTH_RESERVE
        );

        container.dataset.jgSocialRequiredWidth =
            String(Math.round(requiredWidth));

        container.dataset.jgSocialAvailableWidth =
            String(Math.round(availableWidth));
    }

    function initializeSocialLayout(container) {
        if (
            container.dataset.jgSocialInitialized ===
            'true'
        ) {
            return;
        }

        container.dataset.jgSocialInitialized =
            'true';

        let frameId = null;

        function scheduleUpdate() {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }

            frameId =
                requestAnimationFrame(function () {
                    frameId = null;
                    updateSocialLayout(container);
                });
        }

        const resizeObserver =
            new ResizeObserver(scheduleUpdate);

        resizeObserver.observe(container);

        window.addEventListener(
            'orientationchange',
            scheduleUpdate
        );

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

    function startSocialLayouts() {
        document
            .querySelectorAll(SOCIAL_SELECTOR)
            .forEach(initializeSocialLayout);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            startSocialLayouts
        );
    } else {
        startSocialLayouts();
    }
})();

/* =========================================================
   AUSVERKAUFTE GRÖSSEN + WOODMART WAITLIST
   ========================================================= */

(function () {
    'use strict';

    const SIZE_ATTRIBUTE = 'attribute_pa_groessen';
    const SIZE_SWATCH_SELECTOR =
        '[data-id="pa_groessen"] .wd-swatch[data-value]';

    /**
     * Liefert die Variationsdaten eines WooCommerce-Formulars.
     */
    function getVariations(form) {
        if (!form) {
            return [];
        }

        if (window.jQuery) {
            const jqueryVariations =
                window.jQuery(form).data('product_variations');

            if (Array.isArray(jqueryVariations)) {
                return jqueryVariations;
            }
        }

        const rawVariations =
            form.getAttribute('data-product_variations');

        if (!rawVariations || rawVariations === 'false') {
            return [];
        }

        try {
            const parsedVariations = JSON.parse(rawVariations);

            return Array.isArray(parsedVariations)
                ? parsedVariations
                : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Prüft, ob eine Variation zu den momentan ausgewählten
     * Attributen passt. Die Größe selbst wird dabei ignoriert.
     */
    function variationMatchesOtherAttributes(
        variation,
        form
    ) {
        const attributes = variation.attributes || {};
        const selects = form.querySelectorAll(
            'select[name^="attribute_"]'
        );

        return Array.from(selects).every(function (select) {
            const attributeName = select.name;
            const selectedValue = select.value;

            if (
                attributeName === SIZE_ATTRIBUTE ||
                !selectedValue
            ) {
                return true;
            }

            const variationValue =
                attributes[attributeName] || '';

            /*
             * Leerer Variationswert bedeutet:
             * Die Variation gilt für jeden Wert dieses Attributs.
             */
            return (
                variationValue === '' ||
                variationValue === selectedValue
            );
        });
    }

    /**
     * Prüft, ob eine Variation zur jeweiligen Größe gehört.
     */
    function variationMatchesSize(
        variation,
        sizeValue
    ) {
        const attributes = variation.attributes || {};
        const variationSize =
            attributes[SIZE_ATTRIBUTE] || '';

        return (
            variationSize === '' ||
            variationSize === sizeValue
        );
    }

    /**
     * Kennzeichnet verfügbare und ausverkaufte Größen.
     */
    function updateSizeStockClasses(form) {
        const variations = getVariations(form);

        if (!variations.length) {
            return;
        }

        const swatches =
            form.querySelectorAll(SIZE_SWATCH_SELECTOR);

        swatches.forEach(function (swatch) {
            const sizeValue =
                swatch.getAttribute('data-value');

            if (!sizeValue) {
                return;
            }

            const matchingVariations =
                variations.filter(function (variation) {
                    return (
                        variationMatchesSize(
                            variation,
                            sizeValue
                        ) &&
                        variationMatchesOtherAttributes(
                            variation,
                            form
                        )
                    );
                });

            /*
             * Existiert überhaupt keine passende Kombination,
             * bleibt WoodMarts normale Deaktivierung bestehen.
             */
            if (!matchingVariations.length) {
                swatch.classList.remove(
                    'jg-out-of-stock',
                    'jg-in-stock'
                );

                swatch.removeAttribute(
                    'data-jg-stock-status'
                );

                return;
            }

            const isInStock =
                matchingVariations.some(function (variation) {
                    return variation.is_in_stock === true;
                });

            swatch.classList.toggle(
                'jg-in-stock',
                isInStock
            );

            swatch.classList.toggle(
                'jg-out-of-stock',
                !isInStock
            );

            swatch.setAttribute(
                'data-jg-stock-status',
                isInStock ? 'in-stock' : 'out-of-stock'
            );

            if (!isInStock) {
                /*
                 * Die Größe muss anklickbar bleiben, damit
                 * WoodMart ihre Waitlist anzeigen kann.
                 */
                swatch.classList.remove('wd-disabled');
                swatch.classList.add('wd-enabled');
                swatch.removeAttribute('disabled');
                swatch.setAttribute('aria-disabled', 'false');
            }
        });
    }


/**
 * Macht eine ausverkaufte Größe vor dem normalen
 * WoodMart-Klick anklickbar.
 *
 * Der Klick wird nicht blockiert, damit WoodMart selbst
 * die Variante auswählt und die Waitlist aktualisiert.
 */
function prepareOutOfStockSizeClick(event) {
    const swatch = event.target.closest(
        '.wd-swatch.jg-out-of-stock[data-value]'
    );

    if (!swatch) {
        return;
    }

    const form = swatch.closest(
        'form.variations_form'
    );

    if (!form) {
        return;
    }

    const sizeSelect = form.querySelector(
        'select[name="' + SIZE_ATTRIBUTE + '"]'
    );

    if (!sizeSelect) {
        return;
    }

    const sizeValue =
        swatch.getAttribute('data-value');

    const option = Array.from(
        sizeSelect.options
    ).find(function (currentOption) {
        return currentOption.value === sizeValue;
    });

    swatch.classList.remove('wd-disabled');
    swatch.classList.add('wd-enabled');
    swatch.removeAttribute('disabled');
    swatch.setAttribute('aria-disabled', 'false');

    if (option) {
        option.disabled = false;
    }
}



    function initializeStockSwatches() {
        document
            .querySelectorAll('form.variations_form')
            .forEach(function (form) {
                updateSizeStockClasses(form);

                if (window.jQuery) {
                    window.jQuery(form).on(
                        [
                            'woocommerce_update_variation_values.jgStock',
                            'woocommerce_variation_has_changed.jgStock',
                            'found_variation.jgStock',
                            'reset_data.jgStock'
                        ].join(' '),
                        function () {
                            window.setTimeout(function () {
                                updateSizeStockClasses(form);
                            }, 0);
                        }
                    );
                }

                form.addEventListener(
                    'change',
                    function () {
                        window.setTimeout(function () {
                            updateSizeStockClasses(form);
                        }, 0);
                    }
                );
            });
    }

    /*
     * Capture-Modus ist erforderlich, damit der Klick auf eine
     * von WoodMart deaktivierte Größe zuerst verarbeitet wird.
     */
  document.addEventListener(
    'click',
    prepareOutOfStockSizeClick,
    true
);

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeStockSwatches
        );
    } else {
        initializeStockSwatches();
    }

    window.setTimeout(
        initializeStockSwatches,
        500
    );
})();


/* =========================================================
   ARTIKELNUMMER / EAN AN GEWÄHLTE VARIATION ANPASSEN

   Die "Zusätzliche Informationen"-Tabelle zeigt serverseitig
   nur die Werte der ersten gefundenen Variation. Sobald der
   Kunde eine andere Größe wählt, werden Artikelnummer und EAN
   hier auf die tatsächlich gewählte Variation aktualisiert.

   Woodmart aktualisiert die Swatches unabhängig vom
   WooCommerce-Kernevent "found_variation", daher wird die
   passende Variante zusätzlich selbst anhand der aktuell
   gewählten Attribute in den Variationsdaten des Formulars
   gesucht (data-product_variations).
   ========================================================= */

(function () {
    'use strict';

    function updateAllMatchingFields(selector, value) {
        if (!value) {
            return;
        }

        document.querySelectorAll(selector).forEach(function (element) {
            element.textContent = value;
        });
    }

    function updateSkuEanDisplay(variation) {
        if (!variation) {
            return;
        }

        updateAllMatchingFields(
            '#jg-sku-value',
            variation.jg_sku
        );

        updateAllMatchingFields(
            '#jg-ean-value',
            variation.jg_ean
        );
    }

    function getFormVariations(form) {
        if (form.jgVariationsCache) {
            return form.jgVariationsCache;
        }

        var raw =
            form.getAttribute('data-product_variations');

        if (!raw || raw === 'false') {
            return null;
        }

        try {
            form.jgVariationsCache = JSON.parse(raw);
        } catch (e) {
            form.jgVariationsCache = null;
        }

        return form.jgVariationsCache;
    }

    function getSelectedAttributes(form) {
        var selected = {};

        form
            .querySelectorAll(
                'select[name^="attribute_"], input[name^="attribute_"]:checked'
            )
            .forEach(function (input) {
                if (input.value) {
                    selected[input.name] = input.value;
                }
            });

        return selected;
    }

    function findMatchingVariation(variations, selectedAttributes) {
        if (!variations || !variations.length) {
            return null;
        }

        var selectedKeys = Object.keys(selectedAttributes);

        if (!selectedKeys.length) {
            return null;
        }

        return (
            variations.find(function (variation) {
                return selectedKeys.every(function (key) {
                    var required =
                        variation.attributes[key];

                    return (
                        !required ||
                        required === selectedAttributes[key]
                    );
                });
            }) || null
        );
    }

    function syncSkuEanFromForm(form) {
        var variations =
            getFormVariations(form);

        var selectedAttributes =
            getSelectedAttributes(form);

        var matchedVariation =
            findMatchingVariation(
                variations,
                selectedAttributes
            );

        updateSkuEanDisplay(matchedVariation);
    }

    function initializeSkuEanSync() {
        var forms =
            document.querySelectorAll('form.variations_form');

        if (!forms.length) {
            return;
        }

        forms.forEach(function (form) {
            if (
                form.getAttribute(
                    'data-jg-sku-ean-sync'
                ) === 'true'
            ) {
                return;
            }

            form.setAttribute(
                'data-jg-sku-ean-sync',
                'true'
            );

            if (window.jQuery) {
                window.jQuery(form).on(
                    'found_variation',
                    function (event, variation) {
                        updateSkuEanDisplay(variation);
                    }
                );
            }

            /*
             * Zusätzlicher, von Woodmart unabhängiger Abgleich:
             * greift auch, wenn die Swatches selbst nur den
             * versteckten Select ändern, ohne found_variation
             * auszulösen.
             */
            form.addEventListener(
                'change',
                function (event) {
                    if (
                        event.target &&
                        event.target.name &&
                        event.target.name.indexOf(
                            'attribute_'
                        ) === 0
                    ) {
                        syncSkuEanFromForm(form);
                    }
                },
                true
            );

            form.addEventListener(
                'click',
                function (event) {
                    if (
                        !event.target ||
                        !event.target.closest ||
                        !event.target.closest('.wd-swatch')
                    ) {
                        return;
                    }

                    window.setTimeout(function () {
                        syncSkuEanFromForm(form);
                    }, 100);
                },
                true
            );
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeSkuEanSync
        );
    } else {
        initializeSkuEanSync();
    }

    window.setTimeout(
        initializeSkuEanSync,
        500
    );
})();