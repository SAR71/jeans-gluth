/* ===========================
   Produkt Benefits Layout
   =========================== */
document.addEventListener("DOMContentLoaded", () => {

    const wrappers = document.querySelectorAll(".product-benefits");

    wrappers.forEach(wrapper => {

        const list = wrapper.querySelector(".product-benefits__list");

        if (!list) return;

        function hasWrappedText() {

            const items = list.querySelectorAll("li");

            for (const item of items) {

                const text =
                    item.querySelector(".elementor-icon-list-text") ??
                    item.querySelector("span") ??
                    item;

                if (text.getClientRects().length > 1) {
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

        new ResizeObserver(updateLayout).observe(wrapper);

        window.addEventListener("load", updateLayout);

    });

});