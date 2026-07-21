/* ===========================
   Produkt Benefits Layout
   =========================== */
(function () {
    'use strict';

    const wrappers = document.querySelectorAll(
        '.product-benefits'
    );

    wrappers.forEach(function (wrapper) {
        const list = wrapper.querySelector(
            '.product-benefits_list'
        );

        if (!list) {
            return;
        }

        let timer = null;

        function isWrapped(element) {
            const style = getComputedStyle(element);
            const lineHeight =
                parseFloat(style.lineHeight) ||
                parseFloat(style.fontSize) * 1.2;

            return (
                element.getBoundingClientRect().height >
                lineHeight * 1.45
            );
        }

        function update() {
            wrapper.classList.remove(
                'product-benefits_stacked'
            );

            void wrapper.offsetWidth;

            requestAnimationFrame(function () {
                const wrapped = Array.from(
                    list.querySelectorAll(
                        '.elementor-icon-list-text'
                    )
                ).some(isWrapped);

                wrapper.classList.toggle(
                    'product-benefits_stacked',
                    wrapped
                );

                wrapper.setAttribute(
                    'data-benefits-layout',
                    wrapped ? 'stacked' : 'row'
                );
            });
        }

        function scheduleUpdate() {
            clearTimeout(timer);
            timer = setTimeout(update, 150);
        }

        window.addEventListener(
            'resize',
            scheduleUpdate,
            { passive: true }
        );

        if (document.fonts?.ready) {
            document.fonts.ready.then(update);
        }

        window.addEventListener('load', update);
        update();
    });
})();