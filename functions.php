<?php
// Exit if accessed directly
if ( !defined( 'ABSPATH' ) ) exit;

/**
 * Child Theme Styles
 * Dieser Block lädt zusätzlich deine modularen CSS-Dateien.
 */

/* ****************************************** XTEMOS ***************************** */
add_filter('request_filesystem_credentials', '__return_true');

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
		'woodmart-child-filterbar' => 'assets/css/filterbar.css',
		'woodmart-child-header' => 'assets/css/header.css',
		'woodmart-child-product-gallery' => 'assets/css/product-gallery.css',
		'woodmart-child-single-product-page' => 'assets/css/single-product-page.css',
	);

	foreach ( $styles as $handle => $path ) {
		wp_enqueue_style(
			$handle,
			get_stylesheet_directory_uri() . '/' . $path,
			array(),
			$theme_version
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
		'woodmart-child-filterbar' => 'assets/js/filterbar.js',
		'woodmart-child-product-gallery' => 'assets/js/product-gallery.js',
	);

	foreach ( $scripts as $handle => $path ) {
		wp_enqueue_script(
			$handle,
			get_stylesheet_directory_uri() . '/' . $path,
			array(),
			$theme_version,
			true
		);
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
	'filterbar',
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

	wp_enqueue_style(
		'woodmart-child-customizer-overrides',
		get_stylesheet_directory_uri() . '/assets/css/customizer-overrides.css',
		array(
			'woodmart-child-account',
			'woodmart-child-checkout',
			'woodmart-child-header',
			'woodmart-child-product-gallery',
			'woodmart-child-single-product-page'
		),
		$theme_version
	);

}

add_action( 'wp_enqueue_scripts', 'woodmart_child_additional_css', 30 );