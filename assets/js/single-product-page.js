/* ===========================
   Produkt Benefits Layout
   =========================== */
document.addEventListener("DOMContentLoaded", () => {

    const wrappers = document.querySelectorAll(".product-benefits");

    wrappers.forEach(wrapper => {

        const texts = wrapper.querySelectorAll(".elementor-icon-list-text");

        if (!texts.length) return;

        function hasWrappedText() {

            for (const text of texts) {

                const style = window.getComputedStyle(text);

                let lineHeight = parseFloat(style.lineHeight);

                // Falls line-height = normal
                if (isNaN(lineHeight)) {
                    lineHeight = parseFloat(style.fontSize) * 1.2;
                }

                if (text.offsetHeight > lineHeight * 1.4) {
                    return true;
                }
            }

            return false;
        }

        function updateLayout() {

            wrapper.classList.remove("stack-layout");

            requestAnimationFrame(() => {

                if (hasWrappedText()) {
                    wrapper.classList.add("stack-layout");
                }

            });

        }

        updateLayout();

        const observer = new ResizeObserver(updateLayout);
        observer.observe(wrapper);

        window.addEventListener("load", updateLayout);

    });

});