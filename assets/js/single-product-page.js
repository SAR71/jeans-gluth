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

    const flowContent =
        layout.querySelector('.product-flow-content');

    if (
        !productTop ||
        !galleryColumn ||
        !infoColumn ||
        !infoMain ||
        !flowContent
    ) {
        console.warn('Produktlayout unvollständig.', {
            productTop,
            galleryColumn,
            infoColumn,
            infoMain,
            flowContent,
        });

        return;
    }

    /*
     * Ursprüngliche Elementor-Position des Zusatzbereichs
     * dauerhaft merken.
     */
    const placeholder = document.createComment(
        'product-flow-original-position'
    );

    flowContent.parentNode.insertBefore(
        placeholder,
        flowContent
    );

    let frameId = null;
    let updateRunning = false;

    function isVisible(element) {
        if (!element) {
            return false;
        }

        const style = window.getComputedStyle(element);

        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity || '1') !== 0 &&
            element.getClientRects().length > 0
        );
    }

    /*
     * Höhe einschließlich oberem und unterem Margin.
     */
    function getOuterHeight(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

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

    /*
     * Nicht den möglicherweise gestreckten Galerie-Container
     * messen, sondern das tatsächlich sichtbare Galerie-Widget.
     *
     * Da du zwei Product-Gallery-Widgets für unterschiedliche
     * Breakpoints verwendest, wird nur das aktuell sichtbare
     * Widget berücksichtigt.
     */
    function getVisibleGalleryWidget() {
        const directChildren =
            Array.from(galleryColumn.children);

        const visibleDirectChildren =
            directChildren.filter(isVisible);

        if (visibleDirectChildren.length) {
            return visibleDirectChildren.reduce(
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
         * Fallback, falls Elementor noch einen zusätzlichen
         * Wrapper zwischen Spalte und Galerie eingefügt hat.
         */
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

    function moveBelow() {
        const originalParent =
            placeholder.parentNode;

        if (!originalParent) {
            return;
        }

        const alreadyBelow =
            flowContent.parentNode === originalParent &&
            flowContent.previousSibling === placeholder;

        if (!alreadyBelow) {
            originalParent.insertBefore(
                flowContent,
                placeholder.nextSibling
            );
        }

        flowContent.classList.remove(
            'is-beside-gallery'
        );

        layout.dataset.productFlow = 'below';
    }

    function moveBeside() {
        const alreadyBeside =
            flowContent.parentNode === infoColumn;

        if (!alreadyBeside) {
            infoColumn.appendChild(flowContent);
        }

        flowContent.classList.add(
            'is-beside-gallery'
        );

        layout.dataset.productFlow = 'beside';
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
            infoRect.left >=
            galleryRect.right - 15;

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

    function updateLayout() {
        if (updateRunning) {
            return;
        }

        updateRunning = true;

        /*
         * Immer zuerst in die neutrale Ausgangsposition
         * unter dem oberen Produktbereich zurücksetzen.
         */
        moveBelow();

        if (!isVisible(flowContent)) {
            layout.dataset.productFlow = 'hidden';
            updateRunning = false;
            return;
        }

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
         * Hat Elementor Galerie und Info-Spalte auf diesem
         * Breakpoint bereits untereinander angeordnet,
         * bleibt der Zusatzbereich unten.
         */
        if (!areColumnsSideBySide()) {
            updateRunning = false;
            return;
        }

        const visibleGalleryWidget =
            getVisibleGalleryWidget();

        if (!visibleGalleryWidget) {
            console.warn(
                'Kein sichtbares Product-Gallery-Widget gefunden.'
            );

            updateRunning = false;
            return;
        }

        /*
         * Entscheidender Unterschied:
         * Gemessen wird das sichtbare Galerie-Widget und nicht
         * die möglicherweise gestreckte Galerie-Spalte.
         */
        const galleryHeight =
            getOuterHeight(visibleGalleryWidget);

        const infoMainHeight =
            getOuterHeight(infoMain);

        const flowHeight =
            getOuterHeight(flowContent);

        const gap =
            getInfoColumnGap();

        /*
         * Reserve, damit der Zusatzbereich nicht exakt bündig
         * bis zum unteren Galerierand reicht.
         */
        const safetySpace = 12;

        const requiredRightHeight =
            infoMainHeight +
            gap +
            flowHeight +
            safetySpace;

        if (
            requiredRightHeight <=
            galleryHeight
        ) {
            moveBeside();
        }

        /*
         * Hilfreiche Messwerte für die Entwicklertools.
         */
        layout.dataset.galleryHeight =
            Math.round(galleryHeight);

        layout.dataset.requiredRightHeight =
            Math.round(requiredRightHeight);

        updateRunning = false;
    }

    function scheduleUpdate() {
        if (frameId !== null) {
            cancelAnimationFrame(frameId);
        }

        frameId = requestAnimationFrame(() => {
            frameId = null;
            updateLayout();
        });
    }

    const resizeObserver =
        new ResizeObserver(scheduleUpdate);

    [
        layout,
        productTop,
        galleryColumn,
        infoMain,
        flowContent,
    ].forEach((element) => {
        resizeObserver.observe(element);
    });

    /*
     * Nachgeladenen Bildern erneut messen.
     */
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

    /*
     * Nachträgliche Änderungen durch WooCommerce,
     * Woodmart oder Varianten berücksichtigen.
     */
    const mutationObserver =
        new MutationObserver(scheduleUpdate);

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

    /*
     * WooCommerce-Variationswechsel.
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

    scheduleUpdate();
}