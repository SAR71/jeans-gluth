/* ===========================
   Produkt Benefits Layout
   =========================== */
document.addEventListener('DOMContentLoaded', function () {
    const benefitContainers = document.querySelectorAll(
        '.product-benefits'
    );

    if (!benefitContainers.length) {
        console.warn(
            'Product Benefits: Elterncontainer nicht gefunden.'
        );
        return;
    }

    benefitContainers.forEach(function (wrapper) {
        const listContainer = wrapper.querySelector(
            '.product-benefits__list'
        );

        const imageContainer = wrapper.querySelector(
            '.product-benefits__image'
        );

        const textElements = wrapper.querySelectorAll(
            '.product-benefits__list .elementor-icon-list-text'
        );

        if (
            !listContainer ||
            !imageContainer ||
            !textElements.length
        ) {
            console.warn(
                'Product Benefits: Erforderliche Elemente fehlen.',
                {
                    wrapper,
                    listContainer,
                    imageContainer,
                    textElements: textElements.length
                }
            );

            return;
        }

        let checkScheduled = false;

        /**
         * Ermittelt die Breite, die ein Text ohne Zeilenumbruch benötigt.
         */
        function getRequiredTextWidth(element) {
            const clone = element.cloneNode(true);
            const computedStyle = window.getComputedStyle(element);

            clone.style.position = 'fixed';
            clone.style.left = '-10000px';
            clone.style.top = '-10000px';
            clone.style.visibility = 'hidden';
            clone.style.pointerEvents = 'none';

            clone.style.display = 'inline-block';
            clone.style.width = 'auto';
            clone.style.maxWidth = 'none';
            clone.style.minWidth = '0';
            clone.style.whiteSpace = 'nowrap';

            clone.style.fontFamily = computedStyle.fontFamily;
            clone.style.fontSize = computedStyle.fontSize;
            clone.style.fontWeight = computedStyle.fontWeight;
            clone.style.fontStyle = computedStyle.fontStyle;
            clone.style.letterSpacing = computedStyle.letterSpacing;
            clone.style.textTransform = computedStyle.textTransform;

            document.body.appendChild(clone);

            const requiredWidth =
                clone.getBoundingClientRect().width;

            clone.remove();

            return requiredWidth;
        }

        /**
         * Prüft, ob mindestens ein Text in der aktuellen
         * Nebeneinander-Darstellung umbrechen müsste.
         */
        function textWouldWrap() {
            return Array.from(textElements).some(function (text) {
                const availableWidth =
                    text.getBoundingClientRect().width;

                const requiredWidth =
                    getRequiredTextWidth(text);

                return requiredWidth > availableWidth + 1;
            });
        }

        function applyRowLayout() {
            wrapper.style.setProperty(
                'display',
                'flex',
                'important'
            );

            wrapper.style.setProperty(
                'flex-direction',
                'row',
                'important'
            );

            wrapper.style.setProperty(
                'flex-wrap',
                'nowrap',
                'important'
            );

            wrapper.style.setProperty(
                'align-items',
                'center',
                'important'
            );

            listContainer.style.setProperty(
                'flex',
                '1 1 auto',
                'important'
            );

            listContainer.style.setProperty(
                'min-width',
                '0',
                'important'
            );

            imageContainer.style.setProperty(
                'flex',
                '0 0 auto',
                'important'
            );

            imageContainer.style.setProperty(
                'width',
                'auto',
                'important'
            );

            imageContainer.style.removeProperty(
                'margin-top'
            );
        }

        function applyStackedLayout() {
            wrapper.style.setProperty(
                'display',
                'flex',
                'important'
            );

            wrapper.style.setProperty(
                'flex-direction',
                'column',
                'important'
            );

            wrapper.style.setProperty(
                'align-items',
                'stretch',
                'important'
            );

            listContainer.style.setProperty(
                'width',
                '100%',
                'important'
            );

            imageContainer.style.setProperty(
                'display',
                'flex',
                'important'
            );

            imageContainer.style.setProperty(
                'width',
                '100%',
                'important'
            );

            imageContainer.style.setProperty(
                'justify-content',
                'center',
                'important'
            );

            imageContainer.style.setProperty(
                'align-items',
                'center',
                'important'
            );

            imageContainer.style.setProperty(
                'margin-top',
                '15px',
                'important'
            );

            const imageWidget =
                imageContainer.querySelector(
                    '.elementor-widget-image'
                );

            if (imageWidget) {
                imageWidget.style.setProperty(
                    'width',
                    'auto',
                    'important'
                );

                imageWidget.style.setProperty(
                    'margin-left',
                    'auto',
                    'important'
                );

                imageWidget.style.setProperty(
                    'margin-right',
                    'auto',
                    'important'
                );
            }

            const image =
                imageContainer.querySelector('img');

            if (image) {
                image.style.setProperty(
                    'display',
                    'block',
                    'important'
                );

                image.style.setProperty(
                    'margin-left',
                    'auto',
                    'important'
                );

                image.style.setProperty(
                    'margin-right',
                    'auto',
                    'important'
                );
            }
        }

        function updateLayout() {
            if (checkScheduled) {
                return;
            }

            checkScheduled = true;

            window.requestAnimationFrame(function () {
                checkScheduled = false;

                /*
                 * Zum Messen immer zunächst die beiden Container
                 * nebeneinander darstellen.
                 */
                applyRowLayout();

                /*
                 * Browser zur Layoutberechnung zwingen.
                 */
                void wrapper.offsetWidth;

                const mustStack = textWouldWrap();

                if (mustStack) {
                    applyStackedLayout();
                } else {
                    applyRowLayout();
                }

                console.log(
                    'Product Benefits:',
                    mustStack
                        ? 'Bild unter der Icon List'
                        : 'Bild neben der Icon List'
                );
            });
        }

        const resizeObserver = new ResizeObserver(
            updateLayout
        );

        resizeObserver.observe(wrapper);

        window.addEventListener(
            'resize',
            updateLayout,
            { passive: true }
        );

        if (document.fonts?.ready) {
            document.fonts.ready.then(updateLayout);
        }

        wrapper.querySelectorAll('img').forEach(
            function (image) {
                if (!image.complete) {
                    image.addEventListener(
                        'load',
                        updateLayout,
                        { once: true }
                    );
                }
            }
        );

        updateLayout();
    });
});