// LastChanged: 2026-06-27 00:00:00
(function () {
	function initMobileFilterbar() {
		var bars = Array.prototype.slice.call(
			document.querySelectorAll('.jgm-filterbar[data-jgm-filterbar="1"]')
		);
		if (!bars.length) return;

		bars.forEach(function (bar) {
			initSingleMobileFilterbar(bar);
		});
	}

	function initSingleMobileFilterbar(bar) {
		if (!bar || bar.dataset.jgmBound === '1') return;
		bar.dataset.jgmBound = '1';

		var panelButtons = Array.prototype.slice.call(
			bar.querySelectorAll('.jgm-btn[data-jgm-panel]')
		);
		var panels = Array.prototype.slice.call(bar.querySelectorAll('.jgm-panel'));
		var liveRegion = bar.querySelector('[data-jgm-live-region]');
		var backdrop = document.querySelector('.jgm-backdrop');
		if (!backdrop) {
			backdrop = document.createElement('div');
			backdrop.className = 'jgm-backdrop';
			document.body.appendChild(backdrop);
		}

	var state = {
		jg_filter_farben: new Set(),
		jg_filter_groessen: new Set(),
		jg_sale: false,
		jg_new: false
};
		function announce(message) {
			if (!liveRegion || !message) return;
			liveRegion.textContent = '';
			window.setTimeout(function () {
				liveRegion.textContent = message;
			}, 20);
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

		function closeAll(restoreFocus) {
			panels.forEach(function (panel) {
				panel.setAttribute('aria-hidden', 'true');
				panel.setAttribute('aria-modal', 'false');
			});

			panelButtons.forEach(function (btn) {
				btn.setAttribute('aria-expanded', 'false');
			});

			if (restoreFocus && document.activeElement && document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}

			backdrop.classList.remove('is-visible');
			document.documentElement.classList.remove('jgm-lock-scroll');
			document.body.classList.remove('jgm-lock-scroll');
		}

		function getPanelById(panelId) {
			return panels.find(function (panel) {
				return panel.id === panelId;
			}) || null;
		}

		function openPanel(panelId, btn) {
			var panel = getPanelById(panelId);
			if (!panel) return;

			closeAll(false);
			panel.setAttribute('aria-hidden', 'false');
			panel.setAttribute('aria-modal', 'true');
			btn.setAttribute('aria-expanded', 'true');

		var barRect = bar.getBoundingClientRect();
		var top = Math.round(barRect.bottom + 8);

		panel.style.top = top + 'px';
		panel.style.left = '12px';
		panel.style.right = '12px';
		panel.style.bottom = '12px';

			backdrop.classList.add('is-visible');
		document.documentElement.classList.add('jgm-lock-scroll');
		document.body.classList.add('jgm-lock-scroll');
			var firstFocusable = panel.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
			if (firstFocusable && firstFocusable instanceof HTMLElement) {
				firstFocusable.focus();
			}
		}

		function getMarkeChecks() {
			return Array.prototype.slice.call(
				bar.querySelectorAll('.jgm-check[data-jgm-filter="jg_filter_marke"]')
			);
		}

		function syncToggleUI(key) {
			bar.querySelectorAll('[data-jgm-toggle="' + key + '"][data-jgm-value]').forEach(function (el) {
				var value = el.getAttribute('data-jgm-value');
				var active = state[key].has(value);
				el.classList.toggle('is-active', active);
				el.setAttribute('aria-pressed', active ? 'true' : 'false');
			});
		}

		function syncBrandRows() {
			bar.querySelectorAll('.jgm-checkrow').forEach(function (row) {
				var input = row.querySelector('.jgm-check[data-jgm-filter="jg_filter_marke"]');
				if (!input) return;
				row.classList.toggle('is-active', !!input.checked);
			});
		}
		function updateFilterCount() {
			var countEl = bar.querySelector('[data-jgm-filter-count]');
			if (!countEl) return;

			var count = 0;

			count += getMarkeChecks().filter(function (input) {
				return input.checked;
			}).length;

			count += state.jg_filter_farben ? state.jg_filter_farben.size : 0;
			count += state.jg_filter_groessen ? state.jg_filter_groessen.size : 0;

			if (state.jg_new) count++;
			if (state.jg_sale) count++;

			countEl.textContent = count > 0 ? '(' + count + ')' : '';
		}

		function expandSectionsWithActiveFilters() {
	bar.querySelectorAll('.jgm-mobile-section').forEach(function (section) {
		var hasActiveFilter = section.querySelector(
			'.jgm-type-link.is-active, .jgm-check:checked, [data-jgm-toggle].is-active'
		);

		if (!hasActiveFilter) return;

		var sectionToggle = section.querySelector('[data-jgm-section-toggle]');
		if (!sectionToggle) return;

		var contentId = sectionToggle.getAttribute('aria-controls');
		if (!contentId) return;

		var contentEl = bar.querySelector('#' + contentId);
		if (!contentEl) return;

		sectionToggle.setAttribute('aria-expanded', 'true');
		contentEl.hidden = false;

		var indicator = sectionToggle.querySelector('span[aria-hidden="true"]');
		if (indicator) {
			indicator.textContent = '−';
		}
	});
}

		function initStateFromDom() {
			['jg_filter_farben', 'jg_filter_groessen'].forEach(function (key) {
				state[key] = new Set();
				bar.querySelectorAll('[data-jgm-toggle="' + key + '"][data-jgm-value]').forEach(function (el) {
					if (el.classList.contains('is-active')) {
						state[key].add(el.getAttribute('data-jgm-value'));
					}
				});
			});
			['jg_sale', 'jg_new'].forEach(function (key) {
				var el = bar.querySelector('[data-jgm-toggle-query="' + key + '"]');
				state[key] = !!(el && el.classList.contains('is-active'));
			});
		}

		function applyFilter() {
			var url = new URL(window.location.href);
			var markeValues = getMarkeChecks()
				.filter(function (input) { return input.checked; })
				.map(function (input) { return input.value; });

			setQueryParam(url, 'jg_filter_marke', markeValues.length ? markeValues.join(',') : null);
			setQueryParam(url, 'jg_filter_farben', state.jg_filter_farben.size ? Array.from(state.jg_filter_farben).join(',') : null);
			setQueryParam(url, 'jg_filter_groessen', state.jg_filter_groessen.size ? Array.from(state.jg_filter_groessen).join(',') : null);
			setQueryParam(url, 'jg_sale', state.jg_sale ? '1' : null);
			setQueryParam(url, 'jg_new', state.jg_new ? '1' : null);
			url.searchParams.delete('paged');
			removeLegacyWooFilterParams(url);
			announce('Filter werden angewendet');
			window.location.href = url.toString();
		}

		function resetFilterUi() {
			getMarkeChecks().forEach(function (input) {
				input.checked = false;
			});
			state.jg_filter_farben = new Set();
			state.jg_filter_groessen = new Set();
			syncBrandRows();
			syncToggleUI('jg_filter_farben');
			syncToggleUI('jg_filter_groessen');
			updateFilterCount();
			announce('Filter zurückgesetzt');
		}

		initStateFromDom();
		syncToggleUI('jg_filter_farben');
		syncToggleUI('jg_filter_groessen');
			syncBrandRows();
		expandSectionsWithActiveFilters();
		updateFilterCount();
		closeAll(false);

		panelButtons.forEach(function (button) {
			button.addEventListener('click', function (event) {
				event.preventDefault();
				event.stopPropagation();

				var panelId = button.getAttribute('data-jgm-panel');
				if (!panelId) return;

				var expanded = button.getAttribute('aria-expanded') === 'true';
				if (expanded) {
					closeAll(true);
					return;
				}

				openPanel(panelId, button);
			});
		});

		backdrop.addEventListener('click', function () {
			var hasOpenPanel = panels.some(function (panel) {
				return panel.getAttribute('aria-hidden') === 'false';
			});
			if (!hasOpenPanel) return;

			closeAll(false);
			announce('Dialog geschlossen');
		});

			bar.addEventListener('change', function (event) {
			var target = event.target;
			if (!(target instanceof HTMLInputElement)) return;

			if (target.matches('.jgm-check[data-jgm-filter="jg_filter_marke"]')) {
				syncBrandRows();
				updateFilterCount();
			}
		});

			bar.addEventListener('click', function (event) {
			var button = event.target.closest('.jgm-btn[data-jgm-panel]');
			if (button && bar.contains(button)) {
				event.preventDefault();
				event.stopPropagation();

				var panelId = button.getAttribute('data-jgm-panel');
				var expanded = button.getAttribute('aria-expanded') === 'true';
				if (!expanded && panelId) {
					openPanel(panelId, button);
				} else {
					closeAll(true);
				}
				return;
			}

				var closeBtn = event.target.closest('[data-jgm-close]');
			if (closeBtn) {
				event.preventDefault();
				closeAll(true);
				announce('Dialog geschlossen');
				return;
			}

				var sectionToggle = event.target.closest('[data-jgm-section-toggle]');
			if (sectionToggle) {
				event.preventDefault();

				var contentId = sectionToggle.getAttribute('aria-controls');
				if (!contentId) return;

					var contentEl = bar.querySelector('#' + contentId);
				if (!contentEl) return;

				var expanded = sectionToggle.getAttribute('aria-expanded') === 'true';
				sectionToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
				contentEl.hidden = expanded;

				var indicator = sectionToggle.querySelector('span[aria-hidden="true"]');
				if (indicator) {
					indicator.textContent = expanded ? '+' : '−';
				}

				return;
			}
				var queryToggle = event.target.closest('[data-jgm-toggle-query]');
				if (queryToggle && bar.contains(queryToggle)) {
					event.preventDefault();

					var queryKey = queryToggle.getAttribute('data-jgm-toggle-query');
					if (!queryKey || !(queryKey in state)) return;

					state[queryKey] = !state[queryKey];

					queryToggle.classList.toggle('is-active', state[queryKey]);
					queryToggle.setAttribute('aria-pressed', state[queryKey] ? 'true' : 'false');
					updateFilterCount();

					return;
				}
			var toggle = event.target.closest('[data-jgm-toggle][data-jgm-value]');
			if (toggle && bar.contains(toggle)) {
				event.preventDefault();

				var toggleKey = toggle.getAttribute('data-jgm-toggle');
				var toggleValue = toggle.getAttribute('data-jgm-value');
				if (!toggleKey || !(toggleKey in state)) return;

				if (state[toggleKey].has(toggleValue)) {
					state[toggleKey].delete(toggleValue);
				} else {
					state[toggleKey].add(toggleValue);
				}

				syncToggleUI(toggleKey);
				updateFilterCount();
				return;
			}

			var applyFilterBtn = event.target.closest('[data-jgm-apply-filter]');
			if (applyFilterBtn) {
				event.preventDefault();
				applyFilter();
				return;
			}

			var resetFilterBtn = event.target.closest('[data-jgm-reset-filter]');
			if (resetFilterBtn) {
				event.preventDefault();
				resetFilterUi();
				return;
			}

			var sortOption = event.target.closest('.jgm-sort-option[data-jgm-orderby]');
			if (sortOption) {
				event.preventDefault();
				var orderValue = sortOption.getAttribute('data-jgm-orderby');
				var sortUrl = new URL(window.location.href);
				setQueryParam(sortUrl, 'orderby', orderValue || null);
				sortUrl.searchParams.delete('paged');
				removeLegacyWooFilterParams(sortUrl);
				announce('Sortierung wird angewendet');
				window.location.href = sortUrl.toString();
				return;
			}

			var resetOrderBtn = event.target.closest('[data-jgm-reset-orderby]');
			if (resetOrderBtn) {
				event.preventDefault();
				var resetUrl = new URL(window.location.href);
				setQueryParam(resetUrl, 'orderby', null);
				resetUrl.searchParams.delete('paged');
				removeLegacyWooFilterParams(resetUrl);
				announce('Sortierung zurückgesetzt');
				window.location.href = resetUrl.toString();
				return;
			}

			var openPanel = panels.find(function (panel) {
				return panel.getAttribute('aria-hidden') === 'false';
			});

			if (!openPanel) return;

			var clickInsidePanel = openPanel.contains(event.target);
			var clickInsideBar = bar.contains(event.target);
			if (!clickInsidePanel && !clickInsideBar) {
				closeAll(true);
				announce('Dialog geschlossen');
			}
		});

			document.addEventListener('keydown', function (event) {
			if (event.key !== 'Escape') return;

			var hasOpenPanel = panels.some(function (panel) {
				return panel.getAttribute('aria-hidden') === 'false';
			});

			if (!hasOpenPanel) return;

			event.preventDefault();
			closeAll(true);
			announce('Dialog geschlossen');
		});

			document.addEventListener('click', function (event) {
				var hasOpenPanel = panels.some(function (panel) {
					return panel.getAttribute('aria-hidden') === 'false';
				});
				if (!hasOpenPanel) return;

				if (bar.contains(event.target)) return;

				closeAll(false);
				announce('Dialog geschlossen');
			});
	}

	function boot() {
		if (document.readyState === 'complete') {
			initMobileFilterbar();
			return;
		}

		window.addEventListener('load', initMobileFilterbar, { once: true });
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot, { once: true });
	} else {
		boot();
	}

	if (window.MutationObserver) {
		var observer = new MutationObserver(function () {
			initMobileFilterbar();
		});

		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}

	function initWoodmartMenuWatcher() {
	function updateMenuState() {
		var isOpen = !!document.querySelector(
			'.mobile-nav.wd-opened, ' +
			'.mobile-nav.act-mobile-menu, ' +
			'.wd-side-hidden.wd-opened, ' +
			'.wd-side-hidden.wd-opened-mobile, ' +
			'.wd-close-side-opened, ' +
			'.wd-side-hidden-overlay.wd-fill'
		);

		document.body.classList.toggle('jgm-woodmart-menu-open', isOpen);
	}

	updateMenuState();

	if (window.MutationObserver) {
		var observer = new MutationObserver(updateMenuState);
		observer.observe(document.body, {
			attributes: true,
			childList: true,
			subtree: true,
			attributeFilter: ['class', 'style']
		});
	}

	document.addEventListener('click', function () {
		window.setTimeout(updateMenuState, 50);
	}, true);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initWoodmartMenuWatcher, { once: true });
} else {
	initWoodmartMenuWatcher();
}
})();
