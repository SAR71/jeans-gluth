<?php
// LastChanged: 2026-04-23 23:01:28
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

if ( ! function_exists( 'jg_wc_get_product_cached' ) ) {
	function jg_wc_get_product_cached( $product_id ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return null;
		}

		$id = (int) $product_id;
		if ( $id <= 0 ) {
			return null;
		}

		static $product_cache = [];

		if ( ! array_key_exists( $id, $product_cache ) ) {
			$product_cache[ $id ] = wc_get_product( $id );
		}

		return $product_cache[ $id ];
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

		$product_id = (int) $product->get_id();
		$cache_key  = $product_id . '|' . implode( ',', $selected_sizes );
		static $match_cache = [];

		if ( array_key_exists( $cache_key, $match_cache ) ) {
			return $match_cache[ $cache_key ];
		}

		if ( $product->is_type( 'simple' ) ) {
			if ( ! $product->is_in_stock() ) {
				$match_cache[ $cache_key ] = false;
				return false;
			}

			$terms = wc_get_product_terms( $product->get_id(), 'pa_groessen', [ 'fields' => 'slugs' ] );
			$terms = array_map( 'sanitize_title', (array) $terms );

			$match_cache[ $cache_key ] = ! empty( array_intersect( $selected_sizes, $terms ) );
			return $match_cache[ $cache_key ];
		}

		if ( $product->is_type( 'variable' ) ) {
			$children = $product->get_children();

			if ( empty( $children ) ) {
				return false;
			}

			foreach ( $children as $child_id ) {
				$variation = jg_wc_get_product_cached( $child_id );

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
					$match_cache[ $cache_key ] = true;
					return true;
				}
			}

			$match_cache[ $cache_key ] = false;
			return false;
		}

		$match_cache[ $cache_key ] = false;
		return false;
	}
}

if ( ! function_exists( 'jg_get_instock_size_slugs_for_product' ) ) {
	function jg_get_instock_size_slugs_for_product( $product ) {
		if ( ! $product ) {
			return [];
		}

		$product_id = (int) $product->get_id();
		static $size_cache = [];

		if ( array_key_exists( $product_id, $size_cache ) ) {
			return $size_cache[ $product_id ];
		}

		$size_slugs = [];

		if ( $product->is_type( 'simple' ) ) {
			if ( ! $product->is_in_stock() ) {
				$size_cache[ $product_id ] = [];
				return [];
			}

			$terms = wc_get_product_terms( $product->get_id(), 'pa_groessen', [ 'fields' => 'slugs' ] );
			$terms = array_map( 'sanitize_title', (array) $terms );

			$size_cache[ $product_id ] = array_values( array_unique( array_filter( $terms ) ) );
			return $size_cache[ $product_id ];
		}

		if ( $product->is_type( 'variable' ) ) {
			$children = $product->get_children();

			foreach ( $children as $child_id ) {
				$variation = jg_wc_get_product_cached( $child_id );

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

		$size_cache[ $product_id ] = array_values( array_unique( array_filter( $size_slugs ) ) );

		return $size_cache[ $product_id ];
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

		$term = get_queried_object();
		$cache_payload = [
			'exclude' => $exclude_filter_keys,
			'args'    => jg_get_filter_args_from_request(),
			'shop'    => (int) is_shop(),
			'tax'     => is_object( $term ) && ! empty( $term->taxonomy ) ? (string) $term->taxonomy : '',
			'term'    => is_object( $term ) && ! empty( $term->term_id ) ? (int) $term->term_id : 0,
		];

		$cache_key = md5( wp_json_encode( $cache_payload ) );
		static $ids_cache = [];

		if ( array_key_exists( $cache_key, $ids_cache ) ) {
			return $ids_cache[ $cache_key ];
		}

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
				'taxonomy'         => 'pa_colorgroup',
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
			'cache_results'          => true,
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
				$product = jg_wc_get_product_cached( $product_id );

				if ( jg_product_matches_selected_sizes_instock( $product, $selected_groessen ) ) {
					$matched_ids[] = (int) $product_id;
				}
			}

			$product_ids = $matched_ids;
		}

		$ids_cache[ $cache_key ] = array_values( array_unique( array_filter( $product_ids ) ) );

		return $ids_cache[ $cache_key ];
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
			$product = jg_wc_get_product_cached( $product_id );

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
				'taxonomy'         => 'pa_colorgroup',
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
				$product = jg_wc_get_product_cached( $product_id );

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
		$tax_farben   = 'pa_colorgroup';
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

		$extract_swatch_color = null;
		$extract_swatch_color = static function( $raw ) use ( &$extract_swatch_color ) {
			if ( is_array( $raw ) ) {
				foreach ( $raw as $value ) {
					$found = $extract_swatch_color( $value );
					if ( $found !== '' ) {
						return $found;
					}
				}

				return '';
			}

			if ( is_object( $raw ) ) {
				return $extract_swatch_color( (array) $raw );
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
					return $extract_swatch_color( $decoded );
				}
			}

			if ( preg_match( '/(#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\)|(linear-gradient|radial-gradient)\([^\)]+\))/', $value, $m ) ) {
				return $m[1];
			}

			return '';
		};

		$swatch_for_term = static function( $term ) use ( $extract_swatch_color ) {
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
				$hex = $extract_swatch_color( $raw );
				if ( $hex !== '' ) {
					return $hex;
				}
			}

			$all_meta = get_term_meta( $term_id );
			if ( is_array( $all_meta ) ) {
				foreach ( $all_meta as $meta_key => $meta_values ) {
					$key = strtolower( (string) $meta_key );
					if ( strpos( $key, 'color' ) === false && strpos( $key, 'colour' ) === false && strpos( $key, 'swatch' ) === false ) {
						continue;
					}

					$hex = $extract_swatch_color( $meta_values );
					if ( $hex !== '' ) {
						return $hex;
					}
				}
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