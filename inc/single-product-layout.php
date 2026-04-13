<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Hide quantity selector on single product page only (keep quantity editable in cart/checkout)
 */
add_filter('woocommerce_is_sold_individually', function ($sold_individually, $product) {

    // Single product page (also works with Elementor product templates)
    if (is_singular('product')) {
        return true; // hides qty input + / - on single product page
    }

    return $sold_individually;
}, 10, 2);

/* *********** GRÖSSE STANDARDMÄSSIG VORAB AUSGEWÄHLT *********** */

add_action('wp_footer', 'jg_preselect_middle_instock_size_swatch', 99);
function jg_preselect_middle_instock_size_swatch() {
	if ( ! is_product() ) {
		return;
	}
	?>
	<script>
	document.addEventListener('DOMContentLoaded', function () {
		function initMiddleSizeSelection() {
			var forms = document.querySelectorAll('form.variations_form');
			if (!forms.length) return;

			forms.forEach(function(form) {
				var sizeAttributeName = 'attribute_pa_groessen';
				var sizeSelect = form.querySelector('select[name="' + sizeAttributeName + '"]');
				if (!sizeSelect) return;

				var swatchWrap = form.querySelector('[data-id="pa_groessen"]');
				if (!swatchWrap) return;

				// Bereits eine Größe gewählt? Dann nichts überschreiben.
				if (sizeSelect.value && sizeSelect.value !== '') return;

				var activeSwatch = swatchWrap.querySelector('.wd-swatch.wd-active');
				if (activeSwatch) return;

				// Nur verfügbare Größen berücksichtigen
				var enabledSwatches = Array.from(
					swatchWrap.querySelectorAll('.wd-swatch.wd-enabled[data-value]')
				);

				if (!enabledSwatches.length) return;

				// Reihenfolge direkt aus dem Frontend beibehalten
				// Mitte wählen:
				// 3 Elemente => Index 1
				// 4 Elemente => Index 1 (untere Mitte)
				var middleIndex = Math.floor((enabledSwatches.length - 1) / 2);
				var targetSwatch = enabledSwatches[middleIndex];

				if (!targetSwatch) return;

				var targetValue = targetSwatch.getAttribute('data-value');
				if (!targetValue) return;

				// Select setzen
				sizeSelect.value = targetValue;
				sizeSelect.dispatchEvent(new Event('change', { bubbles: true }));

				// jQuery/WooCommerce/Woodmart triggern
				if (window.jQuery) {
					window.jQuery(sizeSelect).trigger('change');
					window.jQuery(form).trigger('woocommerce_variation_select_change');
					window.jQuery(form).trigger('check_variations');
					window.jQuery(form).trigger('woocommerce_update_variation_values');
				}

				// Zusätzlich echten Swatch-Klick auslösen, damit Woodmart UI sauber aktualisiert
				setTimeout(function() {
					if (!targetSwatch.classList.contains('wd-active')) {
						targetSwatch.click();
					}

					// Fallback: aria-checked sauber setzen
					Array.from(swatchWrap.querySelectorAll('.wd-swatch')).forEach(function(swatch) {
						swatch.setAttribute('aria-checked', swatch === targetSwatch ? 'true' : 'false');
					});
				}, 50);
			});
		}

		initMiddleSizeSelection();

		// Falls Variations-/Swatch-Skripte nachladen, nochmal prüfen
		setTimeout(initMiddleSizeSelection, 300);
		setTimeout(initMiddleSizeSelection, 800);
	});
	</script>
	<?php
}
