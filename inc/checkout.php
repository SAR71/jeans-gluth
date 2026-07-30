<?php

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
			const activeElement = document.activeElement;

			/*
			 * Coupon-Bereich nicht automatisch öffnen,
			 * während der Kunde gerade ein Formularfeld bedient.
			 */
			if (
				activeElement &&
				/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(
					activeElement.tagName
				)
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
				'data-jg-coupon-opened',
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
		 * WooCommerce Blocks werden teilweise verzögert geladen.
		 */
		let attempts = 0;
		const maximumAttempts = 30;

		const interval = setInterval(() => {
			attempts++;

			const alreadyOpened =
				document.documentElement.getAttribute(
					'data-jg-coupon-opened'
				) === '1';

			if (alreadyOpened) {
				clearInterval(interval);
				return;
			}

			if (
				openCouponPanelOnce() ||
				attempts >= maximumAttempts
			) {
				clearInterval(interval);
			}
		}, 200);

		/*
		 * Zusätzlich auf nachträgliche Änderungen im DOM reagieren.
		 */
		const observer = new MutationObserver(() => {
			const alreadyOpened =
				document.documentElement.getAttribute(
					'data-jg-coupon-opened'
				) === '1';

			if (alreadyOpened) {
				observer.disconnect();
				return;
			}

			if (openCouponPanelOnce()) {
				observer.disconnect();
			}
		});

		function startObserver() {
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
		}

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
 * Unterstützte Versandarten:
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
 * 10 % Rabatt bei Abholung vor Ort anwenden.
 *
 * Der Rabatt wird direkt auf den Produktpreis der jeweiligen
 * Warenkorbposition angewendet.
 *
 * Bereits reduzierte Produkte und Varianten werden ausgeschlossen.
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
		 * Ursprünglichen Preis nur einmal speichern.
		 *
		 * Dadurch werden nicht bei jeder Neuberechnung erneut
		 * 10 % vom bereits rabattierten Preis abgezogen.
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
		 * Vor jeder Berechnung den ursprünglichen Preis setzen.
		 *
		 * Das ist notwendig, wenn zwischen Versand und Abholung
		 * gewechselt wird.
		 */
		$product->set_price( $original_price );

		/*
		 * Vorherige Rabattkennzeichnungen entfernen.
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
		 * Ohne ausgewählte Abholung keinen Rabatt anwenden.
		 */
		if ( ! $is_pickup ) {
			continue;
		}

		/*
		 * Bereits reduzierte Produkte oder Varianten ausschließen.
		 */
		if ( $product->is_on_sale() ) {
			continue;
		}

		/*
		 * Zusätzliche Prüfung:
		 * Ist der aktuelle Preis niedriger als der reguläre Preis,
		 * gilt das Produkt ebenfalls als reduziert.
		 */
		$regular_price = (float) $product->get_regular_price();

		if (
			$regular_price > 0 &&
			$original_price < $regular_price
		) {
			continue;
		}

		/*
		 * Rabattierten Preis berechnen.
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
		 * Rabattinformationen an der Warenkorbposition speichern.
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
 * Ausgabe:
 * Abholrabatt: 10 %
 */
add_filter( 'woocommerce_get_item_data', function (
	$item_data,
	$cart_item
) {

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
 * Klassischer Warenkorb und klassischer Checkout:
 * Ursprünglichen Einzelpreis durchstreichen und
 * rabattierten Einzelpreis anzeigen.
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
 * Klassischer Warenkorb und klassischer Checkout:
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

	$original_subtotal =
		$original_price * $quantity;

	$discounted_subtotal =
		$discounted_price * $quantity;

	return sprintf(
		'<del class="jg-pickup-original-price">%s</del> <ins class="jg-pickup-discounted-price">%s</ins>',
		wc_price( $original_subtotal ),
		wc_price( $discounted_subtotal )
	);

}, 20, 3 );


/**
 * Preisdarstellung für WooCommerce Cart- und Checkout-Blocks.
 *
 * Der ursprüngliche Preis wird durchgestrichen und anschließend
 * der rabattierte Preis angezeigt.
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

		.wc-block-components-product-price
		del.jg-pickup-original-price {
			margin-right: 6px;
			opacity: 0.6;
			font-weight: 400;
		}
	</style>

	<script>
	(function () {
		let filterRegistered = false;
		let attempts = 0;

		const maximumAttempts = 100;

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
		 * von WooCommerce Blocks warten.
		 */
		if (registerPickupPriceFilter()) {
			return;
		}

		const interval = setInterval(() => {
			attempts++;

			if (
				registerPickupPriceFilter() ||
				attempts >= maximumAttempts
			) {
				clearInterval(interval);
			}
		}, 100);
	})();
	</script>
	<?php

}, 110 );


/**
 * Versandlabel im klassischen Warenkorb und Checkout anpassen.
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
 * Versandlabel für WooCommerce Blocks und Store API anpassen.
 */
add_filter(
	'woocommerce_shipping_rate_label',
	function ( $label, $rate ) {

		/*
		 * WooCommerce Blocks und Store API.
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