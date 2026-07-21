/* ===========================
   Produkt Benefits Layout
   =========================== */
document.addEventListener('DOMContentLoaded', function () {
    const wrappers = document.querySelectorAll('.product-benefits');

    console.log(
        'Product-Benefits-Container gefunden:',
        wrappers.length
    );

    wrappers.forEach(function (wrapper) {
        const textElements = wrapper.querySelectorAll(
            '.product-benefits__list .elementor-icon-list-text'
        );

        if (!textElements.length) {
            console.warn(
                'Keine Texte der Icon List gefunden:',
                wrapper
            );
            return;
        }

        let scheduled = false;

        /*
         * Ermittelt anhand der Textzeilen, ob ein Text umgebrochen ist.
         */
        function textIsWrapped(element) {
            const range = document.createRange();

            range.selectNodeContents(element);

            const rectangles = Array.from(range.getClientRects())
                .filter(function (rectangle) {
                    return (
                        rectangle.width > 0 &&
                        rectangle.height > 0
                    );
                });

            if (rectangles.length <= 1) {
                return false;
            }

            /*
             * Mehrere Rechtecke können auch durch HTML-Unterelemente
             * entstehen. Deshalb werden unterschiedliche vertikale
             * Textpositionen gezählt.
             */
            const linePositions = [];

            rectangles.forEach(function (rectangle) {
                const top = Math.round(rectangle.top);

                const alreadyExists = linePositions.some(
                    function (savedTop) {
                        return Math.abs(savedTop - top) <= 2;
                    }
                );

                if (!alreadyExists) {
                    linePositions.push(top);
                }
            });

            return linePositions.length > 1;
        }

        function hasWrappedText() {
            return Array.from(textElements).some(textIsWrapped);
        }

        function checkLayout() {
            if (scheduled) {
                return;
            }

            scheduled = true;

            requestAnimationFrame(function () {
                scheduled = false;

                /*
                 * Erst immer den Ausgangszustand nebeneinander herstellen.
                 */
                wrapper.classList.remove(
                    'product-benefits--stacked'
                );

                /*
                 * Layout-Neuberechnung erzwingen.
                 */
                void wrapper.offsetWidth;

                const mustStack = hasWrappedText();

                wrapper.classList.toggle(
                    'product-benefits--stacked',
                    mustStack
                );

                console.log(
                    'Product Benefits:',
                    mustStack
                        ? 'Bild wird darunter gesetzt'
                        : 'Container bleiben nebeneinander'
                );
            });
        }

        const resizeObserver = new ResizeObserver(checkLayout);

        resizeObserver.observe(wrapper);

        if (document.fonts?.ready) {
            document.fonts.ready.then(checkLayout);
        }

        wrapper.querySelectorAll('img').forEach(function (image) {
            if (!image.complete) {
                image.addEventListener(
                    'load',
                    checkLayout,
                    { once: true }
                );
            }
        });

        checkLayout();
    });
});