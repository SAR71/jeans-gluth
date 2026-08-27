// LastChanged: 2026-08-27 00:00:00
/* ******************** Sub-Kategorien als Kreise ***********************/

(() => {
const KEY = 'jgSubcatScrollLeft_v2';
const KEY_CLICKED = 'jgSubcatClickedTerm_v2';

  function getScroller() {
    return document.querySelector('.jg-subcat-circles');
  }

  function getCarousel() {
    const scroller = getScroller();
    return scroller ? scroller.closest('.jg-subcat-carousel') : null;
  }

  function getNavButtons() {
    const carousel = getCarousel();
    if (!carousel) return { prev: null, next: null };

    return {
      prev: carousel.querySelector('.jg-subcat-nav.jg-prev'),
      next: carousel.querySelector('.jg-subcat-nav.jg-next')
    };
  }

  function syncOverflowAlignment() {
    const scroller = getScroller();
    if (!scroller) return;

    const carousel = getCarousel();
    const nav = getNavButtons();

    const hasOverflow = scroller.scrollWidth > (scroller.clientWidth + 1);
    scroller.classList.toggle('jg-subcat-circles--overflow', hasOverflow);

    if (carousel) {
      carousel.classList.toggle('jg-subcat-carousel--overflow', hasOverflow);
    }

    if (!nav.prev || !nav.next) return;

    if (!hasOverflow) {
      nav.prev.hidden = true;
      nav.next.hidden = true;
      return;
    }

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const atStart = scroller.scrollLeft <= 2;
    const atEnd = scroller.scrollLeft >= (maxScrollLeft - 2);

    nav.prev.hidden = atStart;
    nav.next.hidden = atEnd;
  }

  function clearClicked() {
    document.querySelectorAll('.jg-subcat-item.is-clicked')
      .forEach(el => el.classList.remove('is-clicked'));
  }

  function waitForCircleImages() {
    const scroller = getScroller();
    if (!scroller) return Promise.resolve();

    const images = Array.from(scroller.querySelectorAll('img'));

    return Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  function scrollToInitialPosition(scroller, scrollLeft) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scroller.scrollLeft = scrollLeft;
      return;
    }

    const startScrollLeft = scroller.scrollLeft;
    const distance = scrollLeft - startScrollLeft;
    const duration = 720;
    const startTime = performance.now();

    function animate(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 0.5 - (Math.cos(Math.PI * progress) / 2);

      scroller.scrollLeft = startScrollLeft + (distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  function restoreScroller(animate = false) {
    const scroller = getScroller();
    if (!scroller) return;

    const activeItem = scroller.querySelector('.jg-subcat-item.is-active');
    if (activeItem) {
      const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const activeItemCenter = activeItem.offsetLeft + (activeItem.offsetWidth / 2);
      const scrollLeft = Math.min(
        Math.max(0, activeItemCenter - (scroller.clientWidth / 2)),
        maxScrollLeft
      );
      if (animate) {
        scrollToInitialPosition(scroller, scrollLeft);
      } else {
        scroller.scrollLeft = scrollLeft;
      }
      return;
    }

    const savedScrollLeft = Number.parseInt(sessionStorage.getItem(KEY) || '', 10);
    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);

    scroller.scrollLeft = Number.isFinite(savedScrollLeft)
      ? Math.min(Math.max(0, savedScrollLeft), maxScrollLeft)
      : 0;
  }

  function bindClicks() {
    const scroller = getScroller();
    if (!scroller) return;

    const nav = getNavButtons();

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
        syncOverflowAlignment();
      });
    }, { passive: true });

    function scrollToUnseenGroup(direction) {
      const items = Array.from(scroller.querySelectorAll('.jg-subcat-item'));
      if (!items.length) return;

      const start = scroller.scrollLeft;
      const end = start + scroller.clientWidth;

      if (direction > 0) {
        const nextItem = items.find((item) => item.offsetLeft >= (end - 1));

        if (!nextItem) {
          scroller.scrollTo({ left: scroller.scrollWidth, behavior: 'smooth' });
          return;
        }

        scroller.scrollTo({ left: nextItem.offsetLeft, behavior: 'smooth' });
        return;
      }

      let prevItem = null;
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i];
        if ((item.offsetLeft + item.offsetWidth) <= (start + 1)) {
          prevItem = item;
          break;
        }
      }

      if (!prevItem) {
        scroller.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }

      scroller.scrollTo({ left: prevItem.offsetLeft, behavior: 'smooth' });
    }

    if (nav.prev) {
      nav.prev.addEventListener('click', () => {
        scrollToUnseenGroup(-1);
      });
    }

    if (nav.next) {
      nav.next.addEventListener('click', () => {
        scrollToUnseenGroup(1);
      });
    }
  }

  // Wichtig: wir verhindern NICHT global scrollRestoration,
  // weil das bei dir Reload-Sprünge erzeugen kann.
  // Wir managen NUR die horizontale Kreisleiste.

  document.addEventListener('DOMContentLoaded', () => {
    bindClicks();
    waitForCircleImages().then(() => {
      requestAnimationFrame(() => {
        const scroller = getScroller();
        if (scroller?.querySelector('.jg-subcat-item.is-active')) {
          scroller.scrollLeft = 0;
        }

        restoreScroller(true);
        syncOverflowAlignment();
      });
    });

    window.addEventListener('resize', () => {
      syncOverflowAlignment();
    }, { passive: true });
  });

  // Wenn Seite aus bfcache zurückkommt (Back/Forward)
  window.addEventListener('pageshow', () => {
    restoreScroller();
    syncOverflowAlignment();
  });
})();

