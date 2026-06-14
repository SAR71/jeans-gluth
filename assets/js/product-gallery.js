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

  function queryAll(selector) {
    return document.querySelectorAll(selector);
  }

  function getWidth(el) {
    if (!el) return 0;
    var rect = el.getBoundingClientRect();
    var width = Math.round(rect.width);
    return width > 0 ? width : 0;
  }

  function setExactWidth(el, width) {
    if (!el || !width) return;
    el.style.width = width + 'px';
    el.style.maxWidth = width + 'px';
    el.style.minWidth = width + 'px';
    el.style.boxSizing = 'border-box';
    el.style.marginLeft = '0';
    el.style.marginRight = '0';
    el.style.display = 'block';
  }

  function lockAncestorsToSummaryWidth(el, summary, width) {
    if (!el || !summary || !width) return;

    var current = el.parentElement;
    var hops = 0;
    while (current && current !== summary && hops < 8) {
      setExactWidth(current, width);
      current = current.parentElement;
      hops++;
    }
  }

  function syncButtonWidths() {
    if (!isSingleProduct()) return;

    var summary = document.querySelector('.single-product .summary');
    if (!summary) return;

    var addToCartTargets = queryAll([
      '.single-product .summary form.cart',
      '.single-product .summary .single_add_to_cart_button',
      '.single-product .summary button.single_add_to_cart_button'
    ].join(','));

    for (var a = 0; a < addToCartTargets.length; a++) {
      setExactWidth(addToCartTargets[a], width);
    }

    var paypalTargets = queryAll([
      '.single-product .summary .woocommerce-paypal-payments',
      '.single-product .summary .woocommerce-paypal-payments-buttons',
      '.single-product .summary .woocommerce-paypal-payments-buttons > div',
      '.single-product .summary .ppc-button-wrapper',
      '.single-product .summary .paypal-buttons',
      '.single-product .summary .paypal-buttons > div',
      '.single-product .summary [id^="paypal-button"]',
      '.single-product .summary .wcpay-payment-request-wrapper',
      '.single-product .summary .wcpay-payment-request-button',
      '.single-product .summary .wcpay-express-checkout-button',
      '.single-product .summary iframe[src*="paypal.com"]'
    ].join(','));

    var summaryWidth = getWidth(summary);
    var addToCartWidth = addToCartTargets.length ? getWidth(addToCartTargets[0]) : 0;
    var paypalWidth = paypalTargets.length ? getWidth(paypalTargets[0]) : 0;

    var width = 0;
    if (addToCartWidth && paypalWidth) {
      width = Math.min(addToCartWidth, paypalWidth);
    } else if (paypalWidth) {
      width = paypalWidth;
    } else if (addToCartWidth) {
      width = addToCartWidth;
    } else {
      width = summaryWidth;
    }

    if (!width) return;

    for (var i = 0; i < paypalTargets.length; i++) {
      var target = paypalTargets[i];
      setExactWidth(target, width);
      lockAncestorsToSummaryWidth(target, summary, width);
    }

    for (var a = 0; a < addToCartTargets.length; a++) {
      setExactWidth(addToCartTargets[a], width);
      lockAncestorsToSummaryWidth(addToCartTargets[a], summary, width);
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

  if (window.ResizeObserver) {
    var summary = document.querySelector('.single-product .summary');
    if (summary) {
      var resizeObserver = new ResizeObserver(scheduleSync);
      resizeObserver.observe(summary);
    }
  }

  var summaryRoot = document.querySelector('.single-product .summary');
  if (summaryRoot && window.MutationObserver) {
    var observer = new MutationObserver(scheduleSync);
    observer.observe(summaryRoot, { childList: true, subtree: true, attributes: true });
  }

  var retries = 0;
  var retryTimer = setInterval(function () {
    retries++;
    scheduleSync();
    if (retries >= 40) {
      clearInterval(retryTimer);
    }
  }, 250);
})();
