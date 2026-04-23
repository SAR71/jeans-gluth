<?php
// LastChanged: 2026-04-23 22:55:04
// Exit if accessed directly
if ( !defined( 'ABSPATH' ) ) exit;

/**
 * Child Theme Styles
 * Dieser Block lädt zusätzlich deine modularen CSS-Dateien.
 */

/* ****************************************** XTEMOS ***************************** */
add_filter('request_filesystem_credentials', '__return_true');

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
		'woodmart-child-filterbar' => 'assets/css/filterbar.css',
		'woodmart-child-header' => 'assets/css/header.css',
		'woodmart-child-product-gallery' => 'assets/css/product-gallery.css',
		'woodmart-child-single-product-page' => 'assets/css/single-product-page.css',
	);

	foreach ( $styles as $handle => $path ) {
		wp_enqueue_style(
			$handle,
			get_stylesheet_directory_uri() . '/' . $path,
			array( 'woodmart-child-base-style' ),
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