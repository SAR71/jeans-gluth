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
 * WooCommerce Block-Warenkorb und Block-Checkout:
 *
 * Beim Abholrabatt den ursprünglichen Preis durchgestrichen
 * vor dem rabattierten Preis anzeigen.
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
		.jg-pickup-price-wrapper {
			display: inline-flex !important;
			align-items: baseline;
			justify-content: flex-end;
			gap: 6px;
			white-space: nowrap;
		}

		.jg-pickup-original-price {
			display: inline !important;
			opacity: 0.6;
			font-weight: 400;
			text-decoration: line-through !important;
		}

		.jg-pickup-discounted-price {
			display: inline !important;
			color: inherit;
			font-weight: 600;
			text-decoration: none !important;
		}
	</style>

	<script>
	(function () {
		'use strict';

		let updateTimer = null;
		let updateRunning = false;

		/**
		 * Deutschen Preistext in eine Zahl umwandeln.
		 *
		 * 35,99 €    -> 35.99
		 * 1.035,99 € -> 1035.99
		 */
		function parseGermanPrice(value) {
			const text = String(value ?? '')
				.replace(/\u00a0/g, '')
				.replace(/\s/g, '')
				.replace(/[^\d,.-]/g, '')
				.replace(/\./g, '')
				.replace(',', '.');

			const price = Number(text);

			return Number.isFinite(price)
				? price
				: null;
		}

		/**
		 * Preis im deutschen Euroformat ausgeben.
		 */
		function formatGermanPrice(value) {
			return new Intl.NumberFormat(
				'de-DE',
				{
					style: 'currency',
					currency: 'EUR'
				}
			).format(value);
		}

		/**
		 * Zu einem Element die vollständige Produktposition suchen.
		 */
		function findProductRow(element) {
			if (!element) {
				return null;
			}

			return element.closest(
				'.wc-block-components-order-summary-item, ' +
				'.wc-block-cart-items__row, ' +
				'[class*="order-summary-item"]'
			);
		}

		/**
		 * Alle Produktpositionen mit Abholrabatt suchen.
		 */
		function findDiscountedRows() {
			const rows = new Set();

			/*
			 * Standardpositionen im Warenkorb und Checkout.
			 */
			document.querySelectorAll(
				'.wc-block-components-order-summary-item, ' +
				'.wc-block-cart-items__row, ' +
				'[class*="order-summary-item"]'
			).forEach((row) => {
				const text = String(row.textContent ?? '')
					.toLowerCase();

				if (text.includes('abholrabatt')) {
					rows.add(row);
				}
			});

			/*
			 * Zusätzlicher Fallback:
			 * Direkt nach dem Text "Abholrabatt" suchen und
			 * von dort zur Produktposition hochgehen.
			 */
			document.querySelectorAll(
				'.wc-block-components-product-details, ' +
				'.wc-block-components-product-details__name, ' +
				'.wc-block-components-product-details__value, ' +
				li, dt, dd'
			).forEach((element) => {
				const text = String(element.textContent ?? '')
					.toLowerCase();

				if (!text.includes('abholrabatt')) {
					return;
				}

				const row = findProductRow(element);

				if (row) {
					rows.add(row);
				}
			});

			return Array.from(rows);
		}

		/**
		 * Preiscontainer innerhalb einer Produktposition suchen.
		 */
		function findPriceContainer(row) {
			if (!row) {
				return null;
			}

			return (
				row.querySelector(
					'.wc-block-components-product-price'
				) ||
				row.querySelector(
					'[class*="product-price"]'
				) ||
				row.querySelector(
					'.wc-block-components-order-summary-item__individual-prices'
				)
			);
		}

		/**
		 * Rabattdarstellung ergänzen.
		 */
		function updatePickupPrices() {
			if (updateRunning) {
				return;
			}

			updateRunning = true;

			try {
				const rows = findDiscountedRows();

				rows.forEach((row) => {
					const priceContainer =
						findPriceContainer(row);

					if (!priceContainer) {
						return;
					}

					/*
					 * Bereits korrekt bearbeitete Preise überspringen.
					 */
					if (
						priceContainer.querySelector(
							'.jg-pickup-price-wrapper'
						)
					) {
						return;
					}

					/*
					 * Eventuell vorhandenen normalen Angebotspreis
					 * bevorzugt auslesen.
					 */
					const currentPriceElement =
						priceContainer.querySelector(
							'.wc-block-components-product-price__value'
						) ||
						priceContainer.querySelector(
							'ins'
						) ||
						priceContainer;

					const discountedPrice = parseGermanPrice(
						currentPriceElement.textContent
					);

					if (
						discountedPrice === null ||
						discountedPrice <= 0
					) {
						return;
					}

					/*
					 * Der neue Preis entspricht 90 % des Originalpreises.
					 */
					const originalPrice =
						Math.round(
							(discountedPrice / 0.90) * 100
						) / 100;

					if (
						originalPrice <= discountedPrice
					) {
						return;
					}

					const wrapper =
						document.createElement('span');

					wrapper.className =
						'jg-pickup-price-wrapper';

					const originalElement =
						document.createElement('del');

					originalElement.className =
						'jg-pickup-original-price';

					originalElement.textContent =
						formatGermanPrice(originalPrice);

					const discountedElement =
						document.createElement('ins');

					discountedElement.className =
						'jg-pickup-discounted-price';

					discountedElement.textContent =
						formatGermanPrice(discountedPrice);

					wrapper.appendChild(originalElement);
					wrapper.appendChild(discountedElement);

					priceContainer.replaceChildren(wrapper);
				});
			} finally {
				updateRunning = false;
			}
		}

		/**
		 * Änderungen gebündelt ausführen.
		 */
		function scheduleUpdate() {
			window.clearTimeout(updateTimer);

			updateTimer = window.setTimeout(
				updatePickupPrices,
				100
			);
		}

		/*
		 * Beim ersten Laden mehrfach versuchen.
		 */
		let attempts = 0;

		const initialInterval = window.setInterval(() => {
			attempts++;
			updatePickupPrices();

			if (attempts >= 50) {
				window.clearInterval(initialInterval);
			}
		}, 200);

		/*
		 * WooCommerce rendert die Bestellübersicht bei Änderungen
		 * der Versandart und anderer Checkout-Daten erneut.
		 */
		function startObserver() {
			if (!document.body) {
				return;
			}

			const observer = new MutationObserver(
				scheduleUpdate
			);

			observer.observe(
				document.body,
				{
					childList: true,
					subtree: true
				}
			);

			scheduleUpdate();
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

/* =========================================================
 * CHECKOUT – VERSANDARTEN DYNAMISCH POSITIONIEREN
 *
 * Ablauf:
 * 1. Normale Schrift und normale Tabellenansicht herstellen.
 * 2. Prüfen, ob eine Versandoption rechts neben SENDUNG passt.
 * 3. Nur bei Platzmangel die Optionen unter SENDUNG verschieben.
 * 4. Schrift erst dann verkleinern, wenn sie dort noch überläuft.
 * ========================================================= */

add_action( 'wp_footer', function () {

	if (
		! function_exists( 'is_checkout' ) ||
		! is_checkout() ||
		is_order_received_page()
	) {
		return;
	}

	?>
	<script>
	jQuery(function ($) {
		'use strict';

		const rowSelector =
			'.woocommerce-checkout-review-order-table ' +
			'tr.woocommerce-shipping-totals.shipping';

		const minimumFontSize = 11;
		let resizeTimer = null;


		/**
		 * Breite eines Elements einschließlich horizontaler
		 * Außenabstände ermitteln.
		 */
		function outerWidthWithMargins($element) {

			if (!$element.length) {
				return 0;
			}

			const element = $element[0];
			const style = window.getComputedStyle(element);

			return (
				element.getBoundingClientRect().width +
				parseFloat(style.marginLeft || 0) +
				parseFloat(style.marginRight || 0)
			);
		}


		/**
		 * Prüfen, ob eine Versandoption innerhalb ihrer
		 * aktuellen Zeile vollständig Platz hat.
		 */
		function itemHasHorizontalOverflow($item) {

			const $label = $item.find('label').first();
			const $input = $item.find('input.shipping_method').first();

			if (!$label.length) {
				return false;
			}

			const itemWidth = $item[0].getBoundingClientRect().width;
			const inputWidth = outerWidthWithMargins($input);

			/*
			 * Sicherheitsabstand zwischen Text und Radio-Button.
			 */
			const gap = 10;

			const availableLabelWidth =
				itemWidth - inputWidth - gap;

			const requiredLabelWidth =
				$label[0].scrollWidth;

			return requiredLabelWidth > availableLabelWidth + 1;
		}


		/**
		 * Eine Versandzeile vollständig neu berechnen.
		 */
		function updateShippingRow($row) {

			const $items = $row.find(
				'ul.woocommerce-shipping-methods > li'
			);

			if (!$items.length) {
				return;
			}

			/*
			 * Zuerst immer den normalen Zustand wiederherstellen.
			 * Dadurch bleiben breite Breakpoints unverändert.
			 */
			$row.removeClass('jg-shipping-stacked');

			$items.find('label').each(function () {
				this.style.removeProperty('font-size');
				this.style.removeProperty('white-space');
			});


			/*
			 * Browser zunächst den normalen Tabellenzustand
			 * vollständig berechnen lassen.
			 */
			void $row[0].offsetWidth;


			/*
			 * Prüfen, ob mindestens eine Option im normalen
			 * rechten Tabellenfeld zu wenig Platz hat.
			 */
			let mustStack = false;

			$items.each(function () {

				const $item = $(this);
				const $label = $item.find('label').first();

				if (!$label.length) {
					return;
				}

				/*
				 * Für die Messung einen Umbruch verhindern,
				 * ohne die Schriftgröße zu verändern.
				 */
				$label.css('white-space', 'nowrap');

				if (itemHasHorizontalOverflow($item)) {
					mustStack = true;
				}
			});


			/*
			 * Genügend Platz:
			 * Normalzustand verwenden und nichts verkleinern.
			 */
			if (!mustStack) {

				$items.find('label').each(function () {
					this.style.removeProperty('font-size');
					this.style.removeProperty('white-space');
				});

				return;
			}


			/*
			 * Platzmangel:
			 * Versandoptionen unter SENDUNG verschieben.
			 */
			$row.addClass('jg-shipping-stacked');

			void $row[0].offsetWidth;


			/*
			 * Erst jetzt prüfen, ob der Text trotz voller
			 * Zeilenbreite noch überläuft.
			 */
			$items.each(function () {

				const $item = $(this);
				const $label = $item.find('label').first();

				if (!$label.length) {
					return;
				}

				$label.css('white-space', 'nowrap');

				/*
				 * Tatsächliche reguläre Schriftgröße übernehmen.
				 */
				let fontSize = parseFloat(
					window.getComputedStyle($label[0]).fontSize
				);

				if (!Number.isFinite(fontSize) || fontSize <= 0) {
					fontSize = 16;
				}

				/*
				 * Nur bei weiter bestehendem Platzmangel
				 * schrittweise verkleinern.
				 */
				while (
					itemHasHorizontalOverflow($item) &&
					fontSize > minimumFontSize
				) {
					fontSize -= 0.5;

					$label.css(
						'font-size',
						fontSize + 'px'
					);
				}
			});
		}


		/**
		 * Alle Versandzeilen aktualisieren.
		 */
		function updateShippingLayout() {

			$(rowSelector).each(function () {
				updateShippingRow($(this));
			});
		}


		/**
		 * Neuberechnung verzögert bündeln.
		 */
		function scheduleShippingUpdate() {

			window.clearTimeout(resizeTimer);

			resizeTimer = window.setTimeout(
				updateShippingLayout,
				80
			);
		}


		/*
		 * Beim ersten Laden berechnen.
		 */
		scheduleShippingUpdate();


		/*
		 * Bei Größenänderungen dynamisch neu entscheiden.
		 */
		$(window).on(
			'resize orientationchange',
			scheduleShippingUpdate
		);


		/*
		 * WooCommerce ersetzt die Bestellübersicht bei
		 * Versand- und Adressänderungen per AJAX.
		 */
		$(document.body).on(
			'updated_checkout updated_shipping_method',
			scheduleShippingUpdate
		);
	});
	</script>
	<?php

}, 100 );

/**
 * =========================================================
 * BESTELLPOSITIONEN – PREISSTATUS DAUERHAFT SPEICHERN
 * =========================================================
 *
 * Speichert bei Bestellung:
 *
 * SALE:
 * - regulären Preis zum Kaufzeitpunkt
 * - Sale-Preis zum Kaufzeitpunkt
 *
 * ABHOLRABATT:
 * - ursprünglichen Preis
 * - rabattierten Preis
 * - Rabatt in Prozent
 * - Rabattbetrag
 */
add_action(
    'woocommerce_checkout_create_order_line_item',
    function ( $item, $cart_item_key, $values, $order ) {

        if (
            empty( $values['data'] ) ||
            ! $values['data'] instanceof WC_Product
        ) {
            return;
        }

        /** @var WC_Product $product */
        $product = $values['data'];

        $quantity = isset( $values['quantity'] )
            ? (float) $values['quantity']
            : 1;


        /* =====================================================
         * 1. ABHOLRABATT
         * ===================================================== */
        if ( ! empty( $values['jg_pickup_discount'] ) ) {

            $discount_percent = isset(
                $values['jg_pickup_discount_percent']
            )
                ? (int) $values['jg_pickup_discount_percent']
                : 10;

            $original_price = isset(
                $values['jg_original_price']
            )
                ? (float) $values['jg_original_price']
                : 0;

            $discounted_price = (float) $product->get_price();

            /*
             * Sichtbare Information
             */
            $item->add_meta_data(
                'Abholrabatt',
                $discount_percent . ' %',
                true
            );


            /*
             * Interne historische Daten
             */
            $item->add_meta_data(
                '_jg_pickup_discount',
                'yes',
                true
            );

            $item->add_meta_data(
                '_jg_pickup_discount_percent',
                $discount_percent,
                true
            );

            $item->add_meta_data(
                '_jg_original_price_at_purchase',
                $original_price,
                true
            );

            $item->add_meta_data(
                '_jg_discounted_price_at_purchase',
                $discounted_price,
                true
            );


            /*
             * Tatsächlichen Rabattbetrag der Position speichern
             */
            if (
                $original_price > 0 &&
                $discounted_price > 0 &&
                $original_price > $discounted_price
            ) {

                $discount_amount =
                    ( $original_price - $discounted_price ) *
                    $quantity;

                $item->add_meta_data(
                    '_jg_pickup_discount_amount',
                    $discount_amount,
                    true
                );
            }
        }


        /* =====================================================
         * 2. SALE-ARTIKEL
         * ===================================================== */

        $regular_price = (float) $product->get_regular_price();
        $sale_price    = (float) $product->get_sale_price();

        /*
         * Nur als Sale speichern, wenn tatsächlich ein
         * gültiger Sale-Preis vorhanden ist.
         */
        if (
            $regular_price > 0 &&
            $sale_price > 0 &&
            $sale_price < $regular_price
        ) {

            /*
             * Sichtbare Information
             */
            $item->add_meta_data(
                'Preis',
                'Sale-Preis',
                true
            );


            /*
             * Historische Werte zum Bestellzeitpunkt
             */
            $item->add_meta_data(
                '_jg_was_sale',
                'yes',
                true
            );

            $item->add_meta_data(
                '_jg_regular_price_at_purchase',
                $regular_price,
                true
            );

            $item->add_meta_data(
                '_jg_sale_price_at_purchase',
                $sale_price,
                true
            );
        }

    },
    20,
    4
);