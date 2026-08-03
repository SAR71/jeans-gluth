<?php
// LastChanged: 2026-04-23 22:52:00
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_shortcode('jg_subsub_pills', function() {

    if (!function_exists('is_product_category') || !is_product_category()) {
        return '';
    }

    $term = get_queried_object();
    if (!$term || empty($term->term_id) || $term->taxonomy !== 'product_cat') {
        return '';
    }

    $current_id = (int) $term->term_id;

    // Top-Ancestor (Ebene 1)
    $ancestors = get_ancestors($current_id, 'product_cat');
    $depth_rel = is_array($ancestors) ? count($ancestors) : 0;

    // Ebene 1 (z.B. Damen) → nichts anzeigen
    if ($depth_rel === 0) {
        return '';
    }

    // Ebene-2-Kategorie bestimmen
    // - auf Ebene 2: current
    // - auf Ebene 3: parent
    $level2_id = ($depth_rel === 1)
        ? $current_id
        : (int) $term->parent;

    if ($level2_id <= 0) {
        return '';
    }

    // Ebene 3 = direkte Kinder von Ebene 2
    $items = get_terms([
        'taxonomy'   => 'product_cat',
        'parent'     => $level2_id,
        'hide_empty' => true,
        'orderby'    => 'menu_order',
        'order'      => 'ASC',
    ]);

    // Ebene 3 nur anzeigen, wenn es mindestens 2 Einträge gibt
    if (is_wp_error($items) || count($items) < 2) {
        return '';
    }

    // Aktiver Eintrag nur auf Ebene 3
    $active_id = ($depth_rel >= 2) ? $current_id : 0;

    ob_start(); ?>
    <nav class="jg-subsub-pills" aria-label="Unterkategorien">
      <?php foreach ($items as $p):
        $link = get_term_link($p);
        if (is_wp_error($link)) continue;

        $is_active = ($active_id && ((int)$p->term_id === (int)$active_id));
        $cls = $is_active ? 'jg-subsub-pill is-active' : 'jg-subsub-link';
      ?>
        <a class="<?php echo esc_attr($cls); ?>"
           href="<?php echo esc_url($link); ?>"
              aria-label="<?php echo esc_attr( $is_active ? ( $p->name . ', aktuell ausgewählt' ) : $p->name ); ?>"
           <?php echo $is_active ? 'aria-current="page"' : ''; ?>>
          <span class="jg-subsub-text"><?php echo esc_html($p->name); ?></span>
        </a>
      <?php endforeach; ?>
    </nav>
    <?php
    return ob_get_clean();
});

/* =========================================================
 * CHECKOUT – ABHOLRABATT ALS EIGENE SUMMENZEILE ANZEIGEN
 *
 * Der Rabatt wird hier NICHT erneut abgezogen.
 * Es wird nur der bereits im Artikelpreis enthaltene
 * Abholrabatt als separate Zeile dargestellt.
 * ========================================================= */

/**
 * Prüft, ob im Checkout die lokale Abholung ausgewählt wurde.
 */
function jg_checkout_ist_abholung() {

	if ( ! function_exists( 'WC' ) || ! WC()->session ) {
		return false;
	}

	$shipping_methods = WC()->session->get( 'chosen_shipping_methods', array() );

	foreach ( $shipping_methods as $shipping_method ) {
		if ( strpos( (string) $shipping_method, 'local_pickup' ) === 0 ) {
			return true;
		}
	}

	return false;
}
/* =========================================================
 * Checkout – sichtbaren Titel der Block-Abholung
 * im klassischen Woodmart-Checkout ändern
 * ========================================================= */

add_filter(
	'woocommerce_cart_shipping_method_full_label',
	'jg_pickup_location_label',
	100,
	2
);

function jg_pickup_location_label( $label, $method ) {

	if ( ! is_object( $method ) ) {
		return $label;
	}

	$method_id = '';

	if ( method_exists( $method, 'get_method_id' ) ) {
		$method_id = (string) $method->get_method_id();
	} elseif ( isset( $method->method_id ) ) {
		$method_id = (string) $method->method_id;
	}

	if ( 'pickup_location' !== $method_id ) {
		return $label;
	}

	return 'Abholung vor Ort – 10 % Rabatt auf nicht reduzierte Ware';
}
/* =========================================================
 * CHECKOUT – REGULÄREN UND REDUZIERTEN PREIS ANZEIGEN
 *
 * Nur bei echten WooCommerce-Sale-Artikeln.
 * Der Abholrabatt auf reguläre Ware wird nicht als Sale
 * dargestellt.
 * ========================================================= */

add_filter(
	'woocommerce_cart_item_subtotal',
	'jg_checkout_show_sale_price',
	20,
	3
);

function jg_checkout_show_sale_price( $subtotal_html, $cart_item, $cart_item_key ) {

	// Nur im Checkout ändern, nicht im Warenkorb.
	if (
		! is_checkout() ||
		is_order_received_page() ||
		! function_exists( 'WC' )
	) {
		return $subtotal_html;
	}

	if (
		empty( $cart_item['data'] ) ||
		! $cart_item['data'] instanceof WC_Product
	) {
		return $subtotal_html;
	}

	$product  = $cart_item['data'];
	$quantity = isset( $cart_item['quantity'] )
		? (float) $cart_item['quantity']
		: 1;

	/*
	 * Die gespeicherten Produktpreise verwenden.
	 * Dadurch wird nur ein echter, im Produkt hinterlegter
	 * Sale-Preis erkannt – nicht der dynamische Abholrabatt.
	 */
	$regular_price = (float) $product->get_regular_price( 'edit' );
	$sale_price    = (float) $product->get_sale_price( 'edit' );

	if (
		$regular_price <= 0 ||
		$sale_price <= 0 ||
		$sale_price >= $regular_price
	) {
		return $subtotal_html;
	}

	/*
	 * Prüfen, ob ein zeitlich geplanter Sale aktuell gültig ist.
	 */
	$sale_from = $product->get_date_on_sale_from( 'edit' );
	$sale_to   = $product->get_date_on_sale_to( 'edit' );
	$now       = current_time( 'timestamp', true );

	if ( $sale_from && $sale_from->getTimestamp() > $now ) {
		return $subtotal_html;
	}

	if ( $sale_to && $sale_to->getTimestamp() < $now ) {
		return $subtotal_html;
	}

	/*
	 * Preis passend zur WooCommerce-Steuereinstellung berechnen.
	 */
	$regular_total = wc_get_price_to_display(
		$product,
		array(
			'price' => $regular_price,
			'qty'   => $quantity,
		)
	);

	$sale_total = wc_get_price_to_display(
		$product,
		array(
			'price' => $sale_price,
			'qty'   => $quantity,
		)
	);

	return wc_format_sale_price(
		$regular_total,
		$sale_total
	);
}