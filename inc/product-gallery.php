<?php

add_action( 'wp_footer', function () {
	echo '<div style="
		position:fixed;
		bottom:20px;
		left:20px;
		background:red;
		color:#fff;
		padding:20px;
		z-index:999999;
	">
		FUNCTIONS.PHP LÄUFT
	</div>';
} );



/**
 * Jeans Gluth – individuelle Produktsortierung
 *
 * Reihenfolge:
 *
 * 1. Produkte, die maximal 30 Tage alt sind
 * 2. Innerhalb der neuen Produkte nach Kategorie
 * 3. Danach alle älteren Produkte
 * 4. Innerhalb der älteren Produkte dieselbe Kategorie-Reihenfolge
 * 5. Innerhalb jeder Gruppe neuestes Veröffentlichungsdatum zuerst
 *
 * Greift nur auf den Archiven Damen und Herren.
 */

add_filter( 'posts_clauses', 'jg_custom_product_archive_order', 999, 2 );

function jg_custom_product_archive_order( $clauses, $query ) {
	global $wpdb;

	/*
	 * Backend-Abfragen nicht verändern.
	 * AJAX muss erlaubt bleiben, weil Woodmart AJAX Shop verwendet.
	 */
	if ( is_admin() && ! wp_doing_ajax() ) {
		return $clauses;
	}

	/*
	 * Nur Produktabfragen bearbeiten.
	 */
	$post_type = $query->get( 'post_type' );

	if (
		'product' !== $post_type &&
		! ( is_array( $post_type ) && in_array( 'product', $post_type, true ) )
	) {
		return $clauses;
	}

	/*
	 * Ermitteln, ob wir uns im Damen- oder Herrenbereich befinden.
	 */
	$archive_type = jg_get_product_archive_type( $query );

	if ( ! in_array( $archive_type, array( 'damen', 'herren' ), true ) ) {
		return $clauses;
	}

	/*
	 * Nur bei "Neueste zuerst" beziehungsweise der bei dir
	 * eingestellten Standardsortierung eingreifen.
	 */
	$orderby = isset( $_REQUEST['orderby'] )
		? sanitize_key( wp_unslash( $_REQUEST['orderby'] ) )
		: '';

	if ( '' === $orderby ) {
		$orderby = get_option(
			'woocommerce_default_catalog_orderby',
			'date'
		);
	}

	if ( 'date' !== $orderby ) {
		return $clauses;
	}

	/*
	 * Woodmart-Neu-Zeitraum:
	 * 30 Tage nach Erstellung/Veröffentlichung.
	 */
	$cutoff_timestamp = current_time( 'timestamp' ) - ( 30 * DAY_IN_SECONDS );
	$cutoff_date      = wp_date(
		'Y-m-d H:i:s',
		$cutoff_timestamp,
		wp_timezone()
	);

	$new_priority_sql = $wpdb->prepare(
		"
		CASE
			WHEN {$wpdb->posts}.post_date >= %s THEN 0
			ELSE 1
		END ASC
		",
		$cutoff_date
	);

	if ( 'damen' === $archive_type ) {

		/*
		 * Damen:
		 * 10 Shirts & Tops
		 * 20 Blusen
		 * 30 Kleider
		 * 40 Pullover & Strick
		 * 50 Röcke
		 * 500 sonstige Produkte
		 * 999 Accessoires
		 */
		$category_priority_sql = jg_build_category_priority_sql(
			array(
				'accessoires-damen' => 999,
				'shirts-tops'       => 10,
				'bluse-damen'       => 20,
				'kleid'             => 30,
				'pullover_strick'   => 40,
				'rock'              => 50,
			)
		);

	} else {

		/*
		 * Herren:
		 * 10 Shirts
		 * 20 Poloshirts
		 * 30 Hemden
		 * 500 sonstige Produkte
		 * 999 Accessoires
		 */
		$category_priority_sql = jg_build_category_priority_sql(
			array(
				'accessoires-herren' => 999,
				'shirts'             => 10,
				'poloshirts'         => 20,
				'hemden'             => 30,
			)
		);
	}

	/*
	 * Endgültige Reihenfolge:
	 *
	 * 1. Neu oder alt
	 * 2. Kategoriepriorität
	 * 3. Veröffentlichungsdatum
	 * 4. Produkt-ID
	 */
	$clauses['orderby'] = "
		{$new_priority_sql},
		{$category_priority_sql},
		{$wpdb->posts}.post_date DESC,
		{$wpdb->posts}.ID DESC
	";

	return $clauses;
}


/**
 * Erkennt, ob die aktuelle Produktabfrage zum Damen-
 * oder Herrenarchiv gehört.
 */
function jg_get_product_archive_type( $query ) {

	$category_slug = '';

	/*
	 * Reguläres Produktkategorie-Archiv.
	 */
	if ( is_product_category() ) {
		$queried_object = get_queried_object();

		if (
			$queried_object instanceof WP_Term &&
			'product_cat' === $queried_object->taxonomy
		) {
			$category_slug = $queried_object->slug;
		}
	}

	/*
	 * Fallback für Woodmart-AJAX-Abfragen.
	 */
	if ( '' === $category_slug ) {
		$query_product_cat = $query->get( 'product_cat' );

		if ( is_string( $query_product_cat ) ) {
			$category_slug = sanitize_title( $query_product_cat );
		}
	}

	/*
	 * Noch ein Fallback für übertragene Request-Parameter.
	 */
	if ( '' === $category_slug && isset( $_REQUEST['product_cat'] ) ) {
		$category_slug = sanitize_title(
			wp_unslash( $_REQUEST['product_cat'] )
		);
	}

	if ( '' === $category_slug ) {
		return '';
	}

	$term = get_term_by(
		'slug',
		$category_slug,
		'product_cat'
	);

	if ( ! $term || is_wp_error( $term ) ) {
		return '';
	}

	$term_ids = array( (int) $term->term_id );

	$ancestors = get_ancestors(
		$term->term_id,
		'product_cat',
		'taxonomy'
	);

	if ( ! empty( $ancestors ) ) {
		$term_ids = array_merge(
			$term_ids,
			array_map( 'intval', $ancestors )
		);
	}

	foreach ( $term_ids as $term_id ) {
		$category = get_term( $term_id, 'product_cat' );

		if ( ! $category || is_wp_error( $category ) ) {
			continue;
		}

		if ( 'damen' === $category->slug ) {
			return 'damen';
		}

		if ( 'herren' === $category->slug ) {
			return 'herren';
		}
	}

	return '';
}


/**
 * Erstellt den SQL-CASE-Ausdruck für die Kategorieprioritäten.
 *
 * Auch Unterkategorien werden berücksichtigt.
 */
function jg_build_category_priority_sql( $category_priorities ) {
	global $wpdb;

	$case_parts = array();

	foreach ( $category_priorities as $slug => $priority ) {
		$term_taxonomy_ids = jg_get_category_tree_tt_ids( $slug );

		if ( empty( $term_taxonomy_ids ) ) {
			continue;
		}

		$id_list = implode(
			',',
			array_map( 'absint', $term_taxonomy_ids )
		);

		$alias = 'jg_rel_' . md5( $slug );

		$case_parts[] = "
			WHEN EXISTS (
				SELECT 1
				FROM {$wpdb->term_relationships} AS {$alias}
				WHERE {$alias}.object_id = {$wpdb->posts}.ID
				  AND {$alias}.term_taxonomy_id IN ({$id_list})
			)
			THEN " . absint( $priority );
	}

	if ( empty( $case_parts ) ) {
		return '500 ASC';
	}

	return "
		CASE
			" . implode( "\n", $case_parts ) . "
			ELSE 500
		END ASC
	";
}


/**
 * Gibt die term_taxonomy_ids einer Kategorie und aller
 * darunterliegenden Kategorien zurück.
 */
function jg_get_category_tree_tt_ids( $slug ) {

	static $cache = array();

	if ( isset( $cache[ $slug ] ) ) {
		return $cache[ $slug ];
	}

	$term = get_term_by(
		'slug',
		$slug,
		'product_cat'
	);

	if ( ! $term || is_wp_error( $term ) ) {
		$cache[ $slug ] = array();
		return array();
	}

	$term_ids = array( (int) $term->term_id );

	$children = get_term_children(
		$term->term_id,
		'product_cat'
	);

	if ( ! is_wp_error( $children ) && ! empty( $children ) ) {
		$term_ids = array_merge(
			$term_ids,
			array_map( 'intval', $children )
		);
	}

	$terms = get_terms(
		array(
			'taxonomy'   => 'product_cat',
			'include'    => array_unique( $term_ids ),
			'hide_empty' => false,
		)
	);

	if ( is_wp_error( $terms ) ) {
		$cache[ $slug ] = array();
		return array();
	}

	$term_taxonomy_ids = array();

	foreach ( $terms as $category_term ) {
		$term_taxonomy_ids[] = (int) $category_term->term_taxonomy_id;
	}

	$cache[ $slug ] = array_unique( $term_taxonomy_ids );

	return $cache[ $slug ];
}

/* =========================================================
 * JEANS GLUTH – WISHLIST STATUS FÜR WOODMART 8.5+
 * ========================================================= */

add_action( 'wp_footer', function () {
    ?>
    <script>
    (() => {

        function syncWishlistButton(button) {
            if (!button) return;

            const textElement = button.querySelector('.wd-action-text');

            if (!textElement) {
                button.classList.remove('jg-wishlist-active');
                return;
            }

            const text = textElement.textContent
                .trim()
                .toLowerCase();

            const isActive =
                text.includes('von wunschliste entfernen') ||
                text.includes('remove from wishlist');

            button.classList.toggle(
                'jg-wishlist-active',
                isActive
            );
        }


        function syncAllWishlistButtons() {
            document
                .querySelectorAll('.wd-wishlist-btn')
                .forEach(syncWishlistButton);
        }


        /* Seite bereits geladen? */
        if (document.readyState === 'loading') {
            document.addEventListener(
                'DOMContentLoaded',
                syncAllWishlistButtons
            );
        } else {
            syncAllWishlistButtons();
        }


        /* Klick auf Wishlist */
        document.addEventListener('click', (event) => {

            const link = event.target.closest('.wd-wishlist-btn a');

            if (!link) return;

            const button = link.closest('.wd-wishlist-btn');

            if (!button) return;

            /*
             * Sofortige optische Reaktion.
             */
            button.classList.toggle('jg-wishlist-active');

            /*
             * Danach WoodMarts tatsächlichen AJAX-Zustand prüfen.
             */
            setTimeout(syncAllWishlistButtons, 300);
            setTimeout(syncAllWishlistButtons, 800);
            setTimeout(syncAllWishlistButtons, 1500);

        }, true);


        /*
         * WoodMart ersetzt beim Filtern/AJAX Teile der Produktliste.
         * Diese Änderungen ebenfalls erfassen.
         */
        const observer = new MutationObserver(() => {
            syncAllWishlistButtons();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });


        /* Browser Back/Forward Cache */
        window.addEventListener(
            'pageshow',
            syncAllWishlistButtons
        );

    })();
    </script>
    <?php
}, 100 );