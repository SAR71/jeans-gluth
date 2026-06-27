<?php
// LastChanged: 2026-06-27 00:00:00
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'jg_filterbar_mobile_extract_swatch_color' ) ) {
	function jg_filterbar_mobile_extract_swatch_color( $raw ) {
		if ( is_array( $raw ) ) {
			foreach ( $raw as $value ) {
				$found = jg_filterbar_mobile_extract_swatch_color( $value );
				if ( $found !== '' ) {
					return $found;
				}
			}

			return '';
		}

		if ( is_object( $raw ) ) {
			return jg_filterbar_mobile_extract_swatch_color( (array) $raw );
		}

		if ( ! is_scalar( $raw ) ) {
			return '';
		}

		$value = trim( (string) $raw );
		if ( $value === '' ) {
			return '';
		}

		if ( preg_match( '/^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})$/', $value ) ) {
			return $value;
		}

		if ( preg_match( '/^(rgba?|hsla?)\([^\n]+\)$/', $value ) ) {
			return $value;
		}

		if ( preg_match( '/^(linear-gradient|radial-gradient)\([^\n]+\)$/', $value ) ) {
			return $value;
		}

		if ( $value[0] === '{' || $value[0] === '[' ) {
			$decoded = json_decode( $value, true );
			if ( is_array( $decoded ) ) {
				return jg_filterbar_mobile_extract_swatch_color( $decoded );
			}
		}

		if ( preg_match( '/(#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\)|(linear-gradient|radial-gradient)\([^\)]+\))/', $value, $m ) ) {
			return $m[1];
		}

		return '';
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_get_swatch_for_term' ) ) {
	function jg_filterbar_mobile_get_swatch_for_term( $term ) {
		if ( ! ( $term instanceof WP_Term ) ) {
			return '#d9d9d9';
		}

		$term_id = (int) $term->term_id;
		if ( $term_id <= 0 ) {
			return '#d9d9d9';
		}

		$preferred_meta_keys = [
			'color',
			'colour',
			'swatch_color',
			'sw_color',
			'product_attribute_color',
			'wd_color',
			'term_color',
			'colorgroup_color',
		];

		foreach ( $preferred_meta_keys as $meta_key ) {
			$raw = get_term_meta( $term_id, $meta_key, true );
			$swatch = jg_filterbar_mobile_extract_swatch_color( $raw );
			if ( $swatch !== '' ) {
				return $swatch;
			}
		}

		$all_meta = get_term_meta( $term_id );
		if ( is_array( $all_meta ) ) {
			foreach ( $all_meta as $meta_key => $meta_values ) {
				$key = strtolower( (string) $meta_key );
				if ( strpos( $key, 'color' ) === false && strpos( $key, 'colour' ) === false && strpos( $key, 'swatch' ) === false ) {
					continue;
				}

				$swatch = jg_filterbar_mobile_extract_swatch_color( $meta_values );
				if ( $swatch !== '' ) {
					return $swatch;
				}
			}
		}

		return '#d9d9d9';
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_shortcode' ) ) {
	function jg_filterbar_mobile_shortcode() {
		if ( ! function_exists( 'is_shop' ) ) {
			return '';
		}

		if ( ! ( is_shop() || is_product_taxonomy() || is_product_category() || is_product_tag() ) ) {
			return '';
		}

		$tax_marke  = 'pa_marke';
		$tax_farben = 'pa_colorgroup';

		$selected_marke    = function_exists( 'jg_get_list_param' ) ? jg_get_list_param( 'jg_filter_marke' ) : [];
		$selected_farben   = function_exists( 'jg_get_list_param' ) ? jg_get_list_param( 'jg_filter_farben' ) : [];
		$selected_groessen = function_exists( 'jg_get_list_param' ) ? jg_get_list_param( 'jg_filter_groessen' ) : [];
		$selected_orderby  = isset( $_GET['orderby'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['orderby'] ) ) : '';

		$terms_marke        = function_exists( 'jg_get_tax_terms_for_filtered_products' ) ? jg_get_tax_terms_for_filtered_products( $tax_marke, [ 'jg_filter_marke' ] ) : [];
		$terms_farben       = function_exists( 'jg_get_tax_terms_for_filtered_products' ) ? jg_get_tax_terms_for_filtered_products( $tax_farben, [ 'jg_filter_farben' ] ) : [];
		$terms_groessen_int = function_exists( 'jg_get_size_terms_for_filtered_products' ) ? jg_get_size_terms_for_filtered_products( 'pa_int', [ 'jg_filter_groessen' ] ) : [];
		$terms_groessen_eu  = function_exists( 'jg_get_size_terms_for_filtered_products' ) ? jg_get_size_terms_for_filtered_products( 'pa_eu', [ 'jg_filter_groessen' ] ) : [];

		$int_order = [ 'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl' ];
		usort(
			$terms_groessen_int,
			static function( $a, $b ) use ( $int_order ) {
				$pos_a = array_search( sanitize_title( $a->name ), $int_order, true );
				$pos_b = array_search( sanitize_title( $b->name ), $int_order, true );
				if ( $pos_a === false ) {
					$pos_a = 999;
				}
				if ( $pos_b === false ) {
					$pos_b = 999;
				}

				return $pos_a - $pos_b;
			}
		);

		$terms_farben = array_values(
			array_filter(
				$terms_farben,
				static function( $term ) {
					if ( ! ( $term instanceof WP_Term ) ) {
						return false;
					}

					$slug_key = sanitize_title( (string) $term->slug );
					$name_key = sanitize_title( (string) $term->name );

					return $slug_key !== 'unbestimmt' && $name_key !== 'unbestimmt';
				}
			)
		);

		$color_items = [];
		foreach ( $terms_farben as $term ) {
			if ( ! ( $term instanceof WP_Term ) ) {
				continue;
			}

			$color_items[] = [
				'term'   => $term,
				'swatch' => jg_filterbar_mobile_get_swatch_for_term( $term ),
			];
		}

		ob_start();
		?>
		<div class="jgm-filterbar" data-jgm-filterbar="1" role="navigation" aria-label="Filter mobil">
			<span class="jgm-sr-only" aria-live="polite" aria-atomic="true" data-jgm-live-region></span>

			<button class="jgm-btn" type="button" data-jgm-panel="jgm-panel-filter" aria-haspopup="dialog" aria-controls="jgm-panel-filter" aria-expanded="false" aria-label="Filter öffnen">
				<span>FILTER</span><span class="jgm-chev" aria-hidden="true">▾</span>
			</button>

			<button class="jgm-btn" type="button" data-jgm-panel="jgm-panel-sort" aria-haspopup="dialog" aria-controls="jgm-panel-sort" aria-expanded="false" aria-label="Sortierung öffnen">
				<span>SORTIEREN</span><span class="jgm-chev" aria-hidden="true">▾</span>
			</button>

			<div class="jgm-panel" id="jgm-panel-filter" role="dialog" aria-labelledby="jgm-panel-filter-title" aria-modal="false" aria-hidden="true">
				<div class="jgm-panel-inner">
					<h2 class="jgm-sr-only" id="jgm-panel-filter-title">Filter</h2>

					<?php if ( ! empty( $terms_marke ) ) : ?>
					<div class="jgm-section">
						<p class="jgm-section-title">Marke</p>
						<div class="jgm-brand-list">
							<?php foreach ( $terms_marke as $t ) : ?>
								<?php
								$slug    = sanitize_title( $t->slug );
								$checked = in_array( $slug, $selected_marke, true );
								?>
								<label class="jgm-checkrow<?php echo $checked ? ' is-active' : ''; ?>">
									<input type="checkbox" class="jgm-check" data-jgm-filter="jg_filter_marke" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $checked ); ?> />
									<span class="jgm-checkbox-ui" aria-hidden="true"></span>
									<span><?php echo esc_html( $t->name ); ?></span>
								</label>
							<?php endforeach; ?>
						</div>
					</div>
					<?php endif; ?>

					<?php if ( ! empty( $color_items ) ) : ?>
					<div class="jgm-section">
						<p class="jgm-section-title">Farbe</p>
						<div class="jgm-color-grid">
							<?php foreach ( $color_items as $item ) : ?>
								<?php
								$t         = $item['term'];
								$slug      = sanitize_title( $t->slug );
								$is_active = in_array( $slug, $selected_farben, true );
								?>
								<button
									type="button"
									class="jgm-color-item<?php echo $is_active ? ' is-active' : ''; ?>"
									data-jgm-toggle="jg_filter_farben"
									data-jgm-value="<?php echo esc_attr( $slug ); ?>"
									aria-label="<?php echo esc_attr( $t->name ); ?>"
									aria-pressed="<?php echo $is_active ? 'true' : 'false'; ?>"
									style="--jgm-swatch: <?php echo esc_attr( $item['swatch'] ); ?>;"
								>
									<span class="jgm-color-dot" aria-hidden="true"></span>
								</button>
							<?php endforeach; ?>
						</div>
					</div>
					<?php endif; ?>

					<?php if ( ! empty( $terms_groessen_int ) || ! empty( $terms_groessen_eu ) ) : ?>
					<div class="jgm-section">
						<p class="jgm-section-title">Größe</p>
						<div class="jgm-size-rows">
							<?php if ( ! empty( $terms_groessen_int ) ) : ?>
							<div class="jgm-size-row">
								<?php foreach ( $terms_groessen_int as $t ) : ?>
									<?php
									$slug      = sanitize_title( $t->slug );
									$is_active = in_array( $slug, $selected_groessen, true );
									?>
									<button
										type="button"
										class="jgm-size-pill<?php echo $is_active ? ' is-active' : ''; ?>"
										data-jgm-toggle="jg_filter_groessen"
										data-jgm-value="<?php echo esc_attr( $slug ); ?>"
										aria-pressed="<?php echo $is_active ? 'true' : 'false'; ?>"
									>
										<?php echo esc_html( $t->name ); ?>
									</button>
								<?php endforeach; ?>
							</div>
							<?php endif; ?>

							<?php if ( ! empty( $terms_groessen_eu ) ) : ?>
							<div class="jgm-size-row">
								<?php foreach ( $terms_groessen_eu as $t ) : ?>
									<?php
									$slug      = sanitize_title( $t->slug );
									$is_active = in_array( $slug, $selected_groessen, true );
									?>
									<button
										type="button"
										class="jgm-size-pill<?php echo $is_active ? ' is-active' : ''; ?>"
										data-jgm-toggle="jg_filter_groessen"
										data-jgm-value="<?php echo esc_attr( $slug ); ?>"
										aria-pressed="<?php echo $is_active ? 'true' : 'false'; ?>"
									>
										<?php echo esc_html( $t->name ); ?>
									</button>
								<?php endforeach; ?>
							</div>
							<?php endif; ?>
						</div>
					</div>
					<?php endif; ?>

					<div class="jgm-actions">
						<button type="button" class="jgm-apply" data-jgm-apply-filter="1">ANWENDEN</button>
						<button type="button" class="jgm-close" data-jgm-close>Schließen</button>
						<button type="button" class="jgm-reset" data-jgm-reset-filter="1">Filter zurücksetzen</button>
					</div>
				</div>
			</div>

			<div class="jgm-panel jgm-panel-sort" id="jgm-panel-sort" role="dialog" aria-labelledby="jgm-panel-sort-title" aria-modal="false" aria-hidden="true">
				<div class="jgm-panel-inner">
					<h2 class="jgm-sr-only" id="jgm-panel-sort-title">Sortieren</h2>
					<div class="jgm-sort-list" aria-label="Sortieroptionen">
						<button type="button" class="jgm-sort-option" data-jgm-orderby="price" aria-pressed="<?php echo $selected_orderby === 'price' ? 'true' : 'false'; ?>">PREIS AUFSTEIGEND</button>
						<button type="button" class="jgm-sort-option" data-jgm-orderby="price-desc" aria-pressed="<?php echo $selected_orderby === 'price-desc' ? 'true' : 'false'; ?>">PREIS ABSTEIGEND</button>
					</div>
					<div class="jgm-actions">
						<button type="button" class="jgm-close" data-jgm-close>Schließen</button>
						<button type="button" class="jgm-reset" data-jgm-reset-orderby="1">Sortierung zurücksetzen</button>
					</div>
				</div>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}
}
add_shortcode( 'jg_filterbar_mobile', 'jg_filterbar_mobile_shortcode' );
add_shortcode( 'filterbar-mobile', 'jg_filterbar_mobile_shortcode' );
