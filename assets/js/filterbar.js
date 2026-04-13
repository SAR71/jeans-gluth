document.addEventListener('DOMContentLoaded', function () {
  var bar = document.querySelector('.jg-filterbar[data-jg-filterbar="1"]');
  if (!bar) return;

  var buttons = Array.prototype.slice.call(
    bar.querySelectorAll('.jg-filterbtn[data-jg-panel]')
  );

  var panels = Array.prototype.slice.call(
    bar.querySelectorAll('.jg-panel')
  );

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

  function closeAll() {
    panels.forEach(function (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.style.left = '';
      panel.style.top = '';
    });

    buttons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function positionPanel(panel, btn) {
    if (!panel || !btn) return;

    var panelInner = panel.querySelector('.jg-panel-inner');
    var spacing = 14;
    var viewportPad = 16;

    panel.style.left = '0px';
    panel.style.top = '0px';

    var btnRect = btn.getBoundingClientRect();
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

    closeAll();

    panel.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');

    positionPanel(panel, btn);
  }

  function removeLegacyWooFilterParams(url) {
    url.searchParams.delete('filter_farben');
    url.searchParams.delete('filter_groessen');
    url.searchParams.delete('filter_marke');
    url.searchParams.delete('query_type_farben');
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
    setQueryParam(url, key, out.length ? out.join(',') : null);
    url.searchParams.delete('paged');
    removeLegacyWooFilterParams(url);
    window.location.href = url.toString();
  }

  function applyMarkeParam() {
    var markeUrl = new URL(window.location.href);
    var checks = Array.prototype.slice.call(
      document.querySelectorAll('.jg-check[data-jg-filter="jg_filter_marke"]')
    );
    var selected = checks
      .filter(function (c) { return c.checked; })
      .map(function (c) { return c.value; });

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

  function getMarkeCountFromCheckboxes() {
    var checks = Array.prototype.slice.call(
      document.querySelectorAll('.jg-check[data-jg-filter="jg_filter_marke"]')
    );
    return checks.filter(function (c) { return c.checked; }).length;
  }

  function setBtnCount(panelId, count) {
    var btn = getButtonByPanelId(panelId);
    if (!btn) return;

    var countEl = btn.querySelector('.jg-count');
    if (!countEl) return;

    countEl.textContent = count > 0 ? ' (' + count + ')' : '';
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

  initStateFromDOM();
  syncUI('jg_filter_farben');
  syncUI('jg_filter_groessen');
  updateBrandRowHighlights();
  updateAllCounts();
  closeAll();

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
      closeAll();
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
        document.querySelectorAll('.jg-check[data-jg-filter="jg_filter_marke"]').forEach(function (c) {
          c.checked = false;
        });
        pendingCommitOnClose.jg_filter_marke = true;
        updateBrandRowHighlights();
        updateAllCounts();
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
        closeAll();
        return;
      }
    }
  });

  window.addEventListener('resize', function () {
    var openBtn = getOpenButton();
    var openPanelEl = getOpenPanel();
    if (!openBtn || !openPanelEl) return;
    positionPanel(openPanelEl, openBtn);
  });

  window.addEventListener('scroll', function () {
    var openBtn = getOpenButton();
    var openPanelEl = getOpenPanel();
    if (!openBtn || !openPanelEl) return;
    positionPanel(openPanelEl, openBtn);
  }, { passive: true });

});