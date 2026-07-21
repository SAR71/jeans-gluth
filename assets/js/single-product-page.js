/* ===========================
   Produkt Benefits Layout
   =========================== */
(function () {
    'use strict';

    function initializeProductBenefits() {
        const wrappers = document.querySelectorAll(
            '.product-benefits:not([data-product-benefits-ready])'
        );

        wrappers.forEach(function (wrapper) {
            const listContainer = wrapper.querySelector(
                ':scope > .product-benefits_list'
            );

            const imageContainer = wrapper.querySelector(
                ':scope > .product-benefits_image'
            );

            const textElements = wrapper.querySelectorAll(
                '.product-benefits_list .elementor-icon-list-text'
            );

            if (
                !listContainer ||
                !imageContainer ||
                !textElements.length
            ) {
                console.warn(
                    'Product Benefits: Elemente nicht gefunden.',
                    {
                        parent: wrapper,
                        list: listContainer,
                        image: imageContainer,
                        textCount: textElements.length
                    }
                );

                return;
            }

            wrapper.setAttribute(
                'data-product-benefits-ready',
                'true'
            );

            let scheduled = false;
            let observerActive = true;

            /**
             * Prüft anhand der tatsächlichen Textzeilen,
             * ob ein Listentext umgebrochen wurde.
             */
            function textIsWrapped(textElement) {
                const range = document.createRange();
                range.selectNodeContents(textElement);

                const rectangles = Array.from(
                    range.getClientRects()
                ).filter(function (rectangle) {
                    return (
                        rectangle.width > 0 &&
                        rectangle.height > 0
                    );
                });

                const linePositions = [];

                rectangles.forEach(function (rectangle) {
                    const top = Math.round(rectangle.top);

                    const alreadyRecorded = linePositions.some(
                        function (recordedTop) {
                            return Math.abs(recordedTop - top) <= 2;
                        }
                    );

                    if (!alreadyRecorded) {
                        linePositions.push(top);
                    }
                });

                return linePositions.length > 1;
            }

            function hasWrappedText() {
                return Array.from(textElements).some(
                    textIsWrapped
                );
            }

            function setRowLayout() {
                wrapper.classList.remove(
                    'product-benefits_stacked'
                );

                wrapper.setAttribute(
                    'data-product-benefits-layout',
                    'row'
                );
            }

            function setStackedLayout() {
                wrapper.classList.add(
                    'product-benefits_stacked'
                );

                wrapper.setAttribute(
                    'data-product-benefits-layout',
                    'stacked'
                );
            }

            function updateLayout() {
                if (scheduled) {
                    return;
                }

                scheduled = true;

                window.requestAnimationFrame(function () {
                    scheduled = false;

                    /*
                     * Immer zuerst nebeneinander messen.
                     */
                    setRowLayout();

                    /*
                     * Layout-Neuberechnung erzwingen.
                     */
                    void wrapper.offsetWidth;

                    if (hasWrappedText()) {
                        setStackedLayout();
                    } else {
                        setRowLayout();
                    }
                });
            }

            const resizeObserver = new ResizeObserver(function () {
                if (observerActive) {
                    updateLayout();
                }
            });

            resizeObserver.observe(wrapper);

            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(updateLayout);
            }

            imageContainer
                .querySelectorAll('img')
                .forEach(function (image) {
                    if (!image.complete) {
                        image.addEventListener(
                            'load',
                            updateLayout,
                            { once: true }
                        );
                    }
                });

            window.addEventListener(
                'resize',
                updateLayout,
                { passive: true }
            );

            updateLayout();
            window.setTimeout(updateLayout, 300);
            window.setTimeout(updateLayout, 1000);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeProductBenefits
        );
    } else {
        initializeProductBenefits();
    }

    window.addEventListener(
        'load',
        initializeProductBenefits
    );
})();