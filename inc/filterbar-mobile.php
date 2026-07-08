<?php
// LastChanged: 2026-07-08 00:00:00
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


if ( ! function_exists( 'jg_filterbar_mobile_parse_ajax_list' ) ) {
	function jg_filterbar_mobile_parse_ajax_list( $key ) {
		if ( ! isset( $_POST[ $key ] ) ) {
			return [];
		}

		$raw = wp_unslash( $_POST[ $key ] );

		if ( is_array( $raw ) ) {
			$parts = $raw;
		} else {
			$parts = explode( ',', (string) $raw );
		}

		$parts = array_map( 'sanitize_title', $parts );
		$parts = array_filter( $parts );

		return array_values( array_unique( $parts ) );
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_current_ajax_filters' ) ) {
	function jg_filterbar_mobile_current_ajax_filters() {
		return [
			'marke'    => jg_filterbar_mobile_parse_ajax_list( 'marke' ),
			'farben'   => jg_filterbar_mobile_parse_ajax_list( 'farben' ),
			'groessen' => jg_filterbar_mobile_parse_ajax_list( 'groessen' ),
			'typ'      => jg_filterbar_mobile_parse_ajax_list( 'typ' ),
			'sale'     => ! empty( $_POST['sale'] ) && (string) wp_unslash( $_POST['sale'] ) === '1',
			'new'      => ! empty( $_POST['new'] ) && (string) wp_unslash( $_POST['new'] ) === '1',
		];
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_product_has_type_term' ) ) {
	function jg_filterbar_mobile_product_has_type_term( $product_id, $type_term_id ) {
		$product_id   = absint( $product_id );
		$type_term_id = absint( $type_term_id );

		if ( ! $product_id || ! $type_term_id ) {
			return false;
		}

		$terms = get_the_terms( $product_id, 'product_cat' );
		if ( empty( $terms ) || is_wp_error( $terms ) ) {
			return false;
		}

		foreach ( $terms as $term ) {
			if ( (int) $term->term_id === $type_term_id ) {
				return true;
			}

			$ancestors = get_ancestors( (int) $term->term_id, 'product_cat' );
			if ( in_array( $type_term_id, array_map( 'absint', (array) $ancestors ), true ) ) {
				return true;
			}
		}

		return false;
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_query_product_ids' ) ) {
	function jg_filterbar_mobile_query_product_ids( $filters, $context_term_id = 0, $exclude = '' ) {
		$context_term_id = absint( $context_term_id );
		$exclude         = (string) $exclude;

		$cache_key = 'jgm_qids_' . md5( wp_json_encode( [
			'v'       => function_exists( 'jg_filterbar_mobile_cache_version' ) ? jg_filterbar_mobile_cache_version() : 1,
			'filters' => $filters,
			'ctx'     => $context_term_id,
			'exclude' => $exclude,
		] ) );

		$cached = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return array_map( 'absint', $cached );
		}

		$tax_query = [ 'relation' => 'AND' ];
		$meta_query = [
			'relation' => 'AND',
			[
				'key'     => '_stock_status',
				'value'   => 'instock',
				'compare' => '=',
			],
		];

		if ( $context_term_id > 0 ) {
			$tax_query[] = [
				'taxonomy'         => 'product_cat',
				'field'            => 'term_id',
				'terms'            => [ $context_term_id ],
				'operator'         => 'IN',
				'include_children' => true,
			];
		}

		if ( $exclude !== 'typ' && ! empty( $filters['typ'] ) ) {
			$tax_query[] = [
				'taxonomy'         => 'product_cat',
				'field'            => 'slug',
				'terms'            => array_values( (array) $filters['typ'] ),
				'operator'         => 'IN',
				'include_children' => true,
			];
		}

		if ( $exclude !== 'marke' && ! empty( $filters['marke'] ) ) {
			$tax_query[] = [
				'taxonomy'         => 'pa_marke',
				'field'            => 'slug',
				'terms'            => array_values( (array) $filters['marke'] ),
				'operator'         => 'IN',
				'include_children' => false,
			];
		}

		if ( $exclude !== 'farben' && ! empty( $filters['farben'] ) ) {
			$tax_query[] = [
				'taxonomy'         => 'pa_colorgroup',
				'field'            => 'slug',
				'terms'            => array_values( (array) $filters['farben'] ),
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
			'meta_query'             => $meta_query,
		];

		if ( count( $tax_query ) > 1 ) {
			$args['tax_query'] = $tax_query;
		}

		if ( $exclude !== 'sale' && ! empty( $filters['sale'] ) && function_exists( 'wc_get_product_ids_on_sale' ) ) {
			$sale_ids = array_map( 'absint', (array) wc_get_product_ids_on_sale() );
			$args['post__in'] = ! empty( $sale_ids ) ? $sale_ids : [ 0 ];
		}

		if ( $exclude !== 'new' && ! empty( $filters['new'] ) ) {
			$args['date_query'] = [
				[
					'after'     => gmdate( 'Y-m-d', strtotime( '-30 days' ) ),
					'inclusive' => true,
					'column'    => 'post_date_gmt',
				],
			];
		}

		$product_ids = get_posts( $args );
		$product_ids = array_map( 'absint', (array) $product_ids );

		if ( $exclude !== 'groessen' && ! empty( $filters['groessen'] ) && function_exists( 'jg_wc_get_product_cached' ) && function_exists( 'jg_product_matches_selected_sizes_instock' ) ) {
			$matched = [];
			foreach ( $product_ids as $product_id ) {
				$product = jg_wc_get_product_cached( $product_id );
				if ( jg_product_matches_selected_sizes_instock( $product, $filters['groessen'] ) ) {
					$matched[] = $product_id;
				}
			}
			$product_ids = $matched;
		}

		$product_ids = array_values( array_unique( array_filter( $product_ids ) ) );
		set_transient( $cache_key, $product_ids, 15 * MINUTE_IN_SECONDS );

		return $product_ids;
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_tax_slugs_for_products' ) ) {
	function jg_filterbar_mobile_tax_slugs_for_products( $product_ids, $taxonomy ) {
		$product_ids = array_values( array_filter( array_map( 'absint', (array) $product_ids ) ) );
		if ( empty( $product_ids ) ) {
			return [];
		}

		$cache_key = 'jgm_tax_' . md5( wp_json_encode( [ function_exists( 'jg_filterbar_mobile_cache_version' ) ? jg_filterbar_mobile_cache_version() : 1, $taxonomy, $product_ids ] ) );
		$cached = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		global $wpdb;

		$placeholders = implode( ',', array_fill( 0, count( $product_ids ), '%d' ) );
		$sql = "
			SELECT DISTINCT t.slug
			FROM {$wpdb->terms} t
			INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id
			INNER JOIN {$wpdb->term_relationships} tr ON tr.term_taxonomy_id = tt.term_taxonomy_id
			WHERE tt.taxonomy = %s
			AND tr.object_id IN ($placeholders)
		";

		$params = array_merge( [ $taxonomy ], $product_ids );
		$terms  = $wpdb->get_col( $wpdb->prepare( $sql, $params ) );

		if ( empty( $terms ) ) {
			$terms = [];
		}

		$terms = array_values( array_unique( array_filter( array_map( 'sanitize_title', (array) $terms ) ) ) );
		set_transient( $cache_key, $terms, 15 * MINUTE_IN_SECONDS );

		return $terms;
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_size_slugs_for_products' ) ) {
	function jg_filterbar_mobile_size_slugs_for_products( $product_ids ) {
		$product_ids = array_values( array_filter( array_map( 'absint', (array) $product_ids ) ) );
		if ( empty( $product_ids ) ) {
			return [];
		}

		$cache_key = 'jgm_sizes_' . md5( wp_json_encode( [ function_exists( 'jg_filterbar_mobile_cache_version' ) ? jg_filterbar_mobile_cache_version() : 1, $product_ids ] ) );
		$cached = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$out = [];
		foreach ( $product_ids as $product_id ) {
			if ( function_exists( 'jg_wc_get_product_cached' ) ) {
				$product = jg_wc_get_product_cached( $product_id );
			} else {
				$product = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;
			}

			if ( ! $product ) {
				continue;
			}

			if ( function_exists( 'jg_groessen_filter_get_product_display_sizes' ) ) {
				$out = array_merge( $out, jg_groessen_filter_get_product_display_sizes( $product ) );
				continue;
			}

			foreach ( [ 'pa_int', 'pa_eu', 'pa_groessen' ] as $tax ) {
				$slugs = wc_get_product_terms( $product_id, $tax, [ 'fields' => 'slugs' ] );
				if ( ! is_wp_error( $slugs ) && ! empty( $slugs ) ) {
					$out = array_merge( $out, array_map( 'sanitize_title', (array) $slugs ) );
				}
			}
		}

		$out = array_values( array_unique( array_filter( array_map( 'sanitize_title', $out ) ) ) );
		set_transient( $cache_key, $out, 15 * MINUTE_IN_SECONDS );

		return $out;
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_type_slugs_for_products' ) ) {
	function jg_filterbar_mobile_type_slugs_for_products( $product_ids, $context_term_id ) {
		$product_ids      = array_values( array_filter( array_map( 'absint', (array) $product_ids ) ) );
		$context_term_id  = absint( $context_term_id );
		$available        = [];

		if ( empty( $product_ids ) || ! $context_term_id ) {
			return [];
		}

		$type_terms = get_terms(
			[
				'taxonomy'   => 'product_cat',
				'parent'     => $context_term_id,
				'hide_empty' => false,
			]
		);

		if ( is_wp_error( $type_terms ) || empty( $type_terms ) ) {
			return [];
		}

		foreach ( $type_terms as $type_term ) {
			foreach ( $product_ids as $product_id ) {
				if ( jg_filterbar_mobile_product_has_type_term( $product_id, (int) $type_term->term_id ) ) {
					$available[] = sanitize_title( $type_term->slug );
					break;
				}
			}
		}

		return array_values( array_unique( array_filter( $available ) ) );
	}
}


if ( ! function_exists( 'jg_filterbar_mobile_cache_version' ) ) {
	function jg_filterbar_mobile_cache_version() {
		$version = (int) get_option( 'jg_filterbar_mobile_cache_version', 1 );
		return $version > 0 ? $version : 1;
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_bump_cache_version' ) ) {
	function jg_filterbar_mobile_bump_cache_version() {
		update_option( 'jg_filterbar_mobile_cache_version', time(), false );
	}
}
add_action( 'save_post_product', 'jg_filterbar_mobile_bump_cache_version', 20 );
add_action( 'woocommerce_product_set_stock_status', 'jg_filterbar_mobile_bump_cache_version', 20 );
add_action( 'woocommerce_variation_set_stock_status', 'jg_filterbar_mobile_bump_cache_version', 20 );

if ( ! function_exists( 'jg_filterbar_mobile_ajax_options' ) ) {
	function jg_filterbar_mobile_ajax_options() {
		check_ajax_referer( 'jg_filterbar_mobile_options', 'nonce' );

		$context_term_id = isset( $_POST['context_term_id'] ) ? absint( wp_unslash( $_POST['context_term_id'] ) ) : 0;
		$filters         = jg_filterbar_mobile_current_ajax_filters();

		$response_cache_key = 'jgm_ajax_' . md5( wp_json_encode( [
			'v'       => function_exists( 'jg_filterbar_mobile_cache_version' ) ? jg_filterbar_mobile_cache_version() : 1,
			'ctx'     => $context_term_id,
			'filters' => $filters,
		] ) );
		$cached_response = get_transient( $response_cache_key );
		if ( is_array( $cached_response ) ) {
			wp_send_json_success( $cached_response );
		}

		$ids_for_marke    = jg_filterbar_mobile_query_product_ids( $filters, $context_term_id, 'marke' );
		$ids_for_farben   = jg_filterbar_mobile_query_product_ids( $filters, $context_term_id, 'farben' );
		$ids_for_groessen = jg_filterbar_mobile_query_product_ids( $filters, $context_term_id, 'groessen' );
		$ids_for_typ      = jg_filterbar_mobile_query_product_ids( $filters, $context_term_id, 'typ' );
		$ids_for_sale     = jg_filterbar_mobile_query_product_ids( $filters, $context_term_id, 'sale' );
		$ids_for_new      = jg_filterbar_mobile_query_product_ids( $filters, $context_term_id, 'new' );

		$sale_available = false;
		if ( function_exists( 'wc_get_product_ids_on_sale' ) ) {
			$sale_ids = array_map( 'absint', (array) wc_get_product_ids_on_sale() );
			$sale_available = ! empty( array_intersect( array_map( 'absint', (array) $ids_for_sale ), $sale_ids ) );
		}

		$new_available = false;
		if ( ! empty( $ids_for_new ) ) {
			$new_ids = get_posts( [
				'post_type'      => 'product',
				'post_status'    => 'publish',
				'fields'         => 'ids',
				'posts_per_page' => 1,
				'no_found_rows'  => true,
				'post__in'       => array_map( 'absint', (array) $ids_for_new ),
				'date_query'     => [
					[
						'after'     => gmdate( 'Y-m-d', strtotime( '-30 days' ) ),
						'inclusive' => true,
						'column'    => 'post_date_gmt',
					],
				],
			] );
			$new_available = ! empty( $new_ids );
		}

		$response = [
			'available' => [
				'marke'    => jg_filterbar_mobile_tax_slugs_for_products( $ids_for_marke, 'pa_marke' ),
				'farben'   => jg_filterbar_mobile_tax_slugs_for_products( $ids_for_farben, 'pa_colorgroup' ),
				'groessen' => jg_filterbar_mobile_size_slugs_for_products( $ids_for_groessen ),
				'typ'      => jg_filterbar_mobile_type_slugs_for_products( $ids_for_typ, $context_term_id ),
				'sale'     => $sale_available,
				'new'      => $new_available,
			],
		];

		set_transient( $response_cache_key, $response, 15 * MINUTE_IN_SECONDS );

		wp_send_json_success( $response );
	}
}

add_action( 'wp_ajax_jg_filterbar_mobile_options', 'jg_filterbar_mobile_ajax_options' );
add_action( 'wp_ajax_nopriv_jg_filterbar_mobile_options', 'jg_filterbar_mobile_ajax_options' );

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
		$selected_typ      = function_exists( 'jg_get_list_param' ) ? jg_get_list_param( 'jg_filter_typ' ) : [];
		$selected_orderby  = isset( $_GET['orderby'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['orderby'] ) ) : '';

		$sale_on = ( ! empty( $_GET['jg_sale'] ) && $_GET['jg_sale'] === '1' );
		$new_on  = ( ! empty( $_GET['jg_new'] ) && $_GET['jg_new'] === '1' );

		// NEU und SALE werden immer angezeigt. Wenn aktuell keine passenden Produkte vorhanden sind,
		// werden sie nur deaktiviert/ausgegraut, aber niemals ausgeblendet.
		$sale_available = function_exists( 'jg_has_sale_products_in_context' ) ? jg_has_sale_products_in_context() : true;
		$new_available  = function_exists( 'jg_has_new_products_in_context' ) ? jg_has_new_products_in_context() : true;

		$typ_items     = [];
		$typ_active_id = 0;
		$typ_base_link = '';
		$typ_context_term_id = 0;

		if ( is_product_category() ) {
			$current_term = get_queried_object();

			if ( $current_term && ! empty( $current_term->term_id ) && $current_term->taxonomy === 'product_cat' ) {
				$current_id = (int) $current_term->term_id;
				$ancestors  = get_ancestors( $current_id, 'product_cat' );
				$depth_rel  = is_array( $ancestors ) ? count( $ancestors ) : 0;

				if ( $depth_rel > 0 ) {
					$level2_id = ( $depth_rel === 1 ) ? $current_id : (int) $current_term->parent;

					if ( $level2_id > 0 ) {
						$typ_context_term_id = (int) $level2_id;
						$level2_link = get_term_link( $level2_id, 'product_cat' );
						if ( ! is_wp_error( $level2_link ) ) {
							$typ_base_link = $level2_link;
						}

						$typ_items = get_terms(
							[
								'taxonomy'   => 'product_cat',
								'parent'     => $level2_id,
								'hide_empty' => true,
								'orderby'    => 'menu_order',
								'order'      => 'ASC',
							]
						);

						if ( is_wp_error( $typ_items ) || count( $typ_items ) < 2 ) {
							$typ_items = [];
						}

						if ( $depth_rel >= 2 ) {
							$typ_active_id = $current_id;
						}
					}
				}
			}
		}


		/*
		 * Wenn wir uns bereits auf einer Typ-Kategorie befinden, ist diese Kategorie
		 * die Wahrheit. Das verhindert, dass ein alter/staler jg_filter_typ-Parameter
		 * aus dem Browser-Back-Cache fälschlicherweise einen anderen Typ anhakt.
		 */
		if ( $typ_active_id > 0 ) {
			$typ_active_term = get_term( $typ_active_id, 'product_cat' );
			if ( $typ_active_term && ! is_wp_error( $typ_active_term ) && ! empty( $typ_active_term->slug ) ) {
				$selected_typ = [ sanitize_title( $typ_active_term->slug ) ];
			}
		}

		/*
		 * Performance V3.2:
		 * Beim Seitenaufbau KEINE Produktmenge/Variationen mehr berechnen.
		 * Wir rendern die grundsätzlich vorhandenen Begriffe leichtgewichtig.
		 * Die kontextbezogene Verfügbarkeit wird erst beim Öffnen des Filters per AJAX aktualisiert.
		 */
		$terms_marke = get_terms(
			[
				'taxonomy'   => $tax_marke,
				'hide_empty' => true,
				'orderby'    => 'name',
				'order'      => 'ASC',
			]
		);
		if ( is_wp_error( $terms_marke ) ) {
			$terms_marke = [];
		}

		$terms_farben = get_terms(
			[
				'taxonomy'   => $tax_farben,
				'hide_empty' => true,
				'orderby'    => 'name',
				'order'      => 'ASC',
			]
		);
		if ( is_wp_error( $terms_farben ) ) {
			$terms_farben = [];
		}

		$terms_groessen_int = [];
		$terms_groessen_eu  = [];
		if ( function_exists( 'jg_groessen_filter_allowed_rows' ) ) {
			$allowed_rows = jg_groessen_filter_allowed_rows();

			foreach ( (array) $allowed_rows['int'] as $slug => $label ) {
				$terms_groessen_int[] = (object) [ 'slug' => sanitize_title( $slug ), 'name' => (string) $label ];
			}

			foreach ( (array) $allowed_rows['eu'] as $slug => $label ) {
				$terms_groessen_eu[] = (object) [ 'slug' => sanitize_title( $slug ), 'name' => (string) $label ];
			}
		}

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
		<div
			class="jgm-filterbar"
			data-jgm-filterbar="1"
			data-jgm-type-base-url="<?php echo esc_url( $typ_base_link ); ?>"
			data-jgm-context-term-id="<?php echo esc_attr( (string) $typ_context_term_id ); ?>"
			data-jgm-ajax-url="<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>"
			data-jgm-ajax-nonce="<?php echo esc_attr( wp_create_nonce( 'jg_filterbar_mobile_options' ) ); ?>"
			role="navigation"
			aria-label="Filter mobil"
		>
			<span class="jgm-sr-only" aria-live="polite" aria-atomic="true" data-jgm-live-region></span>

			<button class="jgm-btn" type="button" data-jgm-panel="jgm-panel-filter" aria-haspopup="dialog" aria-controls="jgm-panel-filter" aria-expanded="false" aria-label="Filter öffnen">
				<span>FILTER <span class="jgm-filter-count" data-jgm-filter-count></span></span>
				<span class="jgm-chev" aria-hidden="true">▾</span>
			</button>

			<button class="jgm-btn" type="button" data-jgm-panel="jgm-panel-sort" aria-haspopup="dialog" aria-controls="jgm-panel-sort" aria-expanded="false" aria-label="Sortierung öffnen">
				<span>SORTIEREN</span><span class="jgm-chev" aria-hidden="true">▾</span>
			</button>

			<div class="jgm-panel" id="jgm-panel-filter" role="dialog" aria-labelledby="jgm-panel-filter-title" aria-modal="false" aria-hidden="true">
				<div class="jgm-panel-inner">
					<div class="jgm-panel-head">
						<h2 class="jgm-panel-title" id="jgm-panel-filter-title">FILTER</h2>
						<button class="jgm-panel-close" type="button" data-jgm-close aria-label="Schließen">✕</button>
					</div>

					<div class="jgm-mobile-sections">

						<div class="jgm-mobile-section jgm-mobile-section-special">
							<div class="jgm-special-filter-list">
								<?php $new_disabled = ( ! $new_available && ! $new_on ); ?>
								<button
									type="button"
									class="jgm-special-filter<?php echo $new_on ? ' is-active' : ''; ?><?php echo $new_disabled ? ' jgm-option-unavailable' : ''; ?>"
									data-jgm-toggle-query="jg_new"
									aria-pressed="<?php echo $new_on ? 'true' : 'false'; ?>"
									<?php disabled( $new_disabled ); ?>
								>
									NEU
								</button>

								<?php $sale_disabled = ( ! $sale_available && ! $sale_on ); ?>
								<button
									type="button"
									class="jgm-special-filter<?php echo $sale_on ? ' is-active' : ''; ?><?php echo $sale_disabled ? ' jgm-option-unavailable' : ''; ?>"
									data-jgm-toggle-query="jg_sale"
									aria-pressed="<?php echo $sale_on ? 'true' : 'false'; ?>"
									<?php disabled( $sale_disabled ); ?>
								>
									SALE
								</button>
							</div>
						</div>

						<?php if ( ! empty( $typ_items ) ) : ?>
						<div class="jgm-mobile-section">
							<button type="button" class="jgm-section-toggle" data-jgm-section-toggle aria-expanded="false" aria-controls="jgm-section-typ">
								<span>TYP</span>
								<span aria-hidden="true">+</span>
							</button>
							<div class="jgm-section-content" id="jgm-section-typ" hidden>
								<div class="jgm-type-list">
									<?php foreach ( $typ_items as $typ_term ) : ?>
										<?php
										$typ_link = get_term_link( $typ_term );
										if ( is_wp_error( $typ_link ) ) {
											continue;
										}

										$typ_slug      = sanitize_title( $typ_term->slug );
										$is_typ_active = in_array( $typ_slug, $selected_typ, true ) || ( $typ_active_id && ( (int) $typ_term->term_id === (int) $typ_active_id ) );
										?>
										<label class="jgm-checkrow<?php echo $is_typ_active ? ' is-active' : ''; ?>">
											<input
												type="checkbox"
												class="jgm-check"
												data-jgm-filter="jg_filter_typ"
												data-jgm-typ-url="<?php echo esc_url( $typ_link ); ?>"
												value="<?php echo esc_attr( $typ_slug ); ?>"
												<?php checked( $is_typ_active ); ?>
											/>
											<span class="jgm-checkbox-ui" aria-hidden="true"></span>
											<span><?php echo esc_html( $typ_term->name ); ?></span>
										</label>
									<?php endforeach; ?>
								</div>
							</div>
						</div>
						<?php endif; ?>

						<?php if ( ! empty( $color_items ) ) : ?>
						<div class="jgm-mobile-section">
							<button type="button" class="jgm-section-toggle" data-jgm-section-toggle aria-expanded="true" aria-controls="jgm-section-farbe">
								<span>FARBE</span>
								<span aria-hidden="true">−</span>
							</button>
							<div class="jgm-section-content" id="jgm-section-farbe">
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
											<span class="jgm-color-name" aria-hidden="true"><?php echo esc_html( $t->name ); ?></span>
											<span class="jgm-sr-only"><?php echo esc_html( $t->name ); ?></span>
										</button>
									<?php endforeach; ?>
								</div>
							</div>
						</div>
						<?php endif; ?>

						<?php if ( ! empty( $terms_groessen_int ) || ! empty( $terms_groessen_eu ) ) : ?>
						<div class="jgm-mobile-section">
							<button type="button" class="jgm-section-toggle" data-jgm-section-toggle aria-expanded="true" aria-controls="jgm-section-groesse">
								<span>GRÖSSE</span>
								<span aria-hidden="true">−</span>
							</button>
							<div class="jgm-section-content" id="jgm-section-groesse">
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
						</div>
						<?php endif; ?>

						<?php if ( ! empty( $terms_marke ) ) : ?>
						<div class="jgm-mobile-section">
							<button type="button" class="jgm-section-toggle" data-jgm-section-toggle aria-expanded="false" aria-controls="jgm-section-marke">
								<span>MARKE</span>
								<span aria-hidden="true">+</span>
							</button>
							<div class="jgm-section-content" id="jgm-section-marke" hidden>
								<div class="jgm-brand-list">
									<?php foreach ( $terms_marke as $t ) : ?>
										<?php
										$slug    = sanitize_title( $t->slug );
										$checked = in_array( $slug, $selected_marke, true );
										?>
										<label class="jgm-checkrow<?php echo $checked ? ' is-active' : ''; ?>">
											<input type="checkbox" class="jgm-check" data-jgm-filter="jg_filter_marke" data-jgm-available-key="marke" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $checked ); ?> />
											<span class="jgm-checkbox-ui" aria-hidden="true"></span>
											<span><?php echo esc_html( $t->name ); ?></span>
										</label>
									<?php endforeach; ?>
								</div>
							</div>
						</div>
						<?php endif; ?>

					</div>

					<div class="jgm-actions">
						<button type="button" class="jgm-reset" data-jgm-reset-filter="1">FILTER ZURÜCKSETZEN</button>
						<button type="button" class="jgm-apply" data-jgm-apply-filter="1">ANWENDEN</button>
					</div>
				</div>
			</div>

			<div class="jgm-panel jgm-panel-sort" id="jgm-panel-sort" role="dialog" aria-labelledby="jgm-panel-sort-title" aria-modal="false" aria-hidden="true">
				<div class="jgm-panel-inner">
					<div class="jgm-panel-head">
						<h2 class="jgm-panel-title" id="jgm-panel-sort-title">SORTIEREN</h2>
						<button class="jgm-panel-close" type="button" data-jgm-close aria-label="Schließen">✕</button>
					</div>
					<div class="jgm-sort-list" aria-label="Sortieroptionen">
						<button type="button" class="jgm-sort-option" data-jgm-orderby="price" aria-pressed="<?php echo $selected_orderby === 'price' ? 'true' : 'false'; ?>">PREIS AUFSTEIGEND</button>
						<button type="button" class="jgm-sort-option" data-jgm-orderby="price-desc" aria-pressed="<?php echo $selected_orderby === 'price-desc' ? 'true' : 'false'; ?>">PREIS ABSTEIGEND</button>
					</div>
					<div class="jgm-actions">
						<button type="button" class="jgm-reset" data-jgm-reset-orderby="1">Sortierung zurücksetzen</button>
					</div>
				</div>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}
}



if ( ! function_exists( 'jg_filterbar_mobile_typ_pre_get_posts' ) ) {
	function jg_filterbar_mobile_typ_pre_get_posts( $q ) {
		if ( is_admin() || ! $q->is_main_query() ) {
			return;
		}

		if ( ! ( is_shop() || is_product_taxonomy() || is_product_category() || is_product_tag() ) ) {
			return;
		}

		$selected_typ = function_exists( 'jg_get_list_param' ) ? jg_get_list_param( 'jg_filter_typ' ) : [];
		if ( empty( $selected_typ ) ) {
			return;
		}

		$tax_query = $q->get( 'tax_query' );
		if ( ! is_array( $tax_query ) ) {
			$tax_query = [];
		}

		$tax_query[] = [
			'taxonomy'         => 'product_cat',
			'field'            => 'slug',
			'terms'            => $selected_typ,
			'operator'         => 'IN',
			'include_children' => true,
		];

		$tax_query = array_values( $tax_query );
		array_unshift( $tax_query, [ 'relation' => 'AND' ] );
		$q->set( 'tax_query', $tax_query );
	}
}
add_action( 'pre_get_posts', 'jg_filterbar_mobile_typ_pre_get_posts', 25 );



if ( ! function_exists( 'jg_filterbar_mobile_get_type_arg_for_current_archive' ) ) {
	function jg_filterbar_mobile_get_type_arg_for_current_archive() {
		$selected_typ = function_exists( 'jg_get_list_param' ) ? jg_get_list_param( 'jg_filter_typ' ) : [];

		if ( ! empty( $selected_typ ) ) {
			return implode( ',', array_map( 'sanitize_title', $selected_typ ) );
		}

		if ( is_product_category() ) {
			$current_term = get_queried_object();

			if ( $current_term && ! empty( $current_term->term_id ) && $current_term->taxonomy === 'product_cat' ) {
				$ancestors = get_ancestors( (int) $current_term->term_id, 'product_cat' );
				$depth_rel = is_array( $ancestors ) ? count( $ancestors ) : 0;

				// Ebene unterhalb der Typ-Übersicht, z. B. Blusen -> 3/4-Arm-Blusen.
				if ( $depth_rel >= 2 ) {
					return sanitize_title( $current_term->slug );
				}
			}
		}

		return '';
	}
}

if ( ! function_exists( 'jg_filterbar_mobile_preserve_type_on_product_links' ) ) {
	function jg_filterbar_mobile_preserve_type_on_product_links( $permalink, $post ) {
		if ( is_admin() || ! $post || $post->post_type !== 'product' ) {
			return $permalink;
		}

		if ( ! ( is_shop() || is_product_taxonomy() || is_product_category() || is_product_tag() ) ) {
			return $permalink;
		}

		$type_arg = jg_filterbar_mobile_get_type_arg_for_current_archive();
		if ( $type_arg === '' ) {
			return $permalink;
		}

		return add_query_arg( 'jg_filter_typ', $type_arg, $permalink );
	}
}
add_filter( 'post_type_link', 'jg_filterbar_mobile_preserve_type_on_product_links', 20, 2 );

if ( ! function_exists( 'jg_filterbar_mobile_preserve_type_on_breadcrumbs' ) ) {
	function jg_filterbar_mobile_preserve_type_on_breadcrumbs( $crumbs, $breadcrumb ) {
		if ( ! is_product() || empty( $crumbs ) || ! is_array( $crumbs ) ) {
			return $crumbs;
		}

		$selected_typ = function_exists( 'jg_get_list_param' ) ? jg_get_list_param( 'jg_filter_typ' ) : [];
		if ( empty( $selected_typ ) ) {
			return $crumbs;
		}

		$type_arg = implode( ',', array_map( 'sanitize_title', $selected_typ ) );

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
				$crumbs[ $index ][1] = add_query_arg( 'jg_filter_typ', $type_arg, $url );
			}
		}

		return $crumbs;
	}
}
add_filter( 'woocommerce_get_breadcrumb', 'jg_filterbar_mobile_preserve_type_on_breadcrumbs', 20, 2 );

add_shortcode( 'jg_filterbar_mobile', 'jg_filterbar_mobile_shortcode' );
add_shortcode( 'filterbar-mobile', 'jg_filterbar_mobile_shortcode' );