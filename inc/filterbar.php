<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Shortcode: [jg_filterbar]
 * Custom Filterbar (Marke, Farbe, Größe, Sale, Neu) für WooCommerce Archive.
 * - Eigene Query-Parameter mit jg_ Prefix
 * - Innerhalb eines Filters: ODER-Prinzip
 * - Zwischen verschiedenen Filtern: UND-Prinzip
 * - Nur Produkte auf Lager
 * - Größenfilter berücksichtigt bei variablen Produkten nur lagernde Variationen
 * - Filteroptionen zeigen nur Werte, die im aktuellen Archiv-Kontext tatsächlich vorhanden sind
 * - Filterzustand bleibt erhalten, auch über Produktdetailseite / Breadcrumbs
 */

if ( ! function_exists( 'jg_get_filter_args_from_request' ) ) {
	function jg_get_filter_args_from_request() {
		$allowed = [
			'jg_filter_marke',
			'jg_filter_farben',
			'jg_filter_groessen',
			'jg_sale',
			'jg_new',
			'orderby',
		];

		$out = [];

		foreach ( $allowed as $key ) {
			if ( ! isset( $_GET[ $key ] ) ) {
				continue;
			}

			$value = wp_unslash( $_GET[ $key ] );

			if ( is_array( $value ) ) {
				$value = implode( ',', array_map( 'sanitize_text_field', $value ) );
			} else {
				$value = sanitize_text_field( (string) $value );
			}

			if ( $value !== '' ) {
				$out[ $key ] = $value;
			}
		}

		return $out;
	}
}

if ( ! function_exists( 'jg_get_list_param' ) ) {
	function jg_get_list_param( $key ) {
		if ( empty( $_GET[ $key ] ) ) {
			return [];
		}

		$raw   = wp_unslash( $_GET[ $key ] );
		$raw   = is_array( $raw ) ? implode( ',', $raw ) : (string) $raw;
		$parts = array_filter( array_map( 'sanitize_title', explode( ',', $raw ) ) );

		return array_values( array_unique( $parts ) );
	}
}

if ( ! function_exists( 'jg_store_filter_state_in_session' ) ) {
	function jg_store_filter_state_in_session() {
		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return;
		}

		if ( is_shop() || is_product_taxonomy() || is_product_category() || is_product_tag() ) {
			$args = jg_get_filter_args_from_request();
			WC()->session->set( 'jg_last_product_filters', $args );
		}
	}
}
add_action( 'wp', 'jg_store_filter_state_in_session', 20 );

if ( ! function_exists( 'jg_get_saved_filter_args' ) ) {
	function jg_get_saved_filter_args() {
		if ( function_exists( 'WC' ) && WC()->session ) {
			$saved = WC()->session->get( 'jg_last_product_filters' );
			if ( is_array( $saved ) ) {
				return $saved;
			}
		}

		return [];
	}
}

if ( ! function_exists( 'jg_product_matches_selected_sizes_instock' ) ) {
	function jg_product_matches_selected_sizes_instock( $product, $selected_sizes ) {
		if ( ! $product || empty( $selected_sizes ) ) {
			return false;
		}

		$selected_sizes = array_values( array_filter( array_map( 'sanitize_title', (array) $selected_sizes ) ) );

		if ( empty( $selected_sizes ) ) {
			return false;
		}

		if ( $product->is_type( 'simple' ) ) {
			if ( ! $product->is_in_stock() ) {
				return false;
			}

			$terms = wc_get_product_terms( $product->get_id(), 'pa_groessen', [ 'fields' => 'slugs' ] );
			$terms = array_map( 'sanitize_title', (array) $terms );

			return ! empty( array_intersect( $selected_sizes, $terms ) );
		}

		if ( $product->is_type( 'variable' ) ) {
			$children = $product->get_children();

			if ( empty( $children ) ) {
				return false;
			}

			foreach ( $children as $child_id ) {
				$variation = wc_get_product( $child_id );

				if ( ! $variation || ! $variation->exists() ) {
					continue;
				}

				if ( ! $variation->variation_is_visible() ) {
					continue;
				}

				if ( ! $variation->is_in_stock() ) {
					continue;
				}

				$variation_size = $variation->get_attribute( 'pa_groessen' );
				$variation_size = sanitize_title( $variation_size );

				if ( $variation_size && in_array( $variation_size, $selected_sizes, true ) ) {
					return true;
				}
			}

			return false;
		}

		return false;
	}
}

if ( ! function_exists( 'jg_get_instock_size_slugs_for_product' ) ) {
	function jg_get_instock_size_slugs_for_product( $product ) {
		if ( ! $product ) {
			return [];
		}

		$size_slugs = [];

		if ( $product->is_type( 'simple' ) ) {
			if ( ! $product->is_in_stock() ) {
				return [];
			}

			$terms = wc_get_product_terms( $product->get_id(), 'pa_groessen', [ 'fields' => 'slugs' ] );
			$terms = array_map( 'sanitize_title', (array) $terms );

			return array_values( array_unique( array_filter( $terms ) ) );
		}

		if ( $product->is_type( 'variable' ) ) {
			$children = $product->get_children();

			foreach ( $children as $child_id ) {
				$variation = wc_get_product( $child_id );

				if ( ! $variation || ! $variation->exists() ) {
					continue;
				}

				if ( ! $variation->variation_is_visible() ) {
					continue;
				}

				if ( ! $variation->is_in_stock() ) {
					continue;
				}

				$variation_size = sanitize_title( $variation->get_attribute( 'pa_groessen' ) );

				if ( $variation_size ) {
					$size_slugs[] = $variation_size;
				}
			}
		}

		return array_values( array_unique( array_filter( $size_slugs ) ) );
	}
}

if ( ! function_exists( 'jg_get_current_archive_tax_query' ) ) {
	function jg_get_current_archive_tax_query() {
		$tax_query = [];

		if ( is_product_category() || is_product_tag() || is_product_taxonomy() ) {
			$current_term = get_queried_object();

			if ( $current_term && ! empty( $current_term->taxonomy ) && ! empty( $current_term->term_id ) ) {
				$tax_query[] = [
					'taxonomy'         => $current_term->taxonomy,
					'field'            => 'term_id',
					'terms'            => [ (int) $current_term->term_id ],
					'operator'         => 'IN',
					'include_children' => true,
				];
			}
		}

		return $tax_query;
	}
}

if ( ! function_exists( 'jg_get_filtered_product_ids_for_context' ) ) {
	function jg_get_filtered_product_ids_for_context( $exclude_filter_keys = [] ) {
		$exclude_filter_keys = array_map( 'strval', (array) $exclude_filter_keys );

		$selected_marke    = jg_get_list_param( 'jg_filter_marke' );
		$selected_farben   = jg_get_list_param( 'jg_filter_farben' );
		$selected_groessen = jg_get_list_param( 'jg_filter_groessen' );

		$tax_query  = jg_get_current_archive_tax_query();
		$meta_query = [
			[
				'key'     => '_stock_status',
				'value'   => 'instock',
				'compare' => '=',
			],
		];

		if ( ! in_array( 'jg_filter_marke', $exclude_filter_keys, true ) && ! empty( $selected_marke ) ) {
			$tax_query[] = [
				'taxonomy'         => 'pa_marke',
				'field'            => 'slug',
				'terms'            => $selected_marke,
				'operator'         => 'IN',
				'include_children' => false,
			];
		}

		if ( ! in_array( 'jg_filter_farben', $exclude_filter_keys, true ) && ! empty( $selected_farben ) ) {
			$tax_query[] = [
				'taxonomy'         => 'pa_farben',
				'field'            => 'slug',
				'terms'            => $selected_farben,
				'operator'         => 'IN',
				'include_children' => false,
			];
		}

		$args = [
			'post_type'              => 'product',
			'post_status'            => 'publish',
			'fields'                 => 'ids',
			'posts_per_page'         => -1,
			'no_found_rows'          => true,
			'cache_results'          => false,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
			'meta_query'             => [
				'relation' => 'AND',
				$meta_query[0],
			],
		];

		if ( ! empty( $tax_query ) ) {
			array_unshift( $tax_query, [ 'relation' => 'AND' ] );
			$args['tax_query'] = $tax_query;
		}

		if ( empty( $exclude_filter_keys ) || ! in_array( 'jg_sale', $exclude_filter_keys, true ) ) {
			if ( ! empty( $_GET['jg_sale'] ) && $_GET['jg_sale'] === '1' && function_exists( 'wc_get_product_ids_on_sale' ) ) {
				$sale_ids = array_map( 'absint', (array) wc_get_product_ids_on_sale() );
				$args['post__in'] = ! empty( $sale_ids ) ? $sale_ids : [ 0 ];
			}
		}

		if ( empty( $exclude_filter_keys ) || ! in_array( 'jg_new', $exclude_filter_keys, true ) ) {
			if ( ! empty( $_GET['jg_new'] ) && $_GET['jg_new'] === '1' ) {
				$args['date_query'] = [
					[
						'after'     => gmdate( 'Y-m-d', strtotime( '-30 days' ) ),
						'inclusive' => true,
						'column'    => 'post_date_gmt',
					],
				];
			}
		}

		$product_ids = get_posts( $args );
		$product_ids = array_map( 'absint', (array) $product_ids );

		if ( ! in_array( 'jg_filter_groessen', $exclude_filter_keys, true ) && ! empty( $selected_groessen ) ) {
			$matched_ids = [];

			foreach ( $product_ids as $product_id ) {
				$product = wc_get_product( $product_id );

				if ( jg_product_matches_selected_sizes_instock( $product, $selected_groessen ) ) {
					$matched_ids[] = (int) $product_id;
				}
			}

			$product_ids = $matched_ids;
		}

		return array_values( array_unique( array_filter( $product_ids ) ) );
	}
}

if ( ! function_exists( 'jg_get_tax_terms_for_filtered_products' ) ) {
	function jg_get_tax_terms_for_filtered_products( $taxonomy, $exclude_filter_keys = [] ) {
		$product_ids = jg_get_filtered_product_ids_for_context( $exclude_filter_keys );

		if ( empty( $product_ids ) ) {
			return [];
		}

		$terms = wp_get_object_terms(
			$product_ids,
			$taxonomy,
			[
				'orderby' => 'name',
				'order'   => 'ASC',
			]
		);

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return [];
		}

		$valid_terms = [];

		foreach ( $terms as $term ) {
			if ( $term instanceof WP_Term ) {
				$valid_terms[ $term->term_id ] = $term;
			}
		}

		usort(
			$valid_terms,
			function( $a, $b ) {
				return strcasecmp( $a->name, $b->name );
			}
		);

		return array_values( $valid_terms );
	}
}

if ( ! function_exists( 'jg_get_size_terms_for_filtered_products' ) ) {
	function jg_get_size_terms_for_filtered_products( $exclude_filter_keys = [] ) {
		$product_ids = jg_get_filtered_product_ids_for_context( $exclude_filter_keys );

		if ( empty( $product_ids ) ) {
			return [];
		}

		$size_slugs = [];

		foreach ( $product_ids as $product_id ) {
			$product = wc_get_product( $product_id );

			if ( ! $product ) {
				continue;
			}

			$size_slugs = array_merge( $size_slugs, jg_get_instock_size_slugs_for_product( $product ) );
		}

		$size_slugs = array_values( array_unique( array_filter( array_map( 'sanitize_title', $size_slugs ) ) ) );

		if ( empty( $size_slugs ) ) {
			return [];
		}

		$terms = get_terms(
			[
				'taxonomy'   => 'pa_groessen',
				'hide_empty' => false,
				'slug'       => $size_slugs,
				'orderby'    => 'name',
				'order'      => 'ASC',
			]
		);

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return [];
		}

		usort(
			$terms,
			function( $a, $b ) {
				return strcasecmp( $a->name, $b->name );
			}
		);

		return array_values( $terms );
	}
}

if ( ! function_exists( 'jg_filterbar_pre_get_posts' ) ) {
	function jg_filterbar_pre_get_posts( $q ) {
		if ( is_admin() || ! $q->is_main_query() ) {
			return;
		}

		if ( ! ( is_shop() || is_product_taxonomy() || is_product_category() || is_product_tag() ) ) {
			return;
		}

		$selected_marke    = jg_get_list_param( 'jg_filter_marke' );
		$selected_farben   = jg_get_list_param( 'jg_filter_farben' );
		$selected_groessen = jg_get_list_param( 'jg_filter_groessen' );

		$tax_query  = [];
		$meta_query = [];

		$existing_tax_query = $q->get( 'tax_query' );
		if ( is_array( $existing_tax_query ) ) {
			foreach ( $existing_tax_query as $item ) {
				if ( is_array( $item ) && isset( $item['taxonomy'] ) ) {
					$tax_query[] = $item;
				}
			}
		}

		$existing_meta_query = $q->get( 'meta_query' );
		if ( is_array( $existing_meta_query ) ) {
			foreach ( $existing_meta_query as $item ) {
				if ( is_array( $item ) && isset( $item['key'] ) ) {
					$meta_query[] = $item;
				}
			}
		}

		if ( ! empty( $selected_marke ) ) {
			$tax_query[] = [
				'taxonomy'         => 'pa_marke',
				'field'            => 'slug',
				'terms'            => $selected_marke,
				'operator'         => 'IN',
				'include_children' => false,
			];
		}

		if ( ! empty( $selected_farben ) ) {
			$tax_query[] = [
				'taxonomy'         => 'pa_farben',
				'field'            => 'slug',
				'terms'            => $selected_farben,
				'operator'         => 'IN',
				'include_children' => false,
			];
		}

		if ( ! empty( $selected_groessen ) ) {
			$base_ids = jg_get_filtered_product_ids_for_context( [ 'jg_filter_groessen' ] );

			$allowed_ids = [];

			foreach ( $base_ids as $product_id ) {
				$product = wc_get_product( $product_id );

				if ( jg_product_matches_selected_sizes_instock( $product, $selected_groessen ) ) {
					$allowed_ids[] = (int) $product_id;
				}
			}

			if ( empty( $allowed_ids ) ) {
				$allowed_ids = [ 0 ];
			}

			$current_post__in = $q->get( 'post__in' );
			if ( is_array( $current_post__in ) && ! empty( $current_post__in ) ) {
				$allowed_ids = array_values( array_intersect( $current_post__in, $allowed_ids ) );
				if ( empty( $allowed_ids ) ) {
					$allowed_ids = [ 0 ];
				}
			}

			$q->set( 'post__in', $allowed_ids );
		}

		if ( ! empty( $tax_query ) ) {
			$tax_query = array_values( $tax_query );
			array_unshift( $tax_query, [ 'relation' => 'AND' ] );
			$q->set( 'tax_query', $tax_query );
		}

		$meta_query[] = [
			'key'     => '_stock_status',
			'value'   => 'instock',
			'compare' => '=',
		];

		if ( ! empty( $meta_query ) ) {
			$meta_query = array_values( $meta_query );
			array_unshift( $meta_query, [ 'relation' => 'AND' ] );
			$q->set( 'meta_query', $meta_query );
		}

		if ( ! empty( $_GET['jg_sale'] ) && $_GET['jg_sale'] === '1' ) {
			if ( function_exists( 'wc_get_product_ids_on_sale' ) ) {
				$ids = wc_get_product_ids_on_sale();
				$ids = array_map( 'absint', (array) $ids );

				if ( empty( $ids ) ) {
					$ids = [ 0 ];
				}

				$current_post__in = $q->get( 'post__in' );
				if ( is_array( $current_post__in ) && ! empty( $current_post__in ) ) {
					$ids = array_values( array_intersect( $current_post__in, $ids ) );
					if ( empty( $ids ) ) {
						$ids = [ 0 ];
					}
				}

				$q->set( 'post__in', $ids );
			}
		}

		if ( ! empty( $_GET['jg_new'] ) && $_GET['jg_new'] === '1' ) {
			$after = gmdate( 'Y-m-d', strtotime( '-30 days' ) );
			$q->set(
				'date_query',
				[
					[
						'after'     => $after,
						'inclusive' => true,
						'column'    => 'post_date_gmt',
					],
				]
			);
		}
	}
}
add_action( 'pre_get_posts', 'jg_filterbar_pre_get_posts', 20 );

if ( ! function_exists( 'jg_filterbar_add_query_args_to_product_permalink' ) ) {
	function jg_filterbar_add_query_args_to_product_permalink( $permalink, $post ) {
		if ( ! $post || $post->post_type !== 'product' ) {
			return $permalink;
		}

		if ( is_admin() ) {
			return $permalink;
		}

		if ( is_shop() || is_product_taxonomy() || is_product_category() || is_product_tag() ) {
			$args = jg_get_filter_args_from_request();
			if ( ! empty( $args ) ) {
				$permalink = add_query_arg( $args, $permalink );
			}
		}

		return $permalink;
	}
}
add_filter( 'post_type_link', 'jg_filterbar_add_query_args_to_product_permalink', 10, 2 );

if ( ! function_exists( 'jg_filterbar_modify_breadcrumbs' ) ) {
	function jg_filterbar_modify_breadcrumbs( $crumbs, $breadcrumb ) {
		if ( ! is_product() || empty( $crumbs ) || ! is_array( $crumbs ) ) {
			return $crumbs;
		}

		$args = jg_get_filter_args_from_request();

		if ( empty( $args ) ) {
			$args = jg_get_saved_filter_args();
		}

		if ( empty( $args ) ) {
			return $crumbs;
		}

		foreach ( $crumbs as $index => $crumb ) {
			if ( empty( $crumb[1] ) ) {
				continue;
			}

			$url = $crumb[1];

			if (
				strpos( $url, '/shop/' ) !== false ||
				strpos( $url, '/product-category/' ) !== false ||
				strpos( $url, '/produkt-kategorie/' ) !== false
			) {
				$crumbs[ $index ][1] = add_query_arg( $args, $url );
			}
		}

		return $crumbs;
	}
}
add_filter( 'woocommerce_get_breadcrumb', 'jg_filterbar_modify_breadcrumbs', 10, 2 );

if ( ! function_exists( 'jg_filterbar_shortcode' ) ) {
	function jg_filterbar_shortcode() {
		if ( ! function_exists( 'is_shop' ) ) {
			return '';
		}

		if ( ! ( is_shop() || is_product_taxonomy() || is_product_category() || is_product_tag() ) ) {
			return '';
		}

		$tax_marke    = 'pa_marke';
		$tax_farben   = 'pa_farben';
		$tax_groessen = 'pa_groessen';

		$selected_marke    = jg_get_list_param( 'jg_filter_marke' );
		$selected_farben   = jg_get_list_param( 'jg_filter_farben' );
		$selected_groessen = jg_get_list_param( 'jg_filter_groessen' );

		$sale_on = ( ! empty( $_GET['jg_sale'] ) && $_GET['jg_sale'] === '1' );
		$new_on  = ( ! empty( $_GET['jg_new'] ) && $_GET['jg_new'] === '1' );

		$show_sale_new_toggles = false;
		if ( is_product_category() ) {
			$current_term = get_queried_object();
			if ( $current_term && ! empty( $current_term->term_id ) && isset( $current_term->parent ) ) {
				$show_sale_new_toggles = ( (int) $current_term->parent > 0 );
			}
		}

		$terms_marke    = jg_get_tax_terms_for_filtered_products( $tax_marke, [ 'jg_filter_marke' ] );
		$terms_farben   = jg_get_tax_terms_for_filtered_products( $tax_farben, [ 'jg_filter_farben' ] );
		$terms_groessen = jg_get_size_terms_for_filtered_products( [ 'jg_filter_groessen' ] );

		$color_map = [
			'schwarz' => '#0a0a0a',
			'black'   => '#0a0a0a',
			'grau'    => '#7a7a7a',
			'gray'    => '#7a7a7a',
			'grey'    => '#7a7a7a',
			'weiss'   => '#ffffff',
			'weiß'    => '#ffffff',
			'white'   => '#ffffff',
			'beige'   => '#b8a99a',
			'blau'    => '#1f355d',
			'blue'    => '#1f355d',
			'braun'   => '#4a3a33',
			'brown'   => '#4a3a33',
			'gruen'   => '#455a4f',
			'grün'    => '#455a4f',
			'green'   => '#455a4f',
			'rot'     => '#b33a46',
			'red'     => '#b33a46',
			'gelb'    => '#f2d79b',
			'yellow'  => '#f2d79b',
		];

		$swatch_for_term = function( $term ) use ( $color_map ) {
			$key = sanitize_title( $term->slug ? $term->slug : $term->name );

			if ( isset( $color_map[ $key ] ) ) {
				return $color_map[ $key ];
			}

			$name_key = sanitize_title( $term->name );
			if ( isset( $color_map[ $name_key ] ) ) {
				return $color_map[ $name_key ];
			}

			return '#d9d9d9';
		};

		ob_start();
		?>
		<div class="jg-filterbar" data-jg-filterbar="1" role="navigation" aria-label="Filter">
			<span class="jg-filterbar-label" aria-hidden="true">FILTER</span>

			<button class="jg-filterbtn" type="button" data-jg-panel="jg-panel-marke" aria-haspopup="dialog" aria-expanded="false">
				<span class="jg-filtertext">MARKE</span><span class="jg-count" aria-hidden="true"></span><span class="jg-chev" aria-hidden="true">▾</span>
			</button>

			<button class="jg-filterbtn" type="button" data-jg-panel="jg-panel-farbe" aria-haspopup="dialog" aria-expanded="false">
				<span class="jg-filtertext">FARBE</span><span class="jg-count" aria-hidden="true"></span><span class="jg-chev" aria-hidden="true">▾</span>
			</button>

			<button class="jg-filterbtn" type="button" data-jg-panel="jg-panel-groesse" aria-haspopup="dialog" aria-expanded="false">
				<span class="jg-filtertext">GRÖSSE</span><span class="jg-count" aria-hidden="true"></span><span class="jg-chev" aria-hidden="true">▾</span>
			</button>

			<button class="jg-filterbtn" type="button" data-jg-panel="jg-panel-sort" aria-haspopup="dialog" aria-expanded="false">
				<span class="jg-filtertext">SORTIEREN</span><span class="jg-count" aria-hidden="true"></span><span class="jg-chev" aria-hidden="true">▾</span>
			</button>

			<?php if ( $show_sale_new_toggles ) : ?>
			<div class="jg-filter-toggles" aria-label="Toggle Filter">
				<div class="jg-filter-toggle" aria-label="Sale">
					<span class="jg-toggle-label">SALE</span>
					<label class="jg-switch">
						<input type="checkbox" class="jg-switch-input" data-jg-toggle-query="jg_sale" <?php checked( $sale_on ); ?> />
						<span class="jg-switch-ui" aria-hidden="true"></span>
					</label>
				</div>

				<div class="jg-filter-toggle" aria-label="Neu">
					<span class="jg-toggle-label">NEU</span>
					<label class="jg-switch">
						<input type="checkbox" class="jg-switch-input" data-jg-toggle-query="jg_new" <?php checked( $new_on ); ?> />
						<span class="jg-switch-ui" aria-hidden="true"></span>
					</label>
				</div>
			</div>
			<?php endif; ?>

			<div class="jg-panel jg-panel--wide" id="jg-panel-marke" role="dialog" aria-label="Marke" aria-hidden="true">
				<div class="jg-panel-inner">
					<div class="jg-brand-list">
						<?php foreach ( $terms_marke as $t ) : ?>
							<?php
							$slug    = sanitize_title( $t->slug );
							$checked = in_array( $slug, $selected_marke, true );
							?>
							<label class="jg-checkrow<?php echo $checked ? ' is-active' : ''; ?>">
								<input type="checkbox" class="jg-check" data-jg-filter="jg_filter_marke" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $checked ); ?> />
								<span class="jg-checkbox-ui" aria-hidden="true"></span>
								<span class="jg-checklabel"><?php echo esc_html( $t->name ); ?></span>
							</label>
						<?php endforeach; ?>
					</div>

					<div class="jg-panel-actions">
						<button class="jg-apply" type="button" data-jg-apply-marke="1">ANWENDEN</button>
						<button class="jg-close" type="button" data-jg-close><span aria-hidden="true">✕</span><span>Schließen</span></button>
						<button class="jg-reset" type="button" data-jg-reset="jg_filter_marke">Auswahl zurücksetzen</button>
					</div>
				</div>
			</div>

			<div class="jg-panel jg-panel--narrow" id="jg-panel-farbe" role="dialog" aria-label="Farbe" aria-hidden="true">
				<div class="jg-panel-inner">
					<div class="jg-color-grid">
						<?php foreach ( $terms_farben as $t ) : ?>
							<?php
							$slug      = sanitize_title( $t->slug );
							$hex       = $swatch_for_term( $t );
							$is_active = in_array( $slug, $selected_farben, true );
							?>
							<button
								type="button"
								class="jg-color-item<?php echo $is_active ? ' is-active' : ''; ?>"
								data-jg-toggle="jg_filter_farben"
								data-jg-value="<?php echo esc_attr( $slug ); ?>"
								aria-pressed="<?php echo $is_active ? 'true' : 'false'; ?>"
								style="--jg-swatch: <?php echo esc_attr( $hex ); ?>;"
							>
								<span class="jg-color-dot" aria-hidden="true"></span>
								<span class="jg-sr-only"><?php echo esc_html( $t->name ); ?></span>
							</button>
						<?php endforeach; ?>
					</div>

					<div class="jg-panel-actions">
						<button class="jg-apply" type="button" data-jg-apply-key="jg_filter_farben">ANWENDEN</button>
						<button class="jg-close" type="button" data-jg-close><span aria-hidden="true">✕</span><span>Schließen</span></button>
						<button class="jg-reset" type="button" data-jg-reset="jg_filter_farben">Auswahl zurücksetzen</button>
					</div>
				</div>
			</div>

			<div class="jg-panel jg-panel--wide" id="jg-panel-groesse" role="dialog" aria-label="Größe" aria-hidden="true">
				<div class="jg-panel-inner">
					<div class="jg-size-grid">
						<?php foreach ( $terms_groessen as $t ) : ?>
							<?php
							$slug      = sanitize_title( $t->slug );
							$is_active = in_array( $slug, $selected_groessen, true );
							?>
							<button
								type="button"
								class="jg-size-pill<?php echo $is_active ? ' is-active' : ''; ?>"
								data-jg-toggle="jg_filter_groessen"
								data-jg-value="<?php echo esc_attr( $slug ); ?>"
								aria-pressed="<?php echo $is_active ? 'true' : 'false'; ?>"
							>
								<?php echo esc_html( $t->name ); ?>
							</button>
						<?php endforeach; ?>
					</div>

					<div class="jg-panel-actions">
						<button class="jg-apply" type="button" data-jg-apply-key="jg_filter_groessen">ANWENDEN</button>
						<button class="jg-close" type="button" data-jg-close><span aria-hidden="true">✕</span><span>Schließen</span></button>
						<button class="jg-reset" type="button" data-jg-reset="jg_filter_groessen">Auswahl zurücksetzen</button>
					</div>
				</div>
			</div>

			<div class="jg-panel jg-panel--narrow jg-panel--sort" id="jg-panel-sort" role="dialog" aria-label="Sortieren" aria-hidden="true">
				<div class="jg-panel-inner">
					<div class="jg-sort-list" role="listbox" aria-label="Sortieroptionen">
						<button type="button" class="jg-sort-option" data-jg-orderby="price" role="option" aria-selected="false">
							PREIS AUFSTEIGEND
						</button>
						<button type="button" class="jg-sort-option" data-jg-orderby="price-desc" role="option" aria-selected="false">
							PREIS ABSTEIGEND
						</button>
					</div>

					<div class="jg-panel-actions">
						<button class="jg-close" type="button" data-jg-close><span aria-hidden="true">✕</span><span>Schließen</span></button>
						<button class="jg-reset" type="button" data-jg-reset="orderby">Auswahl zurücksetzen</button>
					</div>
				</div>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}
}
add_shortcode( 'jg_filterbar', 'jg_filterbar_shortcode' );