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

/****/
/********** 10 % Rabatt bei Abholung vor Ort ********/

add_action('woocommerce_cart_calculate_fees', function ($cart) {

    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }

    if (!$cart || $cart->is_empty()) {
        return;
    }

    $chosen_methods = WC()->session->get('chosen_shipping_methods');

    if (empty($chosen_methods)) {
        return;
    }

    foreach ($chosen_methods as $method) {
        if (strpos($method, 'local_pickup') !== false) {

            $discount = $cart->get_subtotal() * 0.10; /* ----> 10% Rabatt */

            $cart->add_fee(
                '10% Rabatt bei Abholung vor Ort',
                -$discount,
                false
            );

            break;
        }
    }

}, 20);