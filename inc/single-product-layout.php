<?php
// LastChanged: 2026-08-25 00:00:00
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
                swatchWrap.querySelectorAll(
                    '.wd-swatch.wd-enabled[data-value]:not(.jg-out-of-stock)'
                )
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



/* EAN + Artikelnummer in "Zusätzliche Informationen" anzeigen */
add_filter('woocommerce_display_product_attributes', function ($attributes, $product) {

    $ean = '';
    $sku = '';

    if ($product->is_type('variable')) {
        foreach ($product->get_children() as $variation_id) {
            $variation = wc_get_product($variation_id);

            if ($variation) {
                if (empty($ean)) {
                    $ean = $variation->get_global_unique_id();
                }

                if (empty($sku)) {
                    $sku = $variation->get_sku();
                }

                if (!empty($ean) && !empty($sku)) {
                    break;
                }
            }
        }
    } else {
        $ean = $product->get_global_unique_id();
        $sku = $product->get_sku();
    }

    $new_attributes = array();

    // Wert wird bei Variationsauswahl per JS aktualisiert (siehe single-product-page.js)
    if (wp_is_mobile()) {

        // Mobile:
        // 1. Artikelnummer
        if (!empty($sku)) {
            $new_attributes['artikelnummer'] = array(
                'label' => 'Artikelnummer',
                'value' => '<span id="jg-sku-value">' . esc_html($sku) . '</span>',
            );
        }

        // 2. EAN
        if (!empty($ean)) {
            $new_attributes['ean'] = array(
                'label' => 'EAN',
                'value' => '<span id="jg-ean-value">' . esc_html($ean) . '</span>',
            );
        }

    } else {

        // Desktop:
        // 1. EAN
        if (!empty($ean)) {
            $new_attributes['ean'] = array(
                'label' => 'EAN',
                'value' => '<span id="jg-ean-value">' . esc_html($ean) . '</span>',
            );
        }

    }

    return $new_attributes + $attributes;

}, 20, 2);

/**
 * SKU und EAN der Variation in die Variationsdaten aufnehmen,
 * damit JavaScript die Anzeige an die gewählte Größe anpassen kann.
 */
add_filter('woocommerce_available_variation', function ($variation_data, $product, $variation) {
    $variation_data['jg_sku'] = $variation->get_sku();
    $variation_data['jg_ean'] = $variation->get_global_unique_id();

    return $variation_data;
}, 10, 3);


/**
 * Eigenes JavaScript für die Produktdetailseite laden.
 */
function jeans_gluth_enqueue_single_product_script() {

    /*
     * Nur auf WooCommerce-Produktseiten laden.
     */
    if (
        ! function_exists( 'is_product' ) ||
        ! is_product()
    ) {
        return;
    }

    /*
     * Relativer Pfad innerhalb des Child-Themes.
     */
    $relative_path = '/assets/js/single-product-page.js';

    /*
     * Absoluter Serverpfad und öffentliche URL.
     */
    $file_path = get_stylesheet_directory() . $relative_path;
    $file_url  = get_stylesheet_directory_uri() . $relative_path;

    /*
     * Prüfen, ob die Datei tatsächlich vorhanden ist.
     */
    if ( ! file_exists( $file_path ) ) {
        return;
    }

    /*
     * filemtime verhindert, dass nach Änderungen
     * eine veraltete JS-Datei aus dem Cache geladen wird.
     */
    $version = (string) filemtime( $file_path );

    wp_enqueue_script(
        'jeans-gluth-single-product-page',
        $file_url,
        array(),
        $version,
        true
    );
}

add_action(
    'wp_enqueue_scripts',
    'jeans_gluth_enqueue_single_product_script',
    100
);

/**
 * Variationsdaten auch bei Produkten mit vielen Varianten direkt laden.
 *
 * Dadurch kann das eigene JavaScript erkennen, welche Größen
 * verfügbar beziehungsweise ausverkauft sind.
 */
add_filter(
	'woocommerce_ajax_variation_threshold',
	function ( $threshold, $product ) {
		if ( is_product() ) {
			return 200;
		}

		return $threshold;
	},
	10,
	2
);