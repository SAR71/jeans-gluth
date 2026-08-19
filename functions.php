<?php
// LastChanged: 2026-07-10 00:00:00
// Exit if accessed directly
if ( !defined( 'ABSPATH' ) ) exit;

/**
 * Child Theme Styles
 * Dieser Block lädt zusätzlich deine modularen CSS-Dateien.
 */

/* ****************************************** XTEMOS ***************************** */
add_filter('request_filesystem_credentials', '__return_true');

if ( ! function_exists( 'woodmart_child_is_shop_archive' ) ) {
	function woodmart_child_is_shop_archive() {
		return (
			( function_exists( 'is_shop' ) && is_shop() ) ||
			( function_exists( 'is_product_taxonomy' ) && is_product_taxonomy() ) ||
			( function_exists( 'is_product_category' ) && is_product_category() ) ||
			( function_exists( 'is_product_tag' ) && is_product_tag() )
		);
	}
}

if ( ! function_exists( 'woodmart_child_has_top_subcats_context' ) ) {
	function woodmart_child_has_top_subcats_context() {
		if ( woodmart_child_is_shop_archive() ) {
			return true;
		}

		if ( ! function_exists( 'is_singular' ) || ! is_singular() ) {
			return false;
		}

		$post_id = get_queried_object_id();
		if ( ! $post_id ) {
			return false;
		}

		$content = (string) get_post_field( 'post_content', $post_id );

		return function_exists( 'has_shortcode' ) && has_shortcode( $content, 'jg_top_subcats' );
	}
}

/* ===============================
   BASIS-STYLES LADEN (OHNE PARENT-PFAD)
   =============================== */
function woodmart_child_base_styles() {

	$theme_version = wp_get_theme()->get( 'Version' );
	$woodmart_base_handles = array(
		'wd-style-base',
		'wd-helpers-wpb-elem',
		'wd-lazy-loading',
		'wd-elementor-base',
		'wd-elementor-pro-base',
		'wd-woocommerce-base',
		'wd-mod-star-rating',
		'wd-woocommerce-block-notices',
		'wd-wp-blocks',
		'wd-header-banner',
		'wd-header-base',
		'wd-mod-tools',
		'wd-header-elements-base',
		'wd-social-icons',
		'wd-header-search',
		'wd-wd-search-form',
		'wd-wd-search-results',
		'wd-wd-search-dropdown',
		'wd-header-cart-side',
		'wd-woo-mod-quantity',
		'wd-header-cart',
		'wd-widget-shopping-cart',
		'wd-widget-product-list',
		'wd-header-my-account',
		'wd-header-mobile-nav-dropdown',
		'wd-swiper',
		'wd-slider',
		'wd-mod-animations-transform-base',
		'wd-mod-animations-transform',
		'wd-mod-transform',
		'wd-text-block',
		'wd-button',
		'wd-swiper-arrows',
		'wd-swiper-pagin',
		'wd-banner',
		'wd-banner-style-bg-and-border',
		'wd-section-title',
		'wd-section-title-style-simple-and-brd',
		'wd-el-subtitle-style',
		'wd-tabs',
		'wd-product-tabs',
		'wd-sticky-loader',
		'wd-product-loop',
		'wd-woo-loop-prod-el-base',
		'wd-woo-loop-prod-builder',
		'wd-product-arrows',
		'wd-woo-mod-product-labels',
		'wd-woo-mod-product-labels-round',
		'wd-instagram',
		'wd-brands',
		'wd-brands-style-bordered',
		'wd-widget-collapse',
		'wd-footer-base',
		'wd-map',
		'wd-el-open-street-map',
		'wd-list',
		'wd-el-list',
		'wd-scroll-top',
		'wd-header-mod-content-calc',
		'wd-page-wishlist-popup',
		'wd-mfp-popup',
		'wd-bottom-toolbar',
	);

	wp_enqueue_style(
		'woodmart-child-base-style',
		get_stylesheet_uri(),
		$woodmart_base_handles,
		$theme_version
	);
}
add_action( 'wp_enqueue_scripts', 'woodmart_child_base_styles', 10 );

/* ===============================
   CSS DATEIEN LADEN
   =============================== */
function woodmart_child_styles() {

	$theme_version = wp_get_theme()->get( 'Version' );
	$styles = array(
		'woodmart-child-account' => 'assets/css/account.css',
		'woodmart-child-category-circles' => 'assets/css/category-circles.css',
		'woodmart-child-category-pills' => 'assets/css/category-pills.css',
		'woodmart-child-checkout' => 'assets/css/checkout.css',
		'woodmart-child-footer' => 'assets/css/footer.css',
		'woodmart-child-header' => 'assets/css/header.css',
		'woodmart-child-product-gallery' => 'assets/css/product-gallery.css',
		'woodmart-child-single-product-page' => 'assets/css/single-product-page.css',
	);

	$should_load = array(
		'woodmart-child-account' => function_exists( 'is_account_page' ) && is_account_page(),
		'woodmart-child-category-circles' => true,
		'woodmart-child-category-pills' => woodmart_child_is_shop_archive(),
		'woodmart-child-checkout' => function_exists( 'is_checkout' ) && is_checkout(),
		'woodmart-child-footer' => true,
		'woodmart-child-header' => true,
		'woodmart-child-product-gallery' => true,
		'woodmart-child-single-product-page' => function_exists( 'is_product' ) && is_product(),
);

	foreach ( $styles as $handle => $path ) {
		if ( isset( $should_load[ $handle ] ) && ! $should_load[ $handle ] ) {
			continue;
		}

		$asset_path = trailingslashit( get_stylesheet_directory() ) . $path;
		$asset_version = file_exists( $asset_path ) ? (string) filemtime( $asset_path ) : $theme_version;

		wp_enqueue_style(
			$handle,
			get_stylesheet_directory_uri() . '/' . $path,
			array(),
			$asset_version
		);
	}
}
add_action( 'wp_enqueue_scripts', 'woodmart_child_styles', 20 );


/* ===============================
   JS DATEIEN LADEN
   =============================== */
function woodmart_child_scripts() {

	$theme_version = wp_get_theme()->get( 'Version' );
	$scripts = array(
		'woodmart-child-category-circle' => 'assets/js/category-circle.js',
		'woodmart-child-product-gallery' => 'assets/js/product-gallery.js',
	);

	$should_load = array(
		'woodmart-child-category-circle' => true,
		'woodmart-child-product-gallery' => function_exists( 'is_product' ) && is_product(),
	);

	foreach ( $scripts as $handle => $path ) {
		if ( isset( $should_load[ $handle ] ) && ! $should_load[ $handle ] ) {
			continue;
		}

		$asset_path = trailingslashit( get_stylesheet_directory() ) . $path;
		$asset_version = file_exists( $asset_path ) ? (string) filemtime( $asset_path ) : $theme_version;

		wp_enqueue_script(
			$handle,
			get_stylesheet_directory_uri() . '/' . $path,
			array(),
			$asset_version,
			true
		);

		if ( function_exists( 'wp_script_add_data' ) ) {
			wp_script_add_data( $handle, 'strategy', 'defer' );
		}
	}
}
add_action( 'wp_enqueue_scripts', 'woodmart_child_scripts', 20 );


/* ===============================
   PHP MODULE LADEN
   =============================== */
$child_modules = array(
	'account',
	'category-pills',
	'checkout',
	'single-product-layout',
	'subcategory-circles',
);

foreach ( $child_modules as $module ) {
	require_once get_stylesheet_directory() . '/inc/' . $module . '.php';
}
 
/* ===============================
   ADDITIONAL CSS (Customizer)
   Wird zuletzt geladen
   =============================== */

function woodmart_child_additional_css() {

	$theme_version = wp_get_theme()->get( 'Version' );
	$base_path = trailingslashit( get_stylesheet_directory() ) . 'assets/css/customizer-overrides.css/';
	$base_uri  = trailingslashit( get_stylesheet_directory_uri() ) . 'assets/css/customizer-overrides.css/';

	$files = array(
		array(
			'handle' => 'woodmart-child-customizer-overrides-header',
			'file'   => 'header.css',
			'deps'   => array(),
			'load'   => true,
		),
		array(
			'handle' => 'woodmart-child-customizer-overrides-account',
			'file'   => 'account.css',
			'deps'   => array(),
			'load'   => function_exists( 'is_account_page' ) && is_account_page(),
		),
		array(
			'handle' => 'woodmart-child-customizer-overrides-checkout',
			'file'   => 'checkout.css',
			'deps'   => array(),
			'load'   => function_exists( 'is_checkout' ) && is_checkout(),
		),
		array(
			'handle' => 'woodmart-child-customizer-overrides-product-gallery',
			'file'   => 'product-gallery.css',
			'deps'   => array(),
			'load'   => function_exists( 'is_product' ) && is_product(),
		),
		array(
			'handle' => 'woodmart-child-customizer-overrides-single-product',
			'file'   => 'single-product.css',
			'deps'   => array(),
			'load'   => function_exists( 'is_product' ) && is_product(),
		),
	);

	foreach ( $files as $item ) {
		if ( empty( $item['load'] ) ) {
			continue;
		}

		$file_path = $base_path . $item['file'];
		if ( ! file_exists( $file_path ) ) {
			continue;
		}

		$asset_version = (string) filemtime( $file_path );

		wp_enqueue_style(
			$item['handle'],
			$base_uri . $item['file'],
			$item['deps'],
			$asset_version
		);
	}

}

add_action( 'wp_enqueue_scripts', 'woodmart_child_additional_css', 30 );


/**
 * Jeans Glüth
 * Zusätzliche Herstellerinformationen für WooCommerce Brands
 *
 * Taxonomie: product_brand
 *
 * Gespeicherte Felder:
 * - Herstellername / Handelsname / Marke
 * - vollständige Postanschrift
 * - elektronische Adresse
 * - Hersteller außerhalb der EU
 * - EU-verantwortliche Person
 * - Anschrift der verantwortlichen Person
 * - elektronische Adresse der verantwortlichen Person
 */


/* ============================================================
 * 1. FELDER BEIM ANLEGEN EINER NEUEN BRAND
 * ============================================================ */

add_action( 'product_brand_add_form_fields', 'jg_brand_manufacturer_add_fields' );

function jg_brand_manufacturer_add_fields() {
	?>

	<div class="form-field">
		<hr style="margin: 25px 0;">
		<h2>Herstellerinformationen</h2>
	</div>

	<div class="form-field">
		<label for="jg_manufacturer_name">
			Name / Handelsname / Marke des Herstellers
		</label>

		<input
			type="text"
			name="jg_manufacturer_name"
			id="jg_manufacturer_name"
			value=""
		>

		<p class="description">
			Name, eingetragener Handelsname oder eingetragene Handelsmarke des Herstellers.
		</p>
	</div>


	<div class="form-field">
		<label for="jg_manufacturer_address">
			Vollständige Postanschrift
		</label>

		<textarea
			name="jg_manufacturer_address"
			id="jg_manufacturer_address"
			rows="5"
		></textarea>

		<p class="description">
			Vollständige postalische Anschrift des Herstellers.
		</p>
	</div>


	<div class="form-field">
		<label for="jg_manufacturer_email">
			E-Mail / elektronische Adresse
		</label>

		<input
			type="text"
			name="jg_manufacturer_email"
			id="jg_manufacturer_email"
			value=""
		>

		<p class="description">
			E-Mail-Adresse bzw. elektronische Adresse des Herstellers.
		</p>
	</div>


	<div class="form-field">
		<label>
			<input
				type="checkbox"
				name="jg_manufacturer_outside_eu"
				id="jg_manufacturer_outside_eu"
				value="1"
			>
			Hersteller hat seinen Sitz außerhalb der EU
		</label>

		<p class="description">
			Aktivieren, wenn für die Produkte eine in der EU ansässige verantwortliche Person angegeben werden muss.
		</p>
	</div>


	<div id="jg-eu-responsible-fields">

		<div class="form-field">
			<hr style="margin: 25px 0;">
			<h2>Verantwortliche Person in der EU</h2>
		</div>

		<div class="form-field">
			<label for="jg_eu_responsible_name">
				Name / Handelsname
			</label>

			<input
				type="text"
				name="jg_eu_responsible_name"
				id="jg_eu_responsible_name"
				value=""
			>

			<p class="description">
				Name bzw. eingetragener Handelsname der in der EU ansässigen verantwortlichen Person.
			</p>
		</div>


		<div class="form-field">
			<label for="jg_eu_responsible_address">
				Vollständige Postanschrift
			</label>

			<textarea
				name="jg_eu_responsible_address"
				id="jg_eu_responsible_address"
				rows="5"
			></textarea>

			<p class="description">
				Vollständige postalische Anschrift der verantwortlichen Person in der EU.
			</p>
		</div>


		<div class="form-field">
			<label for="jg_eu_responsible_email">
				E-Mail / elektronische Adresse
			</label>

			<input
				type="text"
				name="jg_eu_responsible_email"
				id="jg_eu_responsible_email"
				value=""
			>

			<p class="description">
				E-Mail-Adresse bzw. elektronische Adresse der verantwortlichen Person.
			</p>
		</div>

	</div>

	<?php
}


/* ============================================================
 * 2. FELDER BEIM BEARBEITEN EINER BESTEHENDEN BRAND
 * ============================================================ */

add_action( 'product_brand_edit_form_fields', 'jg_brand_manufacturer_edit_fields' );

function jg_brand_manufacturer_edit_fields( $term ) {

	$manufacturer_name       = get_term_meta( $term->term_id, 'jg_manufacturer_name', true );
	$manufacturer_address    = get_term_meta( $term->term_id, 'jg_manufacturer_address', true );
	$manufacturer_email      = get_term_meta( $term->term_id, 'jg_manufacturer_email', true );
	$manufacturer_outside_eu = get_term_meta( $term->term_id, 'jg_manufacturer_outside_eu', true );

	$eu_responsible_name     = get_term_meta( $term->term_id, 'jg_eu_responsible_name', true );
	$eu_responsible_address  = get_term_meta( $term->term_id, 'jg_eu_responsible_address', true );
	$eu_responsible_email    = get_term_meta( $term->term_id, 'jg_eu_responsible_email', true );

	?>

	<tr class="form-field">
		<th colspan="2">
			<hr style="margin: 25px 0 15px;">
			<h2 style="margin-bottom: 5px;">Herstellerinformationen</h2>
		</th>
	</tr>


	<tr class="form-field">
		<th scope="row">
			<label for="jg_manufacturer_name">
				Name / Handelsname / Marke des Herstellers
			</label>
		</th>

		<td>
			<input
				type="text"
				name="jg_manufacturer_name"
				id="jg_manufacturer_name"
				value="<?php echo esc_attr( $manufacturer_name ); ?>"
			>

			<p class="description">
				Name, eingetragener Handelsname oder eingetragene Handelsmarke des Herstellers.
			</p>
		</td>
	</tr>


	<tr class="form-field">
		<th scope="row">
			<label for="jg_manufacturer_address">
				Vollständige Postanschrift
			</label>
		</th>

		<td>
			<textarea
				name="jg_manufacturer_address"
				id="jg_manufacturer_address"
				rows="5"
			><?php echo esc_textarea( $manufacturer_address ); ?></textarea>

			<p class="description">
				Vollständige postalische Anschrift des Herstellers.
			</p>
		</td>
	</tr>


	<tr class="form-field">
		<th scope="row">
			<label for="jg_manufacturer_email">
				E-Mail / elektronische Adresse
			</label>
		</th>

		<td>
			<input
				type="text"
				name="jg_manufacturer_email"
				id="jg_manufacturer_email"
				value="<?php echo esc_attr( $manufacturer_email ); ?>"
			>

			<p class="description">
				E-Mail-Adresse bzw. elektronische Adresse des Herstellers.
			</p>
		</td>
	</tr>


	<tr class="form-field">
		<th scope="row">
			Hersteller außerhalb der EU
		</th>

		<td>
			<label>
				<input
					type="checkbox"
					name="jg_manufacturer_outside_eu"
					id="jg_manufacturer_outside_eu"
					value="1"
					<?php checked( $manufacturer_outside_eu, '1' ); ?>
				>
				Hersteller hat seinen Sitz außerhalb der EU
			</label>

			<p class="description">
				Aktivieren, wenn für die Produkte eine in der EU ansässige verantwortliche Person angegeben werden muss.
			</p>
		</td>
	</tr>


	<tr class="jg-eu-responsible-row">
		<th colspan="2">
			<hr style="margin: 25px 0 15px;">
			<h2 style="margin-bottom: 5px;">Verantwortliche Person in der EU</h2>
		</th>
	</tr>


	<tr class="form-field jg-eu-responsible-row">
		<th scope="row">
			<label for="jg_eu_responsible_name">
				Name / Handelsname
			</label>
		</th>

		<td>
			<input
				type="text"
				name="jg_eu_responsible_name"
				id="jg_eu_responsible_name"
				value="<?php echo esc_attr( $eu_responsible_name ); ?>"
			>

			<p class="description">
				Name bzw. eingetragener Handelsname der in der EU ansässigen verantwortlichen Person.
			</p>
		</td>
	</tr>


	<tr class="form-field jg-eu-responsible-row">
		<th scope="row">
			<label for="jg_eu_responsible_address">
				Vollständige Postanschrift
			</label>
		</th>

		<td>
			<textarea
				name="jg_eu_responsible_address"
				id="jg_eu_responsible_address"
				rows="5"
			><?php echo esc_textarea( $eu_responsible_address ); ?></textarea>

			<p class="description">
				Vollständige postalische Anschrift der verantwortlichen Person in der EU.
			</p>
		</td>
	</tr>


	<tr class="form-field jg-eu-responsible-row">
		<th scope="row">
			<label for="jg_eu_responsible_email">
				E-Mail / elektronische Adresse
			</label>
		</th>

		<td>
			<input
				type="text"
				name="jg_eu_responsible_email"
				id="jg_eu_responsible_email"
				value="<?php echo esc_attr( $eu_responsible_email ); ?>"
			>

			<p class="description">
				E-Mail-Adresse bzw. elektronische Adresse der verantwortlichen Person.
			</p>
		</td>
	</tr>

	<?php
}


/* ============================================================
 * 3. FELDER SPEICHERN
 * ============================================================ */

add_action( 'created_product_brand', 'jg_save_brand_manufacturer_fields' );
add_action( 'edited_product_brand',  'jg_save_brand_manufacturer_fields' );

function jg_save_brand_manufacturer_fields( $term_id ) {

	if ( ! current_user_can( 'manage_product_terms' ) && ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}


	/* Herstellername */

	if ( isset( $_POST['jg_manufacturer_name'] ) ) {

		update_term_meta(
			$term_id,
			'jg_manufacturer_name',
			sanitize_text_field( wp_unslash( $_POST['jg_manufacturer_name'] ) )
		);
	}


	/* Herstelleranschrift */

	if ( isset( $_POST['jg_manufacturer_address'] ) ) {

		update_term_meta(
			$term_id,
			'jg_manufacturer_address',
			sanitize_textarea_field( wp_unslash( $_POST['jg_manufacturer_address'] ) )
		);
	}


	/* Elektronische Adresse des Herstellers */

	if ( isset( $_POST['jg_manufacturer_email'] ) ) {

		update_term_meta(
			$term_id,
			'jg_manufacturer_email',
			sanitize_text_field( wp_unslash( $_POST['jg_manufacturer_email'] ) )
		);
	}


	/* Hersteller außerhalb EU */

	$outside_eu = isset( $_POST['jg_manufacturer_outside_eu'] ) ? '1' : '0';

	update_term_meta(
		$term_id,
		'jg_manufacturer_outside_eu',
		$outside_eu
	);


	/* Verantwortliche Person */

	if ( isset( $_POST['jg_eu_responsible_name'] ) ) {

		update_term_meta(
			$term_id,
			'jg_eu_responsible_name',
			sanitize_text_field( wp_unslash( $_POST['jg_eu_responsible_name'] ) )
		);
	}


	/* Anschrift verantwortliche Person */

	if ( isset( $_POST['jg_eu_responsible_address'] ) ) {

		update_term_meta(
			$term_id,
			'jg_eu_responsible_address',
			sanitize_textarea_field( wp_unslash( $_POST['jg_eu_responsible_address'] ) )
		);
	}


	/* Elektronische Adresse verantwortliche Person */

	if ( isset( $_POST['jg_eu_responsible_email'] ) ) {

		update_term_meta(
			$term_id,
			'jg_eu_responsible_email',
			sanitize_text_field( wp_unslash( $_POST['jg_eu_responsible_email'] ) )
		);
	}
}


/* ============================================================
 * 4. EU-FELDER AUTOMATISCH EIN-/AUSBLENDEN
 * ============================================================ */

add_action( 'admin_footer', 'jg_brand_manufacturer_admin_script' );

function jg_brand_manufacturer_admin_script() {

	$screen = get_current_screen();

	if (
		! $screen ||
		'taxonomy' !== $screen->base ||
		'product_brand' !== $screen->taxonomy
	) {
		return;
	}

	?>

	<script>
	jQuery(function($) {

		function jgToggleEuResponsibleFields() {

			const outsideEU = $('#jg_manufacturer_outside_eu').is(':checked');

			/* Brand neu anlegen */
			$('#jg-eu-responsible-fields').toggle(outsideEU);

			/* Brand bearbeiten */
			$('.jg-eu-responsible-row').toggle(outsideEU);
		}

		jgToggleEuResponsibleFields();

		$(document).on(
			'change',
			'#jg_manufacturer_outside_eu',
			jgToggleEuResponsibleFields
		);

	});
	</script>

	<?php
}

/**
 * Jeans Gluth – SEO-URLs für NEU und SALE
 *
 * /product-category/damen/neu/
 * /product-category/damen/sale/
 * /product-category/herren/neu/
 * /product-category/herren/sale/
 */
add_action('init', function () {

    add_rewrite_rule(
        '^product-category/(damen|herren)/neu/?$',
        'index.php?product_cat=$matches[1]&jg_new=1',
        'top'
    );

    add_rewrite_rule(
        '^product-category/(damen|herren)/sale/?$',
        'index.php?product_cat=$matches[1]&jg_sale=1',
        'top'
    );

});

add_filter('query_vars', function ($vars) {

    $vars[] = 'jg_new';
    $vars[] = 'jg_sale';

    return $vars;
});