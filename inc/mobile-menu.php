<?php
// LastChanged: 2026-09-13 00:00:00
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'jg_mobile_menu_is_target_menu' ) ) {
	function jg_mobile_menu_is_target_menu( $args ) {
		if ( ! is_object( $args ) ) {
			return false;
		}

		$menu_id = isset( $args->menu_id ) ? (string) $args->menu_id : '';
		if ( $menu_id === 'menu-jg-mobile-naviagtion' ) {
			return true;
		}

		$menu_class = isset( $args->menu_class ) ? (string) $args->menu_class : '';

		return (
			strpos( $menu_class, 'wd-nav-mobile' ) !== false &&
			strpos( $menu_class, 'mobile-pages-menu' ) !== false
		);
	}
}

if ( ! function_exists( 'jg_mobile_menu_item_exists' ) ) {
	function jg_mobile_menu_item_exists( $items, $parent_id, $url_path_fragment ) {
		foreach ( $items as $item ) {
			if ( (int) $item->menu_item_parent !== (int) $parent_id ) {
				continue;
			}

			$item_url_path = wp_parse_url( (string) $item->url, PHP_URL_PATH );
			if ( ! is_string( $item_url_path ) ) {
				continue;
			}

			if ( untrailingslashit( $item_url_path ) === untrailingslashit( $url_path_fragment ) ) {
				return true;
			}
		}

		return false;
	}
}

if ( ! function_exists( 'jg_mobile_menu_build_custom_item' ) ) {
	function jg_mobile_menu_build_custom_item( $id, $parent_id, $label, $url, $class_name ) {
		$item = new stdClass();
		$item->ID = $id;
		$item->db_id = 0;
		$item->menu_item_parent = (string) $parent_id;
		$item->object_id = '0';
		$item->object = 'custom';
		$item->type = 'custom';
		$item->type_label = 'Custom Link';
		$item->title = $label;
		$item->url = $url;
		$item->target = '';
		$item->attr_title = '';
		$item->description = '';
		$item->classes = array(
			'menu-item',
			'menu-item-type-custom',
			'item-level-1',
			'jg-mobile-virtual-cat',
			$class_name,
		);
		$item->xfn = '';
		$item->status = 'publish';
		$item->post_parent = 0;
		$item->post_type = 'nav_menu_item';
		$item->filter = 'raw';
		$item->menu_order = 0;
		$item->current = false;
		$item->current_item_ancestor = false;
		$item->current_item_parent = false;

		return $item;
	}
}

add_filter( 'wp_nav_menu_objects', function ( $items, $args ) {
	if ( ! jg_mobile_menu_is_target_menu( $args ) ) {
		return $items;
	}

	$gender_terms = array(
		'damen'  => get_term_by( 'slug', 'damen', 'product_cat' ),
		'herren' => get_term_by( 'slug', 'herren', 'product_cat' ),
	);

	$parent_menu_ids = array(
		'damen'  => 0,
		'herren' => 0,
	);

	foreach ( $items as $item ) {
		if ( empty( $item->object ) || $item->object !== 'product_cat' ) {
			continue;
		}

		$object_id = isset( $item->object_id ) ? (int) $item->object_id : 0;

		foreach ( $gender_terms as $slug => $term ) {
			if ( ! $term || is_wp_error( $term ) ) {
				continue;
			}

			if ( $object_id === (int) $term->term_id ) {
				$parent_menu_ids[ $slug ] = (int) $item->ID;
			}
		}
	}

	$menu_definitions = array(
		'damen' => array(
			array(
				'label' => 'Neu',
				'path'  => '/product-category/damen/neu/',
				'class' => 'jg-mobile-damen-neu',
			),
			array(
				'label' => 'Sale',
				'path'  => '/product-category/damen/sale/',
				'class' => 'jg-mobile-damen-sale',
			),
		),
		'herren' => array(
			array(
				'label' => 'Neu',
				'path'  => '/product-category/herren/neu/',
				'class' => 'jg-mobile-herren-neu',
			),
			array(
				'label' => 'Sale',
				'path'  => '/product-category/herren/sale/',
				'class' => 'jg-mobile-herren-sale',
			),
		),
	);

	$inserts = array();
	$synthetic_id = -100001;

	foreach ( $menu_definitions as $slug => $definitions ) {
		$parent_id = (int) $parent_menu_ids[ $slug ];
		if ( $parent_id <= 0 ) {
			continue;
		}

		foreach ( $definitions as $definition ) {
			$path = $definition['path'];
			if ( jg_mobile_menu_item_exists( $items, $parent_id, $path ) ) {
				continue;
			}

			$url = home_url( $path );
			$inserts[] = array(
				'parent_id' => $parent_id,
				'item'      => jg_mobile_menu_build_custom_item(
					$synthetic_id,
					$parent_id,
					$definition['label'],
					$url,
					$definition['class']
				),
			);
			$synthetic_id--;
		}
	}

	if ( empty( $inserts ) ) {
		return $items;
	}

	$items_with_inserts = array();

	foreach ( $items as $item ) {
		$items_with_inserts[] = $item;

		foreach ( $inserts as $insert ) {
			if ( (int) $item->ID !== (int) $insert['parent_id'] ) {
				continue;
			}

			$items_with_inserts[] = $insert['item'];
		}
	}

	return $items_with_inserts;
}, 20, 2 );
