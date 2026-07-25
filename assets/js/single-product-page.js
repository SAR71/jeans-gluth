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
   WOODMART PRODUKTGALERIE STABIL NACHINITIALISIEREN

   Problem:
   Woodmart berechnet die Thumbnail-Galerie teilweise,
   bevor die endgültige Breite des Produktlayouts feststeht.

   Diese Version:
   - wartet nicht blockierend auf Lazy-Load-Bilder
   - aktualisiert bekannte Slider-Systeme
   - löst mehrere zeitlich versetzte Aktualisierungen aus
   - reagiert auf Bildladung und Breitenänderungen
   - blendet die Galerie niemals aus
   ========================================================= */

(function () {
    'use strict';

    const GALLERY_COLUMN_SELECTOR =
        '.product-gallery-column';

    /*
     * Zeitpunkte für weitere Aktualisierungen.
     *
     * Woodmart, Elementor und Lazy Loading können zu
     * unterschiedlichen Zeitpunkten fertig werden.
     */
    const REFRESH_DELAYS = [
        0,
        100,
        300,
        700,
        1200,
        2000
    ];

    let resizeTimer = null;
    let refreshRunning = false;
    let lastObservedWidth = 0;


    /**
     * Prüft, ob ein Element sichtbar beziehungsweise
     * grundsätzlich messbar ist.
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
     * Sucht eine Swiper-Instanz auch auf übergeordneten
     * oder inneren Elementen.
     */
    function refreshSwiper(galleryColumn) {
        let refreshed = false;

        const candidates =
            Array.from(
                galleryColumn.querySelectorAll(
                    [
                        '.swiper',
                        '.swiper-container',
                        '.wd-carousel',
                        '.wd-carousel-container',
                        '.wd-gallery-images'
                    ].join(',')
                )
            );

        /*
         * Auch die Galerie-Spalte selbst prüfen.
         */
        candidates.unshift(
            galleryColumn
        );

        candidates.forEach(function (element) {
            const swiper =
                element.swiper;

            if (!swiper) {
                return;
            }

            try {
                if (
                    typeof swiper.updateSize ===
                    'function'
                ) {
                    swiper.updateSize();
                }

                if (
                    typeof swiper.updateSlides ===
                    'function'
                ) {
                    swiper.updateSlides();
                }

                if (
                    typeof swiper.updateSlidesOffset ===
                    'function'
                ) {
                    swiper.updateSlidesOffset();
                }

                if (
                    typeof swiper.updateSlidesClasses ===
                    'function'
                ) {
                    swiper.updateSlidesClasses();
                }

                if (
                    typeof swiper.updateProgress ===
                    'function'
                ) {
                    swiper.updateProgress();
                }

                if (
                    typeof swiper.update ===
                    'function'
                ) {
                    swiper.update();
                }

                refreshed = true;
            } catch (error) {
                console.warn(
                    'Swiper konnte nicht aktualisiert werden.',
                    error
                );
            }
        });

        return refreshed;
    }


    /**
     * Aktualisiert eine eventuell vorhandene Flickity-Galerie.
     */
    function refreshFlickity(galleryColumn) {
        if (
            !window.Flickity ||
            typeof window.Flickity.data !==
                'function'
        ) {
            return false;
        }

        let refreshed = false;

        galleryColumn
            .querySelectorAll(
                '.flickity-enabled'
            )
            .forEach(function (element) {
                const instance =
                    window.Flickity.data(
                        element
                    );

                if (!instance) {
                    return;
                }

                try {
                    if (
                        typeof instance.resize ===
                        'function'
                    ) {
                        instance.resize();
                    }

                    if (
                        typeof instance.reloadCells ===
                        'function'
                    ) {
                        instance.reloadCells();
                    }

                    if (
                        typeof instance.reposition ===
                        'function'
                    ) {
                        instance.reposition();
                    }

                    refreshed = true;
                } catch (error) {
                    console.warn(
                        'Flickity konnte nicht aktualisiert werden.',
                        error
                    );
                }
            });

        return refreshed;
    }


    /**
     * Aktualisiert Owl Carousel, falls Woodmart an dieser
     * Stelle Owl verwendet.
     */
    function refreshOwlCarousel(
        galleryColumn
    ) {
        if (!window.jQuery) {
            return false;
        }

        let refreshed = false;

        window.jQuery(galleryColumn)
            .find('.owl-carousel')
            .each(function () {
                const carousel =
                    window.jQuery(this);

                const instance =
                    carousel.data(
                        'owl.carousel'
                    );

                if (!instance) {
                    return;
                }

                try {
                    carousel.trigger(
                        'refresh.owl.carousel'
                    );

                    refreshed = true;
                } catch (error) {
                    console.warn(
                        'Owl Carousel konnte nicht aktualisiert werden.',
                        error
                    );
                }
            });

        return refreshed;
    }


    /**
     * Aktualisiert Slick, falls eine installierte Woodmart-
     * Variante oder Erweiterung Slick verwendet.
     */
    function refreshSlick(galleryColumn) {
        if (!window.jQuery) {
            return false;
        }

        let refreshed = false;

        window.jQuery(galleryColumn)
            .find('.slick-initialized')
            .each(function () {
                const slider =
                    window.jQuery(this);

                try {
                    slider.slick(
                        'setPosition'
                    );

                    refreshed = true;
                } catch (error) {
                    /*
                     * Keine Ausgabe erforderlich, wenn Slick
                     * zwar als Klasse vorkommt, aber nicht als
                     * Plugin verfügbar ist.
                     */
                }
            });

        return refreshed;
    }


    /**
     * Entfernt veraltete Inline-Höhen von Thumbnail-Bildern,
     * ohne die von Woodmart gesetzten Breiten zu verändern.
     */
    function normalizeThumbnailImages(
        galleryColumn
    ) {
        const thumbnailSelectors = [
            '.wd-gallery-thumb img',
            '.wd-gallery-thumb .wd-carousel-item img',
            '.woocommerce-product-gallery .flex-control-thumbs img',
            '.woocommerce-product-gallery__image img'
        ];

        galleryColumn
            .querySelectorAll(
                thumbnailSelectors.join(',')
            )
            .forEach(function (image) {
                /*
                 * Nur offensichtlich fehlerhafte feste Höhen
                 * entfernen. Breite, srcset und andere
                 * Woodmart-Werte bleiben erhalten.
                 */
                const inlineHeight =
                    image.style.height;

                if (
                    inlineHeight &&
                    inlineHeight !== 'auto'
                ) {
                    image.style.removeProperty(
                        'height'
                    );
                }

                image.style.setProperty(
                    'max-width',
                    '100%'
                );
            });
    }


    /**
     * Führt eine einzelne Galerie-Aktualisierung aus.
     */
    function refreshGallery() {
        const galleryColumn =
            document.querySelector(
                GALLERY_COLUMN_SELECTOR
            );

        if (
            !galleryColumn ||
            !isMeasurable(galleryColumn)
        ) {
            return;
        }

        if (refreshRunning) {
            return;
        }

        const width =
            galleryColumn
                .getBoundingClientRect()
                .width;

        if (
            !Number.isFinite(width) ||
            width <= 0
        ) {
            return;
        }

        refreshRunning = true;

        /*
         * Erst vorhandene falsche feste Bildhöhen entfernen.
         */
        normalizeThumbnailImages(
            galleryColumn
        );

        /*
         * Bekannte Slider-Systeme aktualisieren.
         */
        refreshSwiper(
            galleryColumn
        );

        refreshFlickity(
            galleryColumn
        );

        refreshOwlCarousel(
            galleryColumn
        );

        refreshSlick(
            galleryColumn
        );

        /*
         * Woodmart und andere responsive Komponenten reagieren
         * häufig auf das normale Resize-Ereignis.
         */
        window.dispatchEvent(
            new Event('resize')
        );

        if (window.jQuery) {
            window.jQuery(window).trigger(
                'resize'
            );
        }

        /*
         * Browser die neuen Größen berechnen lassen und
         * danach die Slider ein zweites Mal aktualisieren.
         */
        window.requestAnimationFrame(
            function () {
                window.requestAnimationFrame(
                    function () {
                        refreshSwiper(
                            galleryColumn
                        );

                        refreshFlickity(
                            galleryColumn
                        );

                        refreshOwlCarousel(
                            galleryColumn
                        );

                        refreshSlick(
                            galleryColumn
                        );

                        galleryColumn.classList.add(
                            'jg-gallery-refreshed'
                        );

                        lastObservedWidth =
                            Math.round(
                                galleryColumn
                                    .getBoundingClientRect()
                                    .width
                            );

                        refreshRunning = false;
                    }
                );
            }
        );
    }


    /**
     * Mehrere Aktualisierungen zeitversetzt einplanen.
     *
     * Es wird ausdrücklich nicht auf alle Bilder gewartet.
     * Lazy-Load-Bilder könnten sonst die Initialisierung
     * dauerhaft blockieren.
     */
    function scheduleRefreshSequence() {
        REFRESH_DELAYS.forEach(
            function (delay) {
                window.setTimeout(
                    refreshGallery,
                    delay
                );
            }
        );
    }


    /**
     * Bildereignisse nachträglich registrieren.
     */
    function observeGalleryImages(
        galleryColumn
    ) {
        galleryColumn
            .querySelectorAll('img')
            .forEach(function (image) {
                if (
                    image.dataset
                        .jgGalleryObserved ===
                    'true'
                ) {
                    return;
                }

                image.dataset.jgGalleryObserved =
                    'true';

                image.addEventListener(
                    'load',
                    function () {
                        window.requestAnimationFrame(
                            refreshGallery
                        );
                    }
                );

                image.addEventListener(
                    'error',
                    function () {
                        window.requestAnimationFrame(
                            refreshGallery
                        );
                    }
                );
            });
    }


    /**
     * Galerie initialisieren.
     */
    function initializeGalleryRefresh() {
        const galleryColumn =
            document.querySelector(
                GALLERY_COLUMN_SELECTOR
            );

        if (!galleryColumn) {
            return;
        }

        observeGalleryImages(
            galleryColumn
        );

        /*
         * Auf echte Breitenänderungen reagieren.
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
                        lastObservedWidth > 0 &&
                        Math.abs(
                            width -
                            lastObservedWidth
                        ) < 2
                    ) {
                        return;
                    }

                    if (resizeTimer !== null) {
                        window.clearTimeout(
                            resizeTimer
                        );
                    }

                    resizeTimer =
                        window.setTimeout(
                            function () {
                                resizeTimer = null;
                                refreshGallery();
                            },
                            80
                        );
                }
            );

        resizeObserver.observe(
            galleryColumn
        );

        /*
         * Neu eingefügte Lazy-Load-Bilder erfassen.
         *
         * Der Observer aktualisiert nicht direkt wegen jeder
         * Klassenänderung, sondern nur bei neuen Elementen.
         */
        const mutationObserver =
            new MutationObserver(
                function (mutations) {
                    const hasNewNodes =
                        mutations.some(
                            function (mutation) {
                                return (
                                    mutation.type ===
                                        'childList' &&
                                    mutation.addedNodes.length > 0
                                );
                            }
                        );

                    if (!hasNewNodes) {
                        return;
                    }

                    observeGalleryImages(
                        galleryColumn
                    );

                    window.requestAnimationFrame(
                        refreshGallery
                    );
                }
            );

        mutationObserver.observe(
            galleryColumn,
            {
                subtree: true,
                childList: true
            }
        );

        /*
         * Initiale Aktualisierungsserie starten.
         */
        scheduleRefreshSequence();


        /*
         * Browser-Cache beziehungsweise Zurück-Navigation.
         */
        window.addEventListener(
            'pageshow',
            scheduleRefreshSequence
        );


        window.addEventListener(
            'orientationchange',
            scheduleRefreshSequence
        );


        /*
         * Variationswechsel können Galerieelemente ersetzen.
         */
        if (window.jQuery) {
            window.jQuery(document).on(
                [
                    'found_variation',
                    'reset_data',
                    'woocommerce_variation_has_changed'
                ].join(' '),
                function () {
                    window.setTimeout(
                        function () {
                            observeGalleryImages(
                                galleryColumn
                            );

                            scheduleRefreshSequence();
                        },
                        50
                    );
                }
            );
        }
    }


    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            initializeGalleryRefresh
        );
    } else {
        initializeGalleryRefresh();
    }
})();