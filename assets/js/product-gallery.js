// LastChanged: 2026-06-14 00:00:00
/* ******************************** VERHALTEN WHISHLIST ICON ******************* */
(function () {
  function setPending(a) {
    if (!a) return;

    // sofortiger Zustand je nach Toggle-Richtung
    const willRemove = a.classList.contains('added');
    a.classList.remove('wd-pending-add', 'wd-pending-remove');
    a.classList.add(willRemove ? 'wd-pending-remove' : 'wd-pending-add');

    // Beobachte Klassenwechsel (Ajax setzt/entfernt "added")
    const obs = new MutationObserver(() => {
      const isAdded = a.classList.contains('added');

      // Wenn Zielzustand erreicht, Pending entfernen
      if (!willRemove && isAdded) {
        a.classList.remove('wd-pending-add', 'wd-pending-remove');
        obs.disconnect();
      } else if (willRemove && !isAdded) {
        a.classList.remove('wd-pending-add', 'wd-pending-remove');
        obs.disconnect();
      }
    });

    obs.observe(a, { attributes: true, attributeFilter: ['class'] });

    // Fallback: falls Woodmart den Link ersetzt
    setTimeout(() => {
      try { a.classList.remove('wd-pending-add', 'wd-pending-remove'); } catch (e) {}
      try { obs.disconnect(); } catch (e) {}
    }, 2500);
  }

  document.addEventListener('click', function (e) {
    const a = e.target.closest('.wd-wishlist-btn a');
    if (!a) return;
    setPending(a);
  }, true);
})();

/* Keep add-to-cart and PayPal buttons exactly same width on all breakpoints */
(function () {
  function isSingleProduct() {
    return document.body && document.body.classList.contains('single-product');
  }

  function getReferenceWidth() {
    var addToCartBtn = document.querySelector(
      '.single-product .summary .single_add_to_cart_button, .single-product .summary button.single_add_to_cart_button'
    );
    if (addToCartBtn) {
      var btnWidth = Math.round(addToCartBtn.getBoundingClientRect().width);
      if (btnWidth > 0) return btnWidth;
    }

    var cartForm = document.querySelector('.single-product .summary form.cart');
    if (cartForm) {
      var formWidth = Math.round(cartForm.getBoundingClientRect().width);
      if (formWidth > 0) return formWidth;
    }

    var summary = document.querySelector('.single-product .summary');
    if (summary) {
      var summaryWidth = Math.round(summary.getBoundingClientRect().width);
      if (summaryWidth > 0) return summaryWidth;
    }

    return 0;
  }

  function getPaypalTargets() {
    return document.querySelectorAll([
      '.single-product .summary .woocommerce-paypal-payments-buttons',
      '.single-product .summary .woocommerce-paypal-payments-buttons > div',
      '.single-product .summary .ppc-button-wrapper',
      '.single-product .summary .paypal-buttons',
      '.single-product .summary .paypal-buttons > div',
      '.single-product .summary [id^="paypal-button"]',
      '.single-product .summary iframe[src*="paypal.com"]',
      '.single-product .summary .wcpay-payment-request-wrapper',
      '.single-product .summary .wcpay-payment-request-button',
      '.single-product .summary .wcpay-express-checkout-button'
    ].join(','));
  }

  function syncButtonWidths() {
    if (!isSingleProduct()) return;

    var width = getReferenceWidth();
    if (!width) return;

    var targets = getPaypalTargets();
    if (!targets.length) return;

    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      el.style.width = width + 'px';
      el.style.maxWidth = width + 'px';
      el.style.minWidth = width + 'px';
      el.style.boxSizing = 'border-box';
      el.style.marginLeft = '0';
      el.style.marginRight = '0';
    }
  }

  var rafId = 0;
  function scheduleSync() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(syncButtonWidths);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSync);
  } else {
    scheduleSync();
  }

  window.addEventListener('load', scheduleSync);
  window.addEventListener('resize', scheduleSync);
  window.addEventListener('orientationchange', scheduleSync);

  var summaryRoot = document.querySelector('.single-product .summary');
  if (summaryRoot && window.MutationObserver) {
    var observer = new MutationObserver(scheduleSync);
    observer.observe(summaryRoot, { childList: true, subtree: true, attributes: true });
  }

  var retries = 0;
  var retryTimer = setInterval(function () {
    retries++;
    scheduleSync();
    if (retries >= 30) {
      clearInterval(retryTimer);
    }
  }, 250);
})();
