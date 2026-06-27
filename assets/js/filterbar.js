// LastChanged: 2026-06-24 00:00:03
(function () {
  function initFilterbar() {
  var bar = document.querySelector('.jg-filterbar[data-jg-filterbar="1"]');
  if (!bar) return;

  var buttons = Array.prototype.slice.call(
    bar.querySelectorAll('.jg-filterbtn[data-jg-panel]')
  );

  var panels = Array.prototype.slice.call(
    bar.querySelectorAll('.jg-panel')
  );

  var liveRegion = bar.querySelector('[data-jg-filter-live-region]');
  var lastOpenButton = null;

  var state = {
    jg_filter_farben: new Set(),
    jg_filter_groessen: new Set()
  };

  var pendingCommitOnClose = {
    jg_filter_marke: false,
    jg_filter_farben: false,
    jg_filter_groessen: false
  };

  panels.forEach(function (panel) {
    document.body.appendChild(panel);
  });

  function getButtonByPanelId(panelId) {
    return bar.querySelector('.jg-filterbtn[data-jg-panel="' + panelId + '"]');
  }

  function getOpenButton() {
    return buttons.find(function (b) {
      return b.getAttribute('aria-expanded') === 'true';
    }) || null;
  }

  function getOpenPanel() {
    return panels.find(function (p) {
      return p.getAttribute('aria-hidden') === 'false';
    }) || null;
  }

  function getFilterKeyByPanelId(panelId) {
    if (panelId === 'jg-panel-marke') return 'jg_filter_marke';
    if (panelId === 'jg-panel-farbe') return 'jg_filter_farben';
    if (panelId === 'jg-panel-groesse') return 'jg_filter_groessen';
    return null;
  }

  function announce(message) {
    if (!liveRegion || !message) return;
    liveRegion.textContent = '';
    window.setTimeout(function () {
      liveRegion.textContent = message;
    }, 20);
  }

  function getFocusableElements(container) {
    if (!container) return [];

    var selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.prototype.slice.call(container.querySelectorAll(selectors)).filter(function (el) {
      return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  function focusFirstInPanel(panel) {
    var focusables = getFocusableElements(panel);
    if (!focusables.length) return;
    focusables[0].focus();
  }

  function closeAll(restoreFocus) {
    panels.forEach(function (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute('aria-modal', 'false');
      panel.style.left = '';
      panel.style.top = '';
    });

    buttons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });

    if (restoreFocus && lastOpenButton) {
      lastOpenButton.focus();
    }
  }

  function positionPanel(panel, btn) {
    if (!panel || !btn) return;

    var panelInner = panel.querySelector('.jg-panel-inner');
    var spacing = 14;
    var viewportPad = 16;
    var btnRect = btn.getBoundingClientRect();
    panel.style.left = '0px';
    panel.style.top = '0px';

    if (panel.id === 'jg-panel-groesse' && panelInner) {
      var styles = window.getComputedStyle(panelInner);
      var padLeft = parseFloat(styles.paddingLeft) || 0;
      var padRight = parseFloat(styles.paddingRight) || 0;
      var maxRowWidth = 0;

      panel.querySelectorAll('.jg-size-row').forEach(function (row) {
        maxRowWidth = Math.max(maxRowWidth, row.scrollWidth);
      });

      if (maxRowWidth > 0) {
        var desiredWidth = Math.ceil(maxRowWidth + padLeft + padRight + 2);
        var maxWidth = Math.max(320, window.innerWidth - (viewportPad * 2));
        panel.style.width = Math.min(desiredWidth, maxWidth) + 'px';
      }
    }

    var panelRect = panel.getBoundingClientRect();
    var panelWidth = panelRect.width;

    var left = btnRect.left;
    var maxLeft = window.innerWidth - panelWidth - viewportPad;

    if (left > maxLeft) left = maxLeft;
    if (left < viewportPad) left = viewportPad;

    var top = btnRect.bottom + spacing;

    if (panelInner) {
      var availableHeight = window.innerHeight - top - viewportPad;
      if (availableHeight < 220) {
        availableHeight = 220;
      }
      panelInner.style.maxHeight = availableHeight + 'px';
    }

    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(top) + 'px';
  }

  function openPanel(panelId, btn) {
    var panel = document.getElementById(panelId);
    if (!panel) return;

    closeAll(false);

    panel.setAttribute('aria-hidden', 'false');
    panel.setAttribute('aria-modal', 'true');
    btn.setAttribute('aria-expanded', 'true');
    lastOpenButton = btn;

    positionPanel(panel, btn);

    if (panelId === 'jg-panel-farbe') {
      refreshColorTooltipPlacement();
    }

    focusFirstInPanel(panel);

    var label = btn.querySelector('.jg-filtertext');
    if (label) {
      announce(label.textContent.trim() + ' geöffnet');
    }
  }

  function removeLegacyWooFilterParams(url) {
    url.searchParams.delete('filter_farben');
    url.searchParams.delete('filter_colorgroup');
    url.searchParams.delete('filter_groessen');
    url.searchParams.delete('filter_marke');
    url.searchParams.delete('query_type_farben');
    url.searchParams.delete('query_type_colorgroup');
    url.searchParams.delete('query_type_groessen');
    url.searchParams.delete('query_type_marke');
  }

  function setQueryParam(url, key, value) {
    if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }

  function applyListParam(key, selectedSet) {
    var url = new URL(window.location.href);
    var out = Array.from(selectedSet);
    announce('Filter werden angewendet');
    setQueryParam(url, key, out.length ? out.join(',') : null);
    url.searchParams.delete('paged');
    removeLegacyWooFilterParams(url);
    window.location.href = url.toString();
  }

  function applyMarkeParam() {
    var markeUrl = new URL(window.location.href);
    var selected = getMarkeChecks()
      .filter(function (c) { return c.checked; })
      .map(function (c) { return c.value; });

    announce('Filter werden angewendet');
    setQueryParam(markeUrl, 'jg_filter_marke', selected.length ? selected.join(',') : null);
    markeUrl.searchParams.delete('paged');
    removeLegacyWooFilterParams(markeUrl);
    window.location.href = markeUrl.toString();
  }

  function clearPendingCommitFlagByPanelId(panelId) {
    var key = getFilterKeyByPanelId(panelId);
    if (key) pendingCommitOnClose[key] = false;
  }

  function commitPendingPanelCloseIfNeeded(panelId) {
    var key = getFilterKeyByPanelId(panelId);
    if (!key || !pendingCommitOnClose[key]) return false;

    if (key === 'jg_filter_farben' || key === 'jg_filter_groessen') {
      applyListParam(key, state[key]);
      return true;
    }

    if (key === 'jg_filter_marke') {
      applyMarkeParam();
      return true;
    }

    return false;
  }

  function initStateFromDOM() {
    ['jg_filter_farben', 'jg_filter_groessen'].forEach(function (key) {
      state[key] = new Set();

      document.querySelectorAll('[data-jg-toggle="' + key + '"][data-jg-value]').forEach(function (el) {
        if (el.classList.contains('is-active')) {
          state[key].add(el.getAttribute('data-jg-value'));
        }
      });
    });
  }

  function syncUI(key) {
    document.querySelectorAll('[data-jg-toggle="' + key + '"][data-jg-value]').forEach(function (el) {
      var val = el.getAttribute('data-jg-value');
      var active = state[key].has(val);

      el.classList.toggle('is-active', active);
      el.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function getMarkeChecks() {
    return Array.prototype.slice.call(
      document.querySelectorAll('.jg-check[data-jg-filter="jg_filter_marke"]')
    );
  }

  function getMarkeCountFromCheckboxes() {
    return getMarkeChecks().filter(function (c) { return c.checked; }).length;
  }

  function setBtnCount(panelId, count) {
    var btn = getButtonByPanelId(panelId);
    if (!btn) return;

    var countEl = btn.querySelector('.jg-count');
    if (!countEl) return;

    countEl.textContent = count > 0 ? ' (' + count + ')' : '';

    var labelEl = btn.querySelector('.jg-filtertext');
    var name = labelEl ? labelEl.textContent.trim() : 'Filter';
    var suffix = count > 0 ? ', ' + count + ' ausgewählt' : ', keine Auswahl';
    btn.setAttribute('aria-label', name + suffix);
  }

  function updateBrandRowHighlights() {
    document.querySelectorAll('.jg-checkrow').forEach(function (row) {
      var inp = row.querySelector('.jg-check[data-jg-filter="jg_filter_marke"]');
      if (!inp) return;
      row.classList.toggle('is-active', inp.checked);
    });
  }

  function updateAllCounts() {
    setBtnCount('jg-panel-farbe', state.jg_filter_farben.size);
    setBtnCount('jg-panel-groesse', state.jg_filter_groessen.size);
    setBtnCount('jg-panel-marke', getMarkeCountFromCheckboxes());
  }

  function refreshColorTooltipPlacement() {
    var colorPanel = document.getElementById('jg-panel-farbe');
    if (!colorPanel) return;

    var swatches = Array.prototype.slice.call(
      colorPanel.querySelectorAll('.jg-color-item')
    );

    if (!swatches.length) return;

    var firstRowTop = Math.min.apply(null, swatches.map(function (item) {
      return item.offsetTop;
    }));

    swatches.forEach(function (item) {
      var isFirstRow = Math.abs(item.offsetTop - firstRowTop) <= 2;
      item.classList.toggle('jg-tooltip-below', isFirstRow);
    });
  }

  initStateFromDOM();
  syncUI('jg_filter_farben');
  syncUI('jg_filter_groessen');
  refreshColorTooltipPlacement();
  updateBrandRowHighlights();
  updateAllCounts();

  closeAll(false);

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!(t instanceof HTMLInputElement)) return;

    if (t.matches('.jg-check[data-jg-filter="jg_filter_marke"]')) {
      updateBrandRowHighlights();
      updateAllCounts();
      return;
    }

    if (t.matches('[data-jg-toggle-query]')) {
      var key = t.getAttribute('data-jg-toggle-query');
      var url = new URL(window.location.href);

      if (t.checked && key === 'jg_sale') {
        setQueryParam(url, 'jg_new', null);
      }

      if (t.checked && key === 'jg_new') {
        setQueryParam(url, 'jg_sale', null);
      }

      setQueryParam(url, key, t.checked ? '1' : null);
      url.searchParams.delete('paged');
      removeLegacyWooFilterParams(url);
      window.location.href = url.toString();
    }
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.jg-filterbtn[data-jg-panel]');
    if (btn && bar.contains(btn)) {
      e.preventDefault();
      e.stopPropagation();

      var panelId = btn.getAttribute('data-jg-panel');
      var expanded = btn.getAttribute('aria-expanded') === 'true';

      if (expanded) return;

      openPanel(panelId, btn);
      return;
    }

    var closeBtn = e.target.closest('[data-jg-close]');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();

      var panel = closeBtn.closest('.jg-panel');
      if (!panel) return;

      var panelId = panel.id;

      if (commitPendingPanelCloseIfNeeded(panelId)) return;

      clearPendingCommitFlagByPanelId(panelId);
      closeAll(true);
      announce('Dialog geschlossen');
      return;
    }

    var sortOption = e.target.closest('.jg-sort-option[data-jg-orderby]');
    if (sortOption) {
      e.preventDefault();
      e.stopPropagation();

      var orderValue = sortOption.getAttribute('data-jg-orderby');
      var sortUrl = new URL(window.location.href);

      setQueryParam(sortUrl, 'orderby', orderValue || null);
      sortUrl.searchParams.delete('paged');
      removeLegacyWooFilterParams(sortUrl);
      announce('Sortierung wird angewendet');
      window.location.href = sortUrl.toString();
      return;
    }

    var applyKeyBtn = e.target.closest('[data-jg-apply-key]');
    if (applyKeyBtn) {
      e.preventDefault();
      e.stopPropagation();

      var applyKey = applyKeyBtn.getAttribute('data-jg-apply-key');
      if (applyKey === 'jg_filter_farben' || applyKey === 'jg_filter_groessen') {
        pendingCommitOnClose[applyKey] = false;
        applyListParam(applyKey, state[applyKey]);
      }
      return;
    }

    var applyMarke = e.target.closest('[data-jg-apply-marke]');
    if (applyMarke) {
      e.preventDefault();
      e.stopPropagation();

      pendingCommitOnClose.jg_filter_marke = false;
      applyMarkeParam();
      return;
    }

    var reset = e.target.closest('[data-jg-reset]');
    if (reset) {
      e.preventDefault();
      e.stopPropagation();

      var resetKey = reset.getAttribute('data-jg-reset');

      if (resetKey === 'jg_filter_farben' || resetKey === 'jg_filter_groessen') {
        state[resetKey] = new Set();
        pendingCommitOnClose[resetKey] = true;
        syncUI(resetKey);
        updateAllCounts();
        return;
      }

      if (resetKey === 'jg_filter_marke') {
        getMarkeChecks().forEach(function (c) {
          c.checked = false;
        });
        pendingCommitOnClose.jg_filter_marke = true;
        updateBrandRowHighlights();
        updateAllCounts();
        return;
      }

      if (resetKey === 'orderby') {
        var resetUrl = new URL(window.location.href);
        setQueryParam(resetUrl, 'orderby', null);
        resetUrl.searchParams.delete('paged');
        removeLegacyWooFilterParams(resetUrl);
        announce('Sortierung zurückgesetzt');
        window.location.href = resetUrl.toString();
        return;
      }

      return;
    }

    var toggleBtn = e.target.closest('[data-jg-toggle][data-jg-value]');
    if (toggleBtn) {
      e.preventDefault();
      e.stopPropagation();

      var toggleKey = toggleBtn.getAttribute('data-jg-toggle');
      var toggleVal = toggleBtn.getAttribute('data-jg-value');

      if (!(toggleKey in state)) return;

      if (state[toggleKey].has(toggleVal)) {
        state[toggleKey].delete(toggleVal);
      } else {
        state[toggleKey].add(toggleVal);
      }

      syncUI(toggleKey);
      updateAllCounts();
      return;
    }

    var openPanelEl = getOpenPanel();
    if (openPanelEl) {
      var clickedInsidePanel = openPanelEl.contains(e.target);
      var clickedInsideBar = bar.contains(e.target);

      if (!clickedInsidePanel && !clickedInsideBar) {
        var openPanelId = openPanelEl.id;

        if (commitPendingPanelCloseIfNeeded(openPanelId)) return;

        clearPendingCommitFlagByPanelId(openPanelId);
        closeAll(true);
        announce('Dialog geschlossen');
        return;
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    var openPanelEl = getOpenPanel();
    if (!openPanelEl) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      clearPendingCommitFlagByPanelId(openPanelEl.id);
      closeAll(true);
      announce('Dialog geschlossen');
      return;
    }

    if (e.key !== 'Tab') return;

    var focusables = getFocusableElements(openPanelEl);
    if (!focusables.length) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var active = document.activeElement;

    if (!openPanelEl.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  var resizeRaf = null;
  window.addEventListener('resize', function () {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = null;
      refreshColorTooltipPlacement();
      var openBtn = getOpenButton();
      var openPanelEl = getOpenPanel();
      if (!openBtn || !openPanelEl) return;
      positionPanel(openPanelEl, openBtn);
    });
  });

  var scrollRaf = null;
  window.addEventListener('scroll', function () {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = null;
      var openBtn = getOpenButton();
      var openPanelEl = getOpenPanel();
      if (!openBtn || !openPanelEl) return;
      positionPanel(openPanelEl, openBtn);
    });
  }, { passive: true });
  }

  function runWhenIdle() {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(initFilterbar, { timeout: 1200 });
      return;
    }

    setTimeout(initFilterbar, 120);
  }

  function boot() {
    if (document.readyState === 'complete') {
      runWhenIdle();
      return;
    }

    window.addEventListener('load', runWhenIdle, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();