// LastChanged: 2026-07-07 00:00:00
(function () {
	'use strict';

	function initMobileFilterbar() {
		document
			.querySelectorAll('.jgm-filterbar[data-jgm-filterbar="1"]')
			.forEach(initSingleMobileFilterbar);
	}

	function initSingleMobileFilterbar(bar) {
		if (!bar || bar.dataset.jgmBound === '1') return;
		bar.dataset.jgmBound = '1';

		var panels = Array.from(bar.querySelectorAll('.jgm-panel'));
		var panelButtons = Array.from(bar.querySelectorAll('.jgm-btn[data-jgm-panel]'));
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
			jg_new: false,
			jg_sale: false
		};

		function announce(message) {
			if (!liveRegion || !message) return;

			liveRegion.textContent = '';
			window.setTimeout(function () {
				liveRegion.textContent = message;
			}, 20);
		}

		function setQueryParam(url, key, value) {
			if (!value || (Array.isArray(value) && value.length === 0)) {
				url.searchParams.delete(key);
				return;
			}

			url.searchParams.set(key, value);
		}

		function removeLegacyWooFilterParams(url) {
			[
				'filter_farben',
				'filter_colorgroup',
				'filter_groessen',
				'filter_marke',
				'query_type_farben',
				'query_type_colorgroup',
				'query_type_groessen',
				'query_type_marke'
			].forEach(function (key) {
				url.searchParams.delete(key);
			});
		}

		function getPanelById(id) {
			return panels.find(function (panel) {
				return panel.id === id;
			}) || null;
		}

		function getOpenPanel() {
			return panels.find(function (panel) {
				return panel.getAttribute('aria-hidden') === 'false';
			}) || null;
		}

		function closeAll(restoreFocus) {
			panels.forEach(function (panel) {
				panel.setAttribute('aria-hidden', 'true');
				panel.setAttribute('aria-modal', 'false');
			});

			panelButtons.forEach(function (button) {
				button.setAttribute('aria-expanded', 'false');
			});

			backdrop.classList.remove('is-visible');
			document.documentElement.classList.remove('jgm-lock-scroll');
			document.body.classList.remove('jgm-lock-scroll');

			if (restoreFocus && document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
		}

		function openPanel(panelId, button) {
			var panel = getPanelById(panelId);
			if (!panel) return;

			closeAll(false);

			panel.setAttribute('aria-hidden', 'false');
			panel.setAttribute('aria-modal', 'true');
			button.setAttribute('aria-expanded', 'true');

			var barRect = bar.getBoundingClientRect();
			var top = Math.round(barRect.bottom + 8);

			panel.style.top = top + 'px';
			panel.style.left = '12px';
			panel.style.right = '12px';
			panel.style.bottom = '12px';

			backdrop.classList.add('is-visible');
			document.documentElement.classList.add('jgm-lock-scroll');
			document.body.classList.add('jgm-lock-scroll');

			var focusTarget = panel.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
			if (focusTarget instanceof HTMLElement) {
				focusTarget.focus();
			}
		}
				function getChecks(filterKey) {
			return Array.from(
				bar.querySelectorAll('.jgm-check[data-jgm-filter="' + filterKey + '"]')
			);
		}

		function getCheckedValues(filterKey) {
			return getChecks(filterKey)
				.filter(function (input) {
					return input.checked;
				})
				.map(function (input) {
					return input.value;
				});
		}

		function syncCheckRows() {
			bar.querySelectorAll('.jgm-checkrow').forEach(function (row) {
				var input = row.querySelector('.jgm-check');
				if (!input) return;

				row.classList.toggle('is-active', !!input.checked);
			});
		}

		function syncToggleUI(key) {
			bar.querySelectorAll('[data-jgm-toggle="' + key + '"][data-jgm-value]').forEach(function (el) {
				var value = el.getAttribute('data-jgm-value');
				var active = state[key] && state[key].has(value);

				el.classList.toggle('is-active', !!active);
				el.setAttribute('aria-pressed', active ? 'true' : 'false');
			});
		}

		function syncSpecialToggles() {
			bar.querySelectorAll('[data-jgm-toggle-query="jg_new"]').forEach(function (el) {
				el.classList.toggle('is-active', state.jg_new);
				el.setAttribute('aria-pressed', state.jg_new ? 'true' : 'false');
			});

			bar.querySelectorAll('[data-jgm-toggle-query="jg_sale"]').forEach(function (el) {
				el.classList.toggle('is-active', state.jg_sale);
				el.setAttribute('aria-pressed', state.jg_sale ? 'true' : 'false');
			});
		}

		function updateFilterCount() {
			var countEl = bar.querySelector('[data-jgm-filter-count]');
			if (!countEl) return;

			var count = 0;

			count += getCheckedValues('jg_filter_marke').length;
			count += getCheckedValues('jg_filter_typ').length;

			count += state.jg_filter_farben.size;
			count += state.jg_filter_groessen.size;

			if (state.jg_new) count++;
			if (state.jg_sale) count++;

			countEl.textContent = count > 0 ? '(' + count + ')' : '';
		}

		function expandSectionsWithActiveFilters() {
			bar.querySelectorAll('.jgm-mobile-section').forEach(function (section) {
				var hasActiveFilter = section.querySelector(
					'.jgm-check:checked, [data-jgm-toggle].is-active'
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

			['jg_new', 'jg_sale'].forEach(function (key) {
				var el = bar.querySelector('[data-jgm-toggle-query="' + key + '"]');
				state[key] = !!(el && el.classList.contains('is-active'));
			});

			if (state.jg_new && state.jg_sale) {
				state.jg_sale = false;
			}
		}

		function getSelectedTypUrl() {
			var checkedTyp = getChecks('jg_filter_typ').filter(function (input) {
				return input.checked;
			});

			if (checkedTyp.length === 1) {
				return checkedTyp[0].getAttribute('data-jgm-typ-url') || '';
			}

			if (checkedTyp.length === 0) {
				return bar.getAttribute('data-jgm-type-base-url') || '';
			}

			return '';
		}

		function applyFilter() {
			var typUrl = getSelectedTypUrl();
			var url = typUrl ? new URL(typUrl, window.location.origin) : new URL(window.location.href);

			var markeValues = getCheckedValues('jg_filter_marke');

			setQueryParam(url, 'jg_filter_marke', markeValues.length ? markeValues.join(',') : null);
			setQueryParam(url, 'jg_filter_farben', state.jg_filter_farben.size ? Array.from(state.jg_filter_farben).join(',') : null);
			setQueryParam(url, 'jg_filter_groessen', state.jg_filter_groessen.size ? Array.from(state.jg_filter_groessen).join(',') : null);
			setQueryParam(url, 'jg_sale', state.jg_sale ? '1' : null);
			setQueryParam(url, 'jg_new', state.jg_new ? '1' : null);

			url.searchParams.delete('jg_filter_typ');
			url.searchParams.delete('paged');

			removeLegacyWooFilterParams(url);

			announce('Filter werden angewendet');
			window.location.href = url.toString();
		}

		function resetFilterUi() {
			getChecks('jg_filter_marke').forEach(function (input) {
				input.checked = false;
			});

			getChecks('jg_filter_typ').forEach(function (input) {
				input.checked = false;
			});

			state.jg_filter_farben = new Set();
			state.jg_filter_groessen = new Set();
			state.jg_new = false;
			state.jg_sale = false;

			syncCheckRows();
			syncToggleUI('jg_filter_farben');
			syncToggleUI('jg_filter_groessen');
			syncSpecialToggles();
			updateFilterCount();

			announce('Filter zurückgesetzt');
		}
				function handlePanelButtonClick(event) {
			var button = event.target.closest('.jgm-btn[data-jgm-panel]');
			if (!button || !bar.contains(button)) return false;

			event.preventDefault();
			event.stopPropagation();

			var panelId = button.getAttribute('data-jgm-panel');
			if (!panelId) return true;

			var expanded = button.getAttribute('aria-expanded') === 'true';

			if (expanded) {
				closeAll(true);
			} else {
				openPanel(panelId, button);
			}

			return true;
		}

		function handleSectionToggle(event) {
			var sectionToggle = event.target.closest('[data-jgm-section-toggle]');
			if (!sectionToggle || !bar.contains(sectionToggle)) return false;

			event.preventDefault();

			var contentId = sectionToggle.getAttribute('aria-controls');
			if (!contentId) return true;

			var contentEl = bar.querySelector('#' + contentId);
			if (!contentEl) return true;

			var expanded = sectionToggle.getAttribute('aria-expanded') === 'true';

			sectionToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
			contentEl.hidden = expanded;

			var indicator = sectionToggle.querySelector('span[aria-hidden="true"]');
			if (indicator) {
				indicator.textContent = expanded ? '+' : '−';
			}

			return true;
		}

		function handleSpecialToggle(event) {
			var queryToggle = event.target.closest('[data-jgm-toggle-query]');
			if (!queryToggle || !bar.contains(queryToggle)) return false;

			event.preventDefault();

			var queryKey = queryToggle.getAttribute('data-jgm-toggle-query');

			if (queryKey === 'jg_new') {
				state.jg_new = !state.jg_new;

				if (state.jg_new) {
					state.jg_sale = false;
				}
			}

			if (queryKey === 'jg_sale') {
				state.jg_sale = !state.jg_sale;

				if (state.jg_sale) {
					state.jg_new = false;
				}
			}

			syncSpecialToggles();
			updateFilterCount();

			return true;
		}

		function handleAttributeToggle(event) {
			var toggle = event.target.closest('[data-jgm-toggle][data-jgm-value]');
			if (!toggle || !bar.contains(toggle)) return false;

			event.preventDefault();

			var key = toggle.getAttribute('data-jgm-toggle');
			var value = toggle.getAttribute('data-jgm-value');

			if (!key || !state[key]) return true;

			if (state[key].has(value)) {
				state[key].delete(value);
			} else {
				state[key].add(value);
			}

			syncToggleUI(key);
			updateFilterCount();

			return true;
		}

		function handleFilterApply(event) {
			var applyBtn = event.target.closest('[data-jgm-apply-filter]');
			if (!applyBtn || !bar.contains(applyBtn)) return false;

			event.preventDefault();
			applyFilter();

			return true;
		}

		function handleFilterReset(event) {
			var resetBtn = event.target.closest('[data-jgm-reset-filter]');
			if (!resetBtn || !bar.contains(resetBtn)) return false;

			event.preventDefault();
			resetFilterUi();

			return true;
		}

		function handleSortOption(event) {
			var sortOption = event.target.closest('.jgm-sort-option[data-jgm-orderby]');
			if (!sortOption || !bar.contains(sortOption)) return false;

			event.preventDefault();

			var orderValue = sortOption.getAttribute('data-jgm-orderby');
			var url = new URL(window.location.href);

			setQueryParam(url, 'orderby', orderValue || null);
			url.searchParams.delete('paged');
			removeLegacyWooFilterParams(url);

			announce('Sortierung wird angewendet');
			window.location.href = url.toString();

			return true;
		}

		function handleSortReset(event) {
			var resetBtn = event.target.closest('[data-jgm-reset-orderby]');
			if (!resetBtn || !bar.contains(resetBtn)) return false;

			event.preventDefault();

			var url = new URL(window.location.href);

			setQueryParam(url, 'orderby', null);
			url.searchParams.delete('paged');
			removeLegacyWooFilterParams(url);

			announce('Sortierung zurückgesetzt');
			window.location.href = url.toString();

			return true;
		}

		function handleCloseButton(event) {
			var closeBtn = event.target.closest('[data-jgm-close]');
			if (!closeBtn || !bar.contains(closeBtn)) return false;

			event.preventDefault();
			closeAll(true);
			announce('Dialog geschlossen');

			return true;
		}

		panelButtons.forEach(function (button) {
			button.addEventListener('click', function (event) {
				handlePanelButtonClick(event);
			});
		});

		backdrop.addEventListener('click', function () {
			if (!getOpenPanel()) return;

			closeAll(false);
			announce('Dialog geschlossen');
		});

		bar.addEventListener('change', function (event) {
			var target = event.target;

			if (!(target instanceof HTMLInputElement)) return;

			if (
				target.matches('.jgm-check[data-jgm-filter="jg_filter_marke"]') ||
				target.matches('.jgm-check[data-jgm-filter="jg_filter_typ"]')
			) {
				syncCheckRows();
				updateFilterCount();
			}
		});

		bar.addEventListener('click', function (event) {
			if (handlePanelButtonClick(event)) return;
			if (handleCloseButton(event)) return;
			if (handleSectionToggle(event)) return;
			if (handleSpecialToggle(event)) return;
			if (handleAttributeToggle(event)) return;
			if (handleFilterApply(event)) return;
			if (handleFilterReset(event)) return;
			if (handleSortOption(event)) return;
			if (handleSortReset(event)) return;

			var openPanel = getOpenPanel();
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
			if (!getOpenPanel()) return;

			event.preventDefault();
			closeAll(true);
			announce('Dialog geschlossen');
		});

		document.addEventListener('click', function (event) {
			if (!getOpenPanel()) return;
			if (bar.contains(event.target)) return;

			closeAll(false);
			announce('Dialog geschlossen');
		});

		initStateFromDom();
		syncToggleUI('jg_filter_farben');
		syncToggleUI('jg_filter_groessen');
		syncSpecialToggles();
		syncCheckRows();
		expandSectionsWithActiveFilters();
		updateFilterCount();
		closeAll(false);
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

		document.addEventListener(
			'click',
			function () {
				window.setTimeout(updateMenuState, 50);
			},
			true
		);
	}

	function boot() {
		initMobileFilterbar();
		initWoodmartMenuWatcher();
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
})();