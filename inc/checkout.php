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
 * Der Preis wird direkt an der jeweiligen Warenkorbposition
 * reduziert. Bereits reduzierte Artikel und Varianten werden
 * ausgeschlossen.
 *
 * Erkannte Versandarten:
 * - local_pickup
 * - pickup_location
 */
add_action( 'woocommerce_before_calculate_totals', function ( $cart ) {

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
		'chosen_shipping_methods',
		array()
	);

	/*
	 * Prüfen, ob Abholung vor Ort gewählt wurde.
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

	foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {

		if (
			empty( $cart_item['data'] ) ||
			! $cart_item['data'] instanceof WC_Product
		) {
			continue;
		}

		/** @var WC_Product $product */
		$product = $cart_item['data'];

		/*
		 * Den ursprünglichen Preis einmalig speichern.
		 *
		 * Dadurch wird verhindert, dass WooCommerce den Rabatt
		 * bei jeder Neuberechnung erneut vom bereits reduzierten
		 * Preis abzieht.
		 */
		if (
			! isset(
				$cart->cart_contents[ $cart_item_key ]['jg_original_price']
			)
		) {
			$cart->cart_contents[ $cart_item_key ]['jg_original_price'] =
				(float) $product->get_price();
		}

		$original_price = (float) $cart->cart_contents[
			$cart_item_key
		]['jg_original_price'];

		/*
		 * Zunächst immer den ursprünglichen Preis wiederherstellen.
		 *
		 * Das ist wichtig, wenn der Kunde zwischen Versand und
		 * Abholung wechselt.
		 */
		$product->set_price( $original_price );

		/*
		 * Ohne Abholung keinen Rabatt anwenden.
		 */
		if ( ! $is_pickup ) {
			unset(
				$cart->cart_contents[
					$cart_item_key
				]['jg_pickup_discount']
			);

			continue;
		}

		/*
		 * Bereits reduzierte Produkte und Varianten ausschließen.
		 */
		if ( $product->is_on_sale() ) {
			unset(
				$cart->cart_contents[
					$cart_item_key
				]['jg_pickup_discount']
			);

			continue;
		}

		/*
		 * 10 % Rabatt auf den einzelnen Produktpreis.
		 */
		$discounted_price = round(
			$original_price * 0.90,
			wc_get_price_decimals()
		);

		$product->set_price( $discounted_price );

		/*
		 * Kennzeichnung für die Anzeige speichern.
		 */
		$cart->cart_contents[
			$cart_item_key
		]['jg_pickup_discount'] = true;
	}

}, 20 );


/**
 * Hinweis unter dem betroffenen Produkt anzeigen.
 */
add_filter( 'woocommerce_get_item_data', function ( $item_data, $cart_item ) {

	if ( empty( $cart_item['jg_pickup_discount'] ) ) {
		return $item_data;
	}

	$item_data[] = array(
		'key'   => 'Abholrabatt',
		'value' => '10 %',
	);

	return $item_data;

}, 20, 2 );


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