/* ******************** Sub-Kategorien als Kreise ***********************/

(() => {
  const KEY = 'jgSubcatScrollLeft_v1';
  const KEY_CLICKED = 'jgSubcatClickedTerm_v1';

  function getScroller() {
    return document.querySelector('.jg-subcat-circles');
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

    scroller.addEventListener('pointerdown', (e) => {
      const item = e.target.closest('.jg-subcat-item');
      if (!item) return;

      // Ring sofort sichtbar (ohne auf Seitenwechsel zu warten)
      clearClicked();
      item.classList.add('is-clicked');

      // horizontale Position speichern -> nahtlos nach Navigation
      sessionStorage.setItem(KEY, String(scroller.scrollLeft));

      // welche Kategorie geklickt wurde
      const termId = item.getAttribute('data-term-id');
      if (termId) sessionStorage.setItem(KEY_CLICKED, termId);
    }, { passive: true });

    // falls jemand per Keyboard navigiert: aktuelle Scrollposition merken
    scroller.addEventListener('scroll', () => {
      sessionStorage.setItem(KEY, String(scroller.scrollLeft));
    }, { passive: true });
  }

  // Wichtig: wir verhindern NICHT global scrollRestoration,
  // weil das bei dir Reload-Sprünge erzeugen kann.
  // Wir managen NUR die horizontale Kreisleiste.

  document.addEventListener('DOMContentLoaded', () => {
    bindClicks();
    restoreScroller();
  });

  // Wenn Seite aus bfcache zurückkommt (Back/Forward)
  window.addEventListener('pageshow', () => {
    restoreScroller();
  });
})();
