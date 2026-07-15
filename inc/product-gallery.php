<?php
/**
 * Jeans Gluth – individuelle Sortierung der Produktarchive
 *
 * Sortierung:
 *
 * 1. Produkte mit aktivem Woodmart-„NEU“-Label
 * 2. Innerhalb davon nach Kategoriepriorität
 * 3. Danach ältere Produkte
 * 4. Innerhalb davon erneut nach Kategoriepriorität
 * 5. Innerhalb jeder Gruppe nach Veröffentlichungsdatum absteigend
 *
 * Der Code greift nur bei „Neueste zuerst“.
 */

defined( 'ABSPATH' ) || exit;


/**
 * Cache-Schlüssel für die aktuell als „NEU“ erkannten Produkte.
 */
function jg_new_product_sort_cache_key() {
	return 'jg_new_product_sort_ids_v1';
}


/**
 * Ermittelt anhand der originalen Woodmart-Funktion,
 * welche Produkte aktuell das „NEU“-Label erhalten.
 *
 * Das Ergebnis wird zwischengespeichert, damit nicht bei jedem
 * Seitenaufruf alle Produkte erneut geprüft werden müssen.
 */
function jg_get_woodmart_new_product_ids() {

	$cache_key = jg_new_product_sort_cache_key();
	$cached    = get_transient( $cache_key );

	if ( false !== $cached && is_array( $cached ) ) {
		return array_map( 'absint', $cached );
	}

	$product_ids = get_posts(
		array(
			'post_type'              => 'product',
			'post_status'            => 'publish',
			'posts_per_page'         => -1,
			'fields'                 => 'ids',
			'orderby'                => 'ID',
			'order'                  => 'ASC',
			'no_found_rows'          => true,
			'suppress_filters'       => false,
			'update_post_meta_cache' => true,
			'update_post_term_cache' => false,
		)
	);

	$new_product_ids = array();

	foreach ( $product_ids as $product_id ) {

		/*
		 * Woodmarts originale Prüfung verwenden.
		 * Dadurch entspricht die Sortierung dem sichtbaren NEU-Kreis.
		 */
		if (
			function_exists( 'woodmart_is_new_label_needed' )
			&& woodmart_is_new_label_needed( $product_id )
		) {
			$new_product_ids[] = absint( $product_id );
			continue;
		}

		/*
		 * Fallback für ältere Woodmart-Versionen.
		 */
		if ( ! function_exists( 'woodmart_is_new_label_needed' ) ) {
			$permanent_new = get_post_meta(
				$product_id,
				'_woodmart_new_label',
				true
			);

			if ( ! empty( $permanent_new ) ) {
				$new_product_ids[] = absint( $product_id );
			}
		}
	}

	/*
	 * Kurzer Cache, damit ablaufende NEU-Zeiträume zeitnah
	 * berücksichtigt werden.
	 */
	set_transient(
		$cache_key,
		$new_product_ids,
		15 * MINUTE_IN_SECONDS
	);

	return $new_product_ids;
}


/**
 * Gibt alle term_taxonomy_ids einer Produktkategorie
 * einschließlich ihrer Unterkategorien zurück.
 *
 * Das ist wichtig, weil Produkte häufig nur der konkreten
 * Unterkategorie zugeordnet sind, beispielsweise „T-Shirts“,
 * nicht zusätzlich der Oberkategorie „Shirts & Tops“.
 */
function jg_get_product_category_tree_tt_ids( $slug ) {

	static $category_cache = array();

	if ( isset( $category_cache[ $slug ] ) ) {
		return $category_cache[ $slug ];
	}

	$term = get_term_by( 'slug', $slug, 'product_cat' );

	if ( ! $term || is_wp_error( $term ) ) {
		$category_cache[ $slug ] = array();
		return array();
	}

	$term_ids = array( absint( $term->term_id ) );
	$children = get_term_children( $term->term_id, 'product_cat' );

	if ( ! is_wp_error( $children ) && ! empty( $children ) ) {
		$term_ids = array_merge(
			$term_ids,
			array_map( 'absint', $children )
		);
	}

	$terms = get_terms(
		array(
			'taxonomy'   => 'product_cat',
			'include'    => array_unique( $term_ids ),
			'hide_empty' => false,
		)
	);

	$taxonomy_ids = array();

	if ( ! is_wp_error( $terms ) ) {
		foreach ( $terms as $category_term ) {
			$taxonomy_ids[] = absint(
				$category_term->term_taxonomy_id
			);
		}
	}

	$category_cache[ $slug ] = array_unique( $taxonomy_ids );

	return $category_cache[ $slug ];
}


/**
 * Baut die SQL-Bedingung für eine Kategorie inklusive Unterkategorien.
 */
function jg_product_has_category_sql( $taxonomy_ids, $alias ) {
	global $wpdb;

	$taxonomy_ids = array_filter(
		array_map( 'absint', (array) $taxonomy_ids )
	);

	if ( empty( $taxonomy_ids ) ) {
		return '0 = 1';
	}

	$id_list = implode( ',', $taxonomy_ids );

	return "
		EXISTS (
			SELECT 1
			FROM {$wpdb->term_relationships} AS {$alias}
			WHERE {$alias}.object_id = {$wpdb->posts}.ID
			  AND {$alias}.term_taxonomy_id IN ({$id_list})
		)
	";
}


/**
 * Die WooCommerce-Produktabfrage für unsere Sortierung markieren.
 */
add_action(
	'woocommerce_product_query',
	function ( $query ) {

		if ( is_admin() && ! wp_doing_ajax() ) {
			return;
		}

		/*
		 * Nur Produktarchive beeinflussen.
		 */
		if (
			! is_shop()
			&& ! is_product_taxonomy()
			&& ! wp_doing_ajax()
		) {
			return;
		}

		$requested_orderby = isset( $_GET['orderby'] )
			? wc_clean( wp_unslash( $_GET['orderby'] ) )
			: '';

		if ( '' === $requested_orderby ) {
			$requested_orderby = get_option(
				'woocommerce_default_catalog_orderby',
				'menu_order'
			);
		}

		/*
		 * Nur bei „Neueste zuerst“ eingreifen.
		 * Preis, Beliebtheit, Bewertung usw. bleiben unverändert.
		 */
		if ( 'date' !== $requested_orderby ) {
			return;
		}

		$query->set( 'jg_custom_archive_sort', true );
	},
	50
);


/**
 * Eigentliche SQL-Sortierung.
 */
add_filter(
	'posts_clauses',
	function ( $clauses, $query ) {
		global $wpdb;

		if ( ! $query->get( 'jg_custom_archive_sort' ) ) {
			return $clauses;
		}

		/*
		 * Kategoriegruppen inklusive aller Unterkategorien.
		 *
		 * Damen:
		 * 10 Shirts & Tops
		 * 20 Blusen
		 * 30 Kleider
		 * 40 Pullover & Strick
		 * 50 Röcke
		 * 500 Sonstige
		 * 999 Accessoires
		 *
		 * Herren:
		 * 10 Shirts
		 * 20 Poloshirts
		 * 30 Hemden
		 * 500 Sonstige
		 * 999 Accessoires
		 */

		$damen_accessoires = jg_get_product_category_tree_tt_ids(
			'accessoires-damen'
		);

		$herren_accessoires = jg_get_product_category_tree_tt_ids(
			'accessoires-herren'
		);

		$damen_shirts = jg_get_product_category_tree_tt_ids(
			'shirts-tops'
		);

		$damen_blusen = jg_get_product_category_tree_tt_ids(
			'bluse-damen'
		);

		$damen_kleider = jg_get_product_category_tree_tt_ids(
			'kleid'
		);

		$damen_pullover = jg_get_product_category_tree_tt_ids(
			'pullover_strick'
		);

		$damen_roecke = jg_get_product_category_tree_tt_ids(
			'rock'
		);

		$herren_shirts = jg_get_product_category_tree_tt_ids(
			'shirts'
		);

		$herren_poloshirts = jg_get_product_category_tree_tt_ids(
			'poloshirts'
		);

		$herren_hemden = jg_get_product_category_tree_tt_ids(
			'hemden'
		);


		/*
		 * NEU-Produkte über die originale Woodmart-Prüfung bestimmen.
		 */
		$new_product_ids = jg_get_woodmart_new_product_ids();

		if ( ! empty( $new_product_ids ) ) {
			$new_ids_sql = implode(
				',',
				array_map( 'absint', $new_product_ids )
			);

			$new_priority_sql = "
				CASE
					WHEN {$wpdb->posts}.ID IN ({$new_ids_sql})
					THEN 0
					ELSE 1
				END ASC
			";
		} else {
			$new_priority_sql = '1 ASC';
		}


		/*
		 * Kategoriebedingungen vorbereiten.
		 *
		 * Accessoires werden zuerst geprüft, damit sie auch dann
		 * hinten landen, wenn ein Produkt zusätzlich noch einer
		 * anderen Kategorie zugeordnet wurde.
		 *
		 * Poloshirts werden vor Shirts geprüft, weil Poloshirts
		 * eine Unterkategorie von Shirts sein können.
		 */
		$accessoires_sql = '('
			. jg_product_has_category_sql(
				$damen_accessoires,
				'jg_tr_acc_d'
			)
			. ' OR '
			. jg_product_has_category_sql(
				$herren_accessoires,
				'jg_tr_acc_h'
			)
			. ')';

		$herren_poloshirts_sql = jg_product_has_category_sql(
			$herren_poloshirts,
			'jg_tr_h_polo'
		);

		$damen_shirts_sql = jg_product_has_category_sql(
			$damen_shirts,
			'jg_tr_d_shirts'
		);

		$herren_shirts_sql = jg_product_has_category_sql(
			$herren_shirts,
			'jg_tr_h_shirts'
		);

		$damen_blusen_sql = jg_product_has_category_sql(
			$damen_blusen,
			'jg_tr_d_blusen'
		);

		$herren_hemden_sql = jg_product_has_category_sql(
			$herren_hemden,
			'jg_tr_h_hemden'
		);

		$damen_kleider_sql = jg_product_has_category_sql(
			$damen_kleider,
			'jg_tr_d_kleider'
		);

		$damen_pullover_sql = jg_product_has_category_sql(
			$damen_pullover,
			'jg_tr_d_pullover'
		);

		$damen_roecke_sql = jg_product_has_category_sql(
			$damen_roecke,
			'jg_tr_d_roecke'
		);


		/*
		 * Kategoriepriorität.
		 */
		$category_priority_sql = "
			CASE
				WHEN {$accessoires_sql}
					THEN 999

				WHEN {$herren_poloshirts_sql}
					THEN 20

				WHEN {$damen_shirts_sql}
					THEN 10

				WHEN {$herren_shirts_sql}
					THEN 10

				WHEN {$damen_blusen_sql}
					THEN 20

				WHEN {$herren_hemden_sql}
					THEN 30

				WHEN {$damen_kleider_sql}
					THEN 30

				WHEN {$damen_pullover_sql}
					THEN 40

				WHEN {$damen_roecke_sql}
					THEN 50

				ELSE 500
			END ASC
		";


		/*
		 * Endgültige Reihenfolge:
		 *
		 * 1. NEU / Alt
		 * 2. Kategoriepriorität
		 * 3. Veröffentlichungsdatum
		 * 4. Produkt-ID als eindeutige Zusatzsortierung
		 */
		$clauses['orderby'] = "
			{$new_priority_sql},
			{$category_priority_sql},
			{$wpdb->posts}.post_date DESC,
			{$wpdb->posts}.ID DESC
		";

		return $clauses;
	},
	100,
	2
);


/**
 * Cache löschen, sobald sich ein Produkt ändert.
 */
function jg_clear_new_product_sort_cache() {
	delete_transient( jg_new_product_sort_cache_key() );
}

add_action(
	'save_post_product',
	'jg_clear_new_product_sort_cache',
	20
);

add_action(
	'deleted_post',
	'jg_clear_new_product_sort_cache',
	20
);

add_action(
	'woocommerce_update_product',
	'jg_clear_new_product_sort_cache',
	20
);