<?php
// LastChanged: 2026-04-23 22:52:00
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action('wp_footer', function () {
    // Nur auf der Checkout-Seite (Block Checkout eingeschlossen)
    if ( ! function_exists('is_checkout') || ! is_checkout() ) {
        return;
    }

    ?>
    <script>
    (function () {
      function openCouponPanelOnce() {
        const active = document.activeElement;
        if (active && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(active.tagName)) {
          return false;
        }

        const btn = document.querySelector(
          '.wp-block-woocommerce-checkout-order-summary-coupon-form-block .wc-block-components-panel__button[aria-expanded="false"]'
        );
        if (btn) {
          btn.click();
          document.documentElement.setAttribute('data-coupon-opened', '1');
          return true;
        }
        return false;
      }

      // Sofort versuchen
      if (openCouponPanelOnce()) return;

      // Wiederholt versuchen (React rendert oft später)
      let tries = 0;
      const maxTries = 30; // ~6 Sekunden
      const iv = setInterval(() => {
        tries++;
        if (document.documentElement.getAttribute('data-coupon-opened') === '1') {
          clearInterval(iv);
          return;
        }
        if (openCouponPanelOnce() || tries >= maxTries) {
          clearInterval(iv);
        }
      }, 200);

      // Zusätzlich DOM-Observer (sehr zuverlässig)
      const obs = new MutationObserver(() => {
        if (document.documentElement.getAttribute('data-coupon-opened') === '1') {
          obs.disconnect();
          return;
        }
        if (openCouponPanelOnce()) {
          obs.disconnect();
        }
      });

      const startObs = () => {
        if (!document.body) return;
        obs.observe(document.body, { childList: true, subtree: true });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObs);
      } else {
        startObs();
      }
    })();
    </script>
    <?php
}, 100);

/**
 * 10 % Rabatt bei Abholung vor Ort.
 *
 * Der Rabatt wird ausschließlich auf Artikel angewendet,
 * die nicht bereits reduziert sind.
 *
 * Erkannte Versandarten:
 * - local_pickup
 * - pickup_location
 */
add_action( 'woocommerce_cart_calculate_fees', function ( $cart ) {

	if (
		is_admin() &&
		! defined( 'DOING_AJAX' )
	) {
		return;
	}

	if (
		! $cart ||
		$cart->is_empty()
	) {
		return;
	}

	if (
		! function_exists( 'WC' ) ||
		! WC()->session
	) {
		return;
	}

	$chosen_methods = WC()->session->get(
		'chosen_shipping_methods'
	);

	if ( empty( $chosen_methods ) ) {
		return;
	}

	/*
	 * Prüfen, ob Abholung ausgewählt wurde.
	 */
	$is_pickup = false;

	foreach ( $chosen_methods as $method ) {
		$method = (string) $method;

		if (
			strpos( $method, 'local_pickup' ) !== false ||
			strpos( $method, 'pickup_location' ) !== false
		) {
			$is_pickup = true;
			break;
		}
	}

	if ( ! $is_pickup ) {
		return;
	}

	/*
	 * Rabattfähige Summe ermitteln.
	 *
	 * Reduzierte Produkte und reduzierte Varianten
	 * werden vollständig übersprungen.
	 */
	$discountable_subtotal = 0.0;

	foreach ( $cart->get_cart() as $cart_item ) {

		if (
			empty( $cart_item['data'] ) ||
			! $cart_item['data'] instanceof WC_Product
		) {
			continue;
		}

		/** @var WC_Product $product */
		$product = $cart_item['data'];

		/*
		 * Bereits reduzierte Artikel ausschließen.
		 */
		if ( $product->is_on_sale() ) {
			continue;
		}

		$line_subtotal = isset( $cart_item['line_subtotal'] )
			? (float) $cart_item['line_subtotal']
			: 0.0;

		$line_subtotal_tax = isset( $cart_item['line_subtotal_tax'] )
			? (float) $cart_item['line_subtotal_tax']
			: 0.0;

		$discountable_subtotal +=
			$line_subtotal +
			$line_subtotal_tax;
	}

	if ( $discountable_subtotal <= 0 ) {
		return;
	}

	/*
	 * 10 % Rabatt ausschließlich auf nicht reduzierte Ware.
	 */
	$discount = $discountable_subtotal * 0.10;

	$discount = round(
		$discount,
		wc_get_price_decimals()
	);

	if ( $discount <= 0 ) {
		return;
	}

	$cart->add_fee(
		'10% Rabatt bei Abholung vor Ort',
		-$discount,
		false
	);

}, 20 );


/* Checkout: Versandlabel nur in der Bestellübersicht anpassen */


add_filter('woocommerce_cart_shipping_method_full_label', function ($label, $method) {

    if (
        isset($method->id) &&
        strpos($method->id, 'pickup_location') !== false
    ) {
        return 'Abholung vor Ort @ Jeans Gluth Helmbrechts';
    }

    return $label;

}, 20, 2);


add_filter('woocommerce_shipping_rate_label', function ($label, $rate) {

    // WooCommerce Blocks / Store API
    if (
        is_object($rate) &&
        method_exists($rate, 'get_id') &&
        strpos($rate->get_id(), 'pickup_location') !== false
    ) {
        return 'Abholung vor Ort @ Jeans Gluth Helmbrechts';
    }

    // Klassischer Checkout (Fallback)
    if (
        is_object($rate) &&
        property_exists($rate, 'id') &&
        strpos($rate->id, 'pickup_location') !== false
    ) {
        return 'vor Ort abholen (@ Jeans Gluth Helmbrechts)';
    }

    return $label;

}, 20, 2);