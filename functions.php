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
		'woodmart-child-header' => 'assets/css/header.css',
		'woodmart-child-product-gallery' => 'assets/css/product-gallery.css',
		'woodmart-child-single-product-page' => 'assets/css/single-product-page.css',
	);

	$should_load = array(
		'woodmart-child-account' => function_exists( 'is_account_page' ) && is_account_page(),
		'woodmart-child-category-circles' => true,
		'woodmart-child-category-pills' => woodmart_child_is_shop_archive(),
		'woodmart-child-checkout' => function_exists( 'is_checkout' ) && is_checkout(),
		'woodmart-child-header' => true,
		'woodmart-child-product-gallery' =>
			( function_exists( 'is_product' ) && is_product() ) ||
			woodmart_child_is_shop_archive() ||
			( function_exists( 'is_account_page' ) && is_account_page() ),
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