// LastChanged: 2026-06-24 00:00:00
/* ******************** Sub-Kategorien als Kreise ***********************/

(() => {
  const KEY = 'jgSubcatScrollLeft_v1';
  const KEY_CLICKED = 'jgSubcatClickedTerm_v1';

  function getScroller() {
    return document.querySelector('.jg-subcat-circles');
  }

  function syncOverflowAlignment() {
    const scroller = getScroller();
    if (!scroller) return;

    const hasOverflow = scroller.scrollWidth > (scroller.clientWidth + 1);
    scroller.classList.toggle('jg-subcat-circles--overflow', hasOverflow);
  }

  function clearClicked() {
    document.querySelectorAll('.jg-subcat-item.is-clicked')
      .forEach(el => el.classList.remove('is-clicked'));
  }

  function restoreScroller() {
    const scroller = getScroller();
    if (!scroller) return;

    const saved = sessionStorage.getItem(KEY);
    if (saved !== null) {
      const x = parseInt(saved, 10);
      if (!Number.isNaN(x)) scroller.scrollLeft = x;
    }

    const clickedId = sessionStorage.getItem(KEY_CLICKED);
    if (clickedId) {
      const el = document.querySelector(`.jg-subcat-item[data-term-id="${clickedId}"]`);
      if (el) {
        clearClicked();
        el.classList.add('is-clicked');
      }
    }
  }

  function bindClicks() {
    const scroller = getScroller();
    if (!scroller) return;

    let lastSaved = null;
    let rafPending = false;

    function saveScrollLeft(force = false) {
      const value = String(scroller.scrollLeft);
      if (!force && value === lastSaved) return;
      lastSaved = value;
      sessionStorage.setItem(KEY, value);
    }

    function rememberSelection(item) {
      if (!item) return;

      clearClicked();
      item.classList.add('is-clicked');

      saveScrollLeft(true);

      const termId = item.getAttribute('data-term-id');
      if (termId) sessionStorage.setItem(KEY_CLICKED, termId);
    }

    let lastPointerdownItem = null;

    scroller.addEventListener('pointerdown', (e) => {
      const item = e.target.closest('.jg-subcat-item');
      if (!item) return;

      lastPointerdownItem = item;
      rememberSelection(item);
    }, { passive: true });

    // Fallback für Geräte ohne Pointer-Events; verhindert Doppel-Aufruf nach pointerdown.
    scroller.addEventListener('click', (e) => {
      const item = e.target.closest('.jg-subcat-item');
      if (!item) return;
      if (item === lastPointerdownItem) {
        lastPointerdownItem = null;
        return;
      }
      rememberSelection(item);
    });

    // Keyboard-Support: Auswahl auch bei Enter/Space merken.
    scroller.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;

      const item = e.target.closest('.jg-subcat-item');
      if (!item) return;

      if (e.key === ' ') {
        e.preventDefault();
      }

      rememberSelection(item);

      if (e.key === ' ') {
        item.click();
      }
    });

    // falls jemand per Keyboard navigiert: aktuelle Scrollposition merken
    scroller.addEventListener('scroll', () => {
      if (rafPending) return;
      rafPending = true;

      requestAnimationFrame(() => {
        rafPending = false;
        saveScrollLeft();
      });
    }, { passive: true });
  }

  // Wichtig: wir verhindern NICHT global scrollRestoration,
  // weil das bei dir Reload-Sprünge erzeugen kann.
  // Wir managen NUR die horizontale Kreisleiste.

  document.addEventListener('DOMContentLoaded', () => {
    bindClicks();
    restoreScroller();
    syncOverflowAlignment();

    window.addEventListener('resize', syncOverflowAlignment, { passive: true });
  });

  // Wenn Seite aus bfcache zurückkommt (Back/Forward)
  window.addEventListener('pageshow', () => {
    restoreScroller();
    syncOverflowAlignment();
  });
})();
