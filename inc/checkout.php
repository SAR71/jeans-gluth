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

<?php
// LastChanged: 2026-07-29 17:45:00

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


/**
 * Coupon-Bereich im WooCommerce-Checkout automatisch öffnen.
 */
add_action( 'wp_footer', function () {

	if (
		! function_exists( 'is_checkout' ) ||
		! is_checkout()
	) {
		return;
	}

	?>
	<script>
	(function () {
		function openCouponPanelOnce() {
			const active = document.activeElement;

			if (
				active &&
				/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(active.tagName)
			) {
				return false;
			}

			const button = document.querySelector(
				'.wp-block-woocommerce-checkout-order-summary-coupon-form-block ' +
				'.wc-block-components-panel__button[aria-expanded="false"]'
			);

			if (!button) {
				return false;
			}

			button.click();

			document.documentElement.setAttribute(
				'data-coupon-opened',
				'1'
			);

			return true;
		}

		/*
		 * Sofort versuchen.
		 */
		if (openCouponPanelOnce()) {
			return;
		}

		/*
		 * WooCommerce Blocks werden häufig verzögert gerendert.
		 */
		let tries = 0;
		const maxTries = 30;

		const interval = setInterval(() => {
			tries++;

			if (
				document.documentElement.getAttribute(
					'data-coupon-opened'
				) === '1'
			) {
				clearInterval(interval);
				return;
			}

			if (
				openCouponPanelOnce() ||
				tries >= maxTries
			) {
				clearInterval(interval);
			}
		}, 200);

		/*
		 * Zusätzlich auf Änderungen im DOM reagieren.
		 */
		const observer = new MutationObserver(() => {
			if (
				document.documentElement.getAttribute(
					'data-coupon-opened'
				) === '1'
			) {
				observer.disconnect();
				return;
			}

			if (openCouponPanelOnce()) {
				observer.disconnect();
			}
		});

		const startObserver = () => {
			if (!document.body) {
				return;
			}

			observer.observe(
				document.body,
				{
					childList: true,
					subtree: true
				}
			);
		};

		if (document.readyState === 'loading') {
			document.addEventListener(
				'DOMContentLoaded',
				startObserver
			);
		} else {
			startObserver();
		}
	})();
	</script>
	<?php

}, 100 );


/**
 * Prüfen, ob eine Abholung vor Ort ausgewählt wurde.
 *
 * Erkannte Versandarten:
 * - local_pickup
 * - pickup_location
 *
 * @return bool
 */
function jg_is_pickup_shipping_selected() {

	if (
		! function_exists( 'WC' ) ||
		! WC()->session
	) {
		return false;
	}

	$chosen_methods = WC()->session->get(
		'chosen_shipping_methods',
		array()
	);

	if ( empty( $chosen_methods ) ) {
		return false;
	}

	foreach ( $chosen_methods as $method ) {
		$method = (string) $method;

		if (
			strpos( $method, 'local_pickup' ) !== false ||
			strpos( $method, 'pickup_location' ) !== false
		) {
			return true;
		}
	}

	return false;
}


/**
 * 10 % Rabatt bei Abholung vor Ort.
 *
 * Der Rabatt wird direkt auf den Preis der jeweiligen
 * Warenkorbposition angewendet.
 *
 * Bereits reduzierte Produkte und reduzierte Varianten
 * erhalten keinen zusätzlichen Abholrabatt.
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

	$is_pickup = jg_is_pickup_shipping_selected();

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
		 * Ursprünglichen Produktpreis einmalig speichern.
		 *
		 * Dadurch wird verhindert, dass bei jeder Neuberechnung
		 * erneut 10 % vom bereits rabattierten Preis abgezogen werden.
		 */
		if (
			! isset(
				$cart->cart_contents[
					$cart_item_key
				]['jg_original_price']
			)
		) {
			$cart->cart_contents[
				$cart_item_key
			]['jg_original_price'] = (float) $product->get_price();
		}

		$original_price = (float) $cart->cart_contents[
			$cart_item_key
		]['jg_original_price'];

		/*
		 * Vor jeder Berechnung den Originalpreis wiederherstellen.
		 *
		 * Das ist wichtig, wenn zwischen Versand und Abholung
		 * gewechselt wird.
		 */
		$product->set_price( $original_price );

		/*
		 * Eventuelle alte Rabattkennzeichnungen entfernen.
		 */
		unset(
			$cart->cart_contents[
				$cart_item_key
			]['jg_pickup_discount']
		);

		unset(
			$cart->cart_contents[
				$cart_item_key
			]['jg_pickup_discount_percent']
		);

		/*
		 * Ohne gewählte Abholung keinen Rabatt anwenden.
		 */
		if ( ! $is_pickup ) {
			continue;
		}

		/*
		 * Bereits reduzierte Artikel ausschließen.
		 *
		 * Bei Varianten enthält $cart_item['data'] die konkret
		 * ausgewählte Produktvariante.
		 */
		if ( $product->is_on_sale() ) {
			continue;
		}

		/*
		 * Zusätzliche Sicherheitsprüfung:
		 * Ist der aktuelle Preis niedriger als der reguläre Preis,
		 * wird der Artikel ebenfalls als reduziert behandelt.
		 */
		$regular_price = (float) $product->get_regular_price();

		if (
			$regular_price > 0 &&
			$original_price < $regular_price
		) {
			continue;
		}

		/*
		 * 10 % Rabatt berechnen.
		 */
		$discounted_price = round(
			$original_price * 0.90,
			wc_get_price_decimals()
		);

		if (
			$discounted_price <= 0 ||
			$discounted_price >= $original_price
		) {
			continue;
		}

		/*
		 * Rabattierten Produktpreis setzen.
		 */
		$product->set_price( $discounted_price );

		/*
		 * Informationen für Warenkorb und Checkout speichern.
		 */
		$cart->cart_contents[
			$cart_item_key
		]['jg_pickup_discount'] = true;

		$cart->cart_contents[
			$cart_item_key
		]['jg_pickup_discount_percent'] = 10;

		$cart->cart_contents[
			$cart_item_key
		]['jg_original_price'] = $original_price;
	}

}, 20 );


/**
 * Abholrabatt als Produktinformation anzeigen.
 *
 * Beispiel:
 * Abholrabatt: 10 %
 */
add_filter( 'woocommerce_get_item_data', function ( $item_data, $cart_item ) {

	if ( empty( $cart_item['jg_pickup_discount'] ) ) {
		return $item_data;
	}

	$discount_percent = isset(
		$cart_item['jg_pickup_discount_percent']
	)
		? (int) $cart_item['jg_pickup_discount_percent']
		: 10;

	$item_data[] = array(
		'key'   => 'Abholrabatt',
		'value' => $discount_percent . ' %',
	);

	return $item_data;

}, 20, 2 );


/**
 * Klassischer Warenkorb:
 * Ursprünglichen Preis durchstreichen und neuen Preis anzeigen.
 *
 * Beispiel:
 * 39,99 € 35,99 €
 */
add_filter( 'woocommerce_cart_item_price', function (
	$product_price,
	$cart_item,
	$cart_item_key
) {

	if (
		empty( $cart_item['jg_pickup_discount'] ) ||
		! isset( $cart_item['jg_original_price'] ) ||
		empty( $cart_item['data'] ) ||
		! $cart_item['data'] instanceof WC_Product
	) {
		return $product_price;
	}

	/** @var WC_Product $product */
	$product = $cart_item['data'];

	$original_price   = (float) $cart_item['jg_original_price'];
	$discounted_price = (float) $product->get_price();

	if (
		$original_price <= 0 ||
		$discounted_price <= 0 ||
		$discounted_price >= $original_price
	) {
		return $product_price;
	}

	return sprintf(
		'<del class="jg-pickup-original-price">%s</del> <ins class="jg-pickup-discounted-price">%s</ins>',
		wc_price( $original_price ),
		wc_price( $discounted_price )
	);

}, 20, 3 );


/**
 * Klassischer Warenkorb:
 * Ursprüngliche Positionssumme durchstreichen und
 * rabattierte Positionssumme anzeigen.
 */
add_filter( 'woocommerce_cart_item_subtotal', function (
	$product_subtotal,
	$cart_item,
	$cart_item_key
) {

	if (
		empty( $cart_item['jg_pickup_discount'] ) ||
		! isset( $cart_item['jg_original_price'] ) ||
		empty( $cart_item['data'] ) ||
		! $cart_item['data'] instanceof WC_Product
	) {
		return $product_subtotal;
	}

	/** @var WC_Product $product */
	$product = $cart_item['data'];

	$quantity = isset( $cart_item['quantity'] )
		? (float) $cart_item['quantity']
		: 1;

	$original_price   = (float) $cart_item['jg_original_price'];
	$discounted_price = (float) $product->get_price();

	if (
		$original_price <= 0 ||
		$discounted_price <= 0 ||
		$discounted_price >= $original_price
	) {
		return $product_subtotal;
	}

	$original_subtotal   = $original_price * $quantity;
	$discounted_subtotal = $discounted_price * $quantity;

	return sprintf(
		'<del class="jg-pickup-original-price">%s</del> <ins class="jg-pickup-discounted-price">%s</ins>',
		wc_price( $original_subtotal ),
		wc_price( $discounted_subtotal )
	);

}, 20, 3 );


/**
 * WooCommerce Cart- und Checkout-Blocks:
 *
 * Beim Abholrabatt den ursprünglichen Preis durchstreichen
 * und anschließend den neuen Preis anzeigen.
 */
add_action( 'wp_footer', function () {

	if (
		! function_exists( 'is_cart' ) ||
		! function_exists( 'is_checkout' ) ||
		(
			! is_cart() &&
			! is_checkout()
		)
	) {
		return;
	}

	?>
	<style>
		.jg-pickup-original-price {
			margin-right: 6px;
			opacity: 0.6;
			font-weight: 400;
			text-decoration: line-through;
		}

		.jg-pickup-discounted-price {
			color: inherit;
			font-weight: 600;
			text-decoration: none;
		}

		.wc-block-components-product-price del.jg-pickup-original-price {
			margin-right: 6px;
			opacity: 0.6;
			font-weight: 400;
		}
	</style>

	<script>
	(function () {
		let filterRegistered = false;
		let tries = 0;

		const maxTries = 100;

		/**
		 * Preis aus der kleinsten Währungseinheit formatieren.
		 *
		 * Beispiel:
		 * 3999 wird zu 39,99 €.
		 */
		function formatWooCommercePrice(rawPrice, prices) {
			const minorUnit = Number(
				prices?.currency_minor_unit ?? 2
			);

			const divisor = Math.pow(10, minorUnit);
			const numericPrice = Number(rawPrice) / divisor;

			if (!Number.isFinite(numericPrice)) {
				return '';
			}

			return new Intl.NumberFormat(
				'de-DE',
				{
					style: 'currency',
					currency:
						prices?.currency_code ||
						'EUR'
				}
			).format(numericPrice);
		}

		/**
		 * Prüfen, ob die Warenkorbposition mit dem
		 * Abholrabatt gekennzeichnet ist.
		 */
		function hasPickupDiscount(cartItem) {
			const itemData = Array.isArray(cartItem?.item_data)
				? cartItem.item_data
				: [];

			return itemData.some((item) => {
				const key = String(
					item?.key ??
					item?.name ??
					''
				)
					.trim()
					.toLowerCase();

				return key === 'abholrabatt';
			});
		}

		/**
		 * WooCommerce-Block-Filter registrieren.
		 */
		function registerPickupPriceFilter() {
			if (filterRegistered) {
				return true;
			}

			if (
				!window.wc ||
				!window.wc.blocksCheckout ||
				typeof window.wc.blocksCheckout
					.registerCheckoutFilters !== 'function'
			) {
				return false;
			}

			const {
				registerCheckoutFilters
			} = window.wc.blocksCheckout;

			registerCheckoutFilters(
				'jg-pickup-discount-price',
				{
					cartItemPrice: (
						defaultValue,
						extensions,
						args
					) => {
						const cartItem = args?.cartItem;

						if (!hasPickupDiscount(cartItem)) {
							return defaultValue;
						}

						const prices = cartItem?.prices;

						if (!prices) {
							return defaultValue;
						}

						const currentPrice = Number(
							prices.price
						);

						const regularPrice = Number(
							prices.regular_price
						);

						if (
							!Number.isFinite(currentPrice) ||
							!Number.isFinite(regularPrice) ||
							regularPrice <= currentPrice
						) {
							return defaultValue;
						}

						const formattedRegularPrice =
							formatWooCommercePrice(
								regularPrice,
								prices
							);

						if (!formattedRegularPrice) {
							return defaultValue;
						}

						return (
							'<del class="jg-pickup-original-price">' +
								formattedRegularPrice +
							'</del>' +
							'<ins class="jg-pickup-discounted-price">' +
								'<price/>' +
							'</ins>'
						);
					}
				}
			);

			filterRegistered = true;

			return true;
		}

		/*
		 * Filter sofort registrieren oder auf das Laden
		 * der WooCommerce Blocks warten.
		 */
		if (registerPickupPriceFilter()) {
			return;
		}

		const interval = setInterval(() => {
			tries++;

			if (
				registerPickupPriceFilter() ||
				tries >= maxTries
			) {
				clearInterval(interval);
			}
		}, 100);
	})();
	</script>
	<?php

}, 110 );


/**
 * Versandlabel in der klassischen Bestellübersicht anpassen.
 */
add_filter(
	'woocommerce_cart_shipping_method_full_label',
	function ( $label, $method ) {

		if (
			isset( $method->id ) &&
			strpos(
				(string) $method->id,
				'pickup_location'
			) !== false
		) {
			return 'Abholung vor Ort @ Jeans Gluth Helmbrechts';
		}

		return $label;

	},
	20,
	2
);


/**
 * Versandlabel für WooCommerce Blocks beziehungsweise
 * die WooCommerce Store API anpassen.
 */
add_filter(
	'woocommerce_shipping_rate_label',
	function ( $label, $rate ) {

		/*
		 * WooCommerce Blocks / Store API.
		 */
		if (
			is_object( $rate ) &&
			method_exists( $rate, 'get_id' ) &&
			strpos(
				(string) $rate->get_id(),
				'pickup_location'
			) !== false
		) {
			return 'Abholung vor Ort @ Jeans Gluth Helmbrechts';
		}

		/*
		 * Klassischer Checkout als Fallback.
		 */
		if (
			is_object( $rate ) &&
			property_exists( $rate, 'id' ) &&
			strpos(
				(string) $rate->id,
				'pickup_location'
			) !== false
		) {
			return 'Abholung vor Ort @ Jeans Gluth Helmbrechts';
		}

		return $label;

	},
	20,
	2
);

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