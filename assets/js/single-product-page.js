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

    const gallery =
        layout.querySelector('.product-gallery-column');

    const infoColumn =
        layout.querySelector('.product-info-column');

    const infoMain =
        layout.querySelector('.product-info-main');

    const flowContent =
        layout.querySelector('.product-flow-content');

    if (
        !productTop ||
        !gallery ||
        !infoColumn ||
        !infoMain ||
        !flowContent
    ) {
        console.warn('Produktlayout unvollständig.', {
            productTop,
            gallery,
            infoColumn,
            infoMain,
            flowContent,
        });

        return;
    }

    const placeholder =
        document.createComment(
            'product-flow-original-position'
        );

    flowContent.parentNode.insertBefore(
        placeholder,
        flowContent
    );

    let frameId = null;
    let isUpdating = false;

    function scheduleUpdate() {
        if (isUpdating) {
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

    function isVisible(element) {
        if (!element) {
            return false;
        }

        const style =
            window.getComputedStyle(element);

        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            element.getClientRects().length > 0
        );
    }

    function moveBelow() {
        const originalParent =
            placeholder.parentNode;

        if (!originalParent) {
            return;
        }

        if (
            flowContent.parentNode !== originalParent ||
            flowContent.previousSibling !== placeholder
        ) {
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
        if (flowContent.parentNode !== infoColumn) {
            infoColumn.appendChild(flowContent);
        }

        flowContent.classList.add(
            'is-beside-gallery'
        );

        layout.dataset.productFlow = 'beside';
    }

    function isSideBySide() {
        if (
            !isVisible(gallery) ||
            !isVisible(infoColumn)
        ) {
            return false;
        }

        const galleryRect =
            gallery.getBoundingClientRect();

        const infoRect =
            infoColumn.getBoundingClientRect();

        const sameRow =
            Math.abs(
                galleryRect.top -
                infoRect.top
            ) < 10;

        const horizontallySeparated =
            infoRect.left >
            galleryRect.left + 10;

        return sameRow && horizontallySeparated;
    }

    function getVerticalGap() {
        const style =
            window.getComputedStyle(infoColumn);

        const rowGap =
            parseFloat(style.rowGap);

        const gap =
            parseFloat(style.gap);

        if (Number.isFinite(rowGap)) {
            return rowGap;
        }

        if (Number.isFinite(gap)) {
            return gap;
        }

        return 0;
    }

    function updateLayout() {
        isUpdating = true;

        moveBelow();

        if (!isVisible(flowContent)) {
            layout.dataset.productFlow = 'hidden';
            isUpdating = false;
            return;
        }

        if (
            !isVisible(productTop) ||
            !isVisible(gallery) ||
            !isVisible(infoColumn) ||
            !isVisible(infoMain)
        ) {
            isUpdating = false;
            return;
        }

        if (!isSideBySide()) {
            isUpdating = false;
            return;
        }

        const galleryHeight =
            gallery.getBoundingClientRect().height;

        const infoHeight =
            infoMain.getBoundingClientRect().height;

        const flowHeight =
            flowContent.getBoundingClientRect().height;

        const gap =
            getVerticalGap();

        const safetySpace = 10;

        const requiredHeight =
            infoHeight +
            gap +
            flowHeight +
            safetySpace;

        if (requiredHeight <= galleryHeight) {
            moveBeside();
        }

        isUpdating = false;
    }

    const resizeObserver =
        new ResizeObserver(scheduleUpdate);

    [
        layout,
        productTop,
        gallery,
        infoMain,
        flowContent,
    ].forEach((element) => {
        resizeObserver.observe(element);
    });

    const mutationObserver =
        new MutationObserver(scheduleUpdate);

    mutationObserver.observe(layout, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
            'class',
            'style',
            'src',
            'srcset',
        ],
    });

    gallery
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

    window.addEventListener(
        'resize',
        scheduleUpdate,
        { passive: true }
    );

    window.addEventListener(
        'orientationchange',
        scheduleUpdate
    );

    scheduleUpdate();
}
