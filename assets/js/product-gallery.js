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
