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

  function getWidth(el) {
    if (!el) return 0;
    var width = Math.round(el.getBoundingClientRect().width);
    return width > 0 ? width : 0;
  }

  function setImportantStyle(el, prop, value) {
    if (!el || !el.style) return;
    el.style.setProperty(prop, value, 'important');
  }

  function setExactWidth(el, width) {
    if (!el || !width) return;
    var px = width + 'px';
    setImportantStyle(el, 'width', px);
    setImportantStyle(el, 'max-width', px);
    setImportantStyle(el, 'min-width', px);
    setImportantStyle(el, 'box-sizing', 'border-box');
    setImportantStyle(el, 'margin-left', '0');
    setImportantStyle(el, 'margin-right', '0');
    setImportantStyle(el, 'display', 'block');
  }

  function collectAddToCartTargets(summary) {
    return summary.querySelectorAll([
      'form.cart',
      'form.cart .single_add_to_cart_button',
      'form.cart button.single_add_to_cart_button',
      'form.cart button[type="submit"]'
    ].join(','));
  }

  function collectPaypalTargets(summary) {
    var direct = summary.querySelectorAll([
      '.woocommerce-paypal-payments',
      '.woocommerce-paypal-payments-buttons',
      '.woocommerce-paypal-payments-buttons > div',
      '.ppc-button-wrapper',
      '.paypal-buttons',
      '.paypal-buttons > div',
      '[id^="paypal-button"]',
      '.wcpay-payment-request-wrapper',
      '.wcpay-payment-request-button',
      '.wcpay-express-checkout-button',
      'iframe[src*="paypal.com"]'
    ].join(','));

    var fuzzy = [];
    var all = summary.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var id = (el.id || '').toLowerCase();
      var cls = (el.className || '').toString().toLowerCase();
      var dataFunding = (el.getAttribute('data-funding-source') || '').toLowerCase();
      var aria = (el.getAttribute('aria-label') || '').toLowerCase();
      var src = (el.getAttribute('src') || '').toLowerCase();

      var isPaypalLike =
        id.indexOf('paypal') !== -1 ||
        id.indexOf('ppc') !== -1 ||
        cls.indexOf('paypal') !== -1 ||
        cls.indexOf('ppc') !== -1 ||
        dataFunding.indexOf('paypal') !== -1 ||
        aria.indexOf('paypal') !== -1 ||
        src.indexOf('paypal.com') !== -1;

      if (isPaypalLike) {
        fuzzy.push(el);
      }
    }

    var out = [];
    var seen = [];
    for (var d = 0; d < direct.length; d++) {
      out.push(direct[d]);
      seen.push(direct[d]);
    }
    for (var f = 0; f < fuzzy.length; f++) {
      if (seen.indexOf(fuzzy[f]) === -1) {
        out.push(fuzzy[f]);
        seen.push(fuzzy[f]);
      }
    }
    return out;
  }

  function lockAncestorsToWidth(el, stopAt, width) {
    if (!el || !stopAt || !width) return;
    var current = el.parentElement;
    var hops = 0;
    while (current && current !== stopAt && hops < 10) {
      setExactWidth(current, width);
      current = current.parentElement;
      hops++;
    }
  }

  function syncButtonWidths() {
    if (!isSingleProduct()) return;

    var summary = document.querySelector('.single-product .summary');
    if (!summary) return;

    var addToCartTargets = collectAddToCartTargets(summary);
    var paypalTargets = collectPaypalTargets(summary);

    if (!addToCartTargets.length || !paypalTargets.length) return;

    var addToCartWidth = getWidth(addToCartTargets[0]);
    var paypalWidth = getWidth(paypalTargets[0]);
    var summaryWidth = getWidth(summary);
    var targetWidth = Math.min(addToCartWidth || summaryWidth, paypalWidth || summaryWidth);

    if (!targetWidth) return;

    for (var a = 0; a < addToCartTargets.length; a++) {
      setExactWidth(addToCartTargets[a], targetWidth);
      lockAncestorsToWidth(addToCartTargets[a], summary, targetWidth);
    }

    for (var p = 0; p < paypalTargets.length; p++) {
      setExactWidth(paypalTargets[p], targetWidth);
      lockAncestorsToWidth(paypalTargets[p], summary, targetWidth);
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
