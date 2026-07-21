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
            try {
                const listContainer = wrapper.querySelector(
                    '.product-benefits_list'
                );

                const imageContainer = wrapper.querySelector(
                    '.product-benefits_image'
                );

                const textElements = Array.from(
                    wrapper.querySelectorAll(
                        '.elementor-icon-list-text'
                    )
                );

                if (
                    !listContainer ||
                    !imageContainer ||
                    textElements.length === 0
                ) {
                    console.error(
                        'Product Benefits: Elemente fehlen.',
                        {
                            listContainer,
                            imageContainer,
                            textCount: textElements.length
                        }
                    );

                    return;
                }

                wrapper.setAttribute(
                    'data-benefits-initialized',
                    'true'
                );

                let resizeTimer = null;

                /**
                 * Ermittelt die Anzahl der tatsächlichen Textzeilen.
                 */
                function getLineCount(textElement) {
                    const range = document.createRange();

                    range.selectNodeContents(textElement);

                    const rects = Array.from(
                        range.getClientRects()
                    ).filter(function (rect) {
                        return (
                            rect.width > 0 &&
                            rect.height > 0
                        );
                    });

                    const lineTops = [];

                    rects.forEach(function (rect) {
                        const top = Math.round(rect.top);

                        const lineAlreadyExists =
                            lineTops.some(function (existingTop) {
                                return Math.abs(
                                    existingTop - top
                                ) <= 2;
                            });

                        if (!lineAlreadyExists) {
                            lineTops.push(top);
                        }
                    });

                    /*
                     * Fallback, falls der Browser nur ein Rechteck liefert.
                     */
                    if (lineTops.length <= 1) {
                        const style =
                            window.getComputedStyle(textElement);

                        const fontSize =
                            parseFloat(style.fontSize) || 16;

                        let lineHeight =
                            parseFloat(style.lineHeight);

                        if (!Number.isFinite(lineHeight)) {
                            lineHeight = fontSize * 1.2;
                        }

                        const height =
                            textElement.getBoundingClientRect().height;

                        return Math.max(
                            1,
                            Math.round(height / lineHeight)
                        );
                    }

                    return lineTops.length;
                }

                function hasWrappedText() {
                    return textElements.some(function (textElement) {
                        return getLineCount(textElement) > 1;
                    });
                }

                function updateLayout() {
                    try {
                        /*
                         * Zunächst den Zustand nebeneinander herstellen.
                         */
                        wrapper.classList.remove(
                            'product-benefits_stacked'
                        );

                        /*
                         * Browser das Layout neu berechnen lassen.
                         */
                        void wrapper.offsetWidth;

                        /*
                         * Eine kurze Verzögerung gibt Elementor Zeit,
                         * die endgültigen Breiten zu berechnen.
                         */
                        window.setTimeout(function () {
                            try {
                                const mustStack =
                                    hasWrappedText();

                                wrapper.classList.toggle(
                                    'product-benefits_stacked',
                                    mustStack
                                );

                                wrapper.setAttribute(
                                    'data-benefits-layout',
                                    mustStack
                                        ? 'stacked'
                                        : 'row'
                                );

                                wrapper.removeAttribute(
                                    'data-benefits-error'
                                );

                                console.log(
                                    'Product Benefits:',
                                    mustStack
                                        ? 'untereinander'
                                        : 'nebeneinander'
                                );
                            } catch (error) {
                                wrapper.setAttribute(
                                    'data-benefits-error',
                                    error.message
                                );

                                console.error(
                                    'Product Benefits – Messfehler:',
                                    error
                                );
                            }
                        }, 30);
                    } catch (error) {
                        wrapper.setAttribute(
                            'data-benefits-error',
                            error.message
                        );

                        console.error(
                            'Product Benefits – Layoutfehler:',
                            error
                        );
                    }
                }

                window.addEventListener(
                    'resize',
                    function () {
                        window.clearTimeout(resizeTimer);

                        resizeTimer = window.setTimeout(
                            updateLayout,
                            100
                        );
                    },
                    { passive: true }
                );

                if (document.fonts?.ready) {
                    document.fonts.ready.then(updateLayout);
                }

                window.setTimeout(updateLayout, 0);
                window.setTimeout(updateLayout, 300);
                window.setTimeout(updateLayout, 1000);
            } catch (error) {
                wrapper.setAttribute(
                    'data-benefits-error',
                    error.message
                );

                console.error(
                    'Product Benefits – Initialisierungsfehler:',
                    error
                );
            }
        });
    }

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
})();