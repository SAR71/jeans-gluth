/* ===========================
   Produkt Benefits Layout
   =========================== */
(function () {
    'use strict';

    function initProductBenefits() {
        const wrappers = document.querySelectorAll(
            '.product-benefits:not([data-benefits-initialized])'
        );

        wrappers.forEach(function (wrapper) {
            wrapper.setAttribute(
                'data-benefits-initialized',
                'true'
            );

            const listContainer = wrapper.querySelector(
                ':scope > .product-benefits__list'
            );

            const imageContainer = wrapper.querySelector(
                ':scope > .product-benefits__image'
            );

            const textElements = wrapper.querySelectorAll(
                '.elementor-icon-list-text'
            );

            if (
                !listContainer ||
                !imageContainer ||
                !textElements.length
            ) {
                console.error(
                    'Product Benefits: Elemente nicht gefunden.',
                    {
                        wrapper: wrapper,
                        listContainer: listContainer,
                        imageContainer: imageContainer,
                        texts: textElements.length
                    }
                );

                return;
            }

            let scheduled = false;

            function setRowLayout() {
                wrapper.classList.remove(
                    'product-benefits--stacked'
                );
            }

            function setStackedLayout() {
                wrapper.classList.add(
                    'product-benefits--stacked'
                );
            }

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

                const lineTops = [];

                rectangles.forEach(function (rectangle) {
                    const top = Math.round(rectangle.top);

                    const exists = lineTops.some(
                        function (savedTop) {
                            return Math.abs(savedTop - top) <= 2;
                        }
                    );

                    if (!exists) {
                        lineTops.push(top);
                    }
                });

                return lineTops.length > 1;
            }

            function hasWrappedText() {
                return Array.from(textElements).some(
                    textIsWrapped
                );
            }

            function updateLayout() {
                if (scheduled) {
                    return;
                }

                scheduled = true;

                requestAnimationFrame(function () {
                    scheduled = false;

                    /*
                     * Zum Prüfen zunächst immer nebeneinander.
                     */
                    setRowLayout();

                    /*
                     * Browser zur Neuberechnung zwingen.
                     */
                    void wrapper.offsetWidth;

                    const mustStack = hasWrappedText();

                    if (mustStack) {
                        setStackedLayout();
                    }

                    wrapper.setAttribute(
                        'data-benefits-layout',
                        mustStack ? 'stacked' : 'row'
                    );

                    console.log(
                        'Product Benefits:',
                        mustStack
                            ? 'untereinander'
                            : 'nebeneinander'
                    );
                });
            }

            const resizeObserver = new ResizeObserver(
                updateLayout
            );

            resizeObserver.observe(wrapper);
            resizeObserver.observe(listContainer);

            if (document.fonts?.ready) {
                document.fonts.ready.then(updateLayout);
            }

            window.addEventListener(
                'resize',
                updateLayout,
                { passive: true }
            );

            setTimeout(updateLayout, 0);
            setTimeout(updateLayout, 300);
            setTimeout(updateLayout, 1000);
        });
    }

    /*
     * Funktioniert unabhängig davon, ob das Script im Header
     * oder Footer geladen wird.
     */
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initProductBenefits
        );
    } else {
        initProductBenefits();
    }

    window.addEventListener(
        'load',
        initProductBenefits
    );

    /*
     * Falls Elementor Inhalte nachträglich rendert.
     */
    const mutationObserver = new MutationObserver(
        initProductBenefits
    );

    mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();