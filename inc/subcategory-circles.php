<?php
// LastChanged: 2026-06-24 00:00:00
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_shortcode('jg_top_subcats', function($atts) {

    if (!function_exists('is_product_category') || !is_product_category()) {
        return '';
    }

    $term = get_queried_object();
    if (!$term || empty($term->term_id) || $term->taxonomy !== 'product_cat') {
        return '';
    }

    $current_id = (int) $term->term_id;

    $top_id = $current_id;
    $ancestors = get_ancestors($top_id, 'product_cat');
    if (!empty($ancestors)) {
        $top_id = (int) end($ancestors);
    }

    $top_term = get_term($top_id, 'product_cat');
    if (!$top_term || is_wp_error($top_term)) {
        return '';
    }

    $children = get_terms([
        'taxonomy'   => 'product_cat',
        'parent'     => $top_id,
        'hide_empty' => true,
        'orderby'    => 'menu_order',
        'order'      => 'ASC',
    ]);

    if (is_wp_error($children)) {
        $children = [];
    }

    $current_parent_id = (int) $term->parent;

    if ($current_parent_id === $top_id) {
        $active_subcat_id = $current_id;
    } else {
        $active_subcat_id = $current_parent_id > 0 ? $current_parent_id : $current_id;
    }

  // NEU + SALE auf Damen/Herren und allen Unterkategorien anzeigen
$allowed_top_slugs = ['damen', 'herren'];

$show_filter_circles =
    in_array($top_term->slug, $allowed_top_slugs, true);

    if (empty($children) && !$show_filter_circles) {
        return '';
    }

    $current_args = [];
    if (function_exists('jg_get_filter_args_from_request')) {
        $current_args = jg_get_filter_args_from_request();
    } else {
        $allowed = [
            'jg_filter_marke',
            'jg_filter_farben',
            'jg_filter_groessen',
            'jg_sale',
            'jg_new',
            'orderby',
        ];

        foreach ($allowed as $key) {
            if (!isset($_GET[$key])) {
                continue;
            }

            $value = wp_unslash($_GET[$key]);

            if (is_array($value)) {
                $value = implode(',', array_map('sanitize_text_field', $value));
            } else {
                $value = sanitize_text_field((string) $value);
            }

            if ($value !== '') {
                $current_args[$key] = $value;
            }
        }
    }

$build_filter_link = function($key) use ($top_term) {

            $base_link = get_term_link($top_term);

            if (is_wp_error($base_link)) {
                return '';
            }

            if ($key === 'jg_new') {
                return trailingslashit($base_link) . 'neu/';
            }

            if ($key === 'jg_sale') {
                return trailingslashit($base_link) . 'sale/';
            }

            return $base_link;
        };

    $sale_active =
    (string) get_query_var('jg_sale') === '1' ||
    (!empty($_GET['jg_sale']) && $_GET['jg_sale'] === '1');

$new_active =
    (string) get_query_var('jg_new') === '1' ||
    (!empty($_GET['jg_new']) && $_GET['jg_new'] === '1');

    ob_start(); ?>
        <?php
        if (
            $current_id === $top_id &&
            !$new_active &&
            !$sale_active
        ) :
        ?>
            <h1 class="jg-visually-hidden"><?php echo esc_html($term->name); ?></h1>
        <?php endif; ?>

        <div class="jg-subcat-carousel" role="navigation" aria-label="Unterkategorien">
            <button type="button" class="jg-subcat-nav jg-prev" aria-label="Nach links scrollen" hidden></button>
      <div class="jg-subcat-circles">

        <?php if ($show_filter_circles): ?>
     <?php
        $new_link = $build_filter_link('jg_new');
        if ($new_link):
        ?>
            <a class="jg-subcat-item jg-subcat-item--filter<?php echo $new_active ? ' is-active' : ''; ?>"
               href="<?php echo esc_url($new_link); ?>"
                    aria-label="<?php echo esc_attr( $new_active ? 'Neu Filter, aktiv' : 'Neu Filter' ); ?>"
               <?php echo $new_active ? 'aria-current="page"' : ''; ?>
               data-has-thumb="1">
              <span class="jg-subcat-thumb">
                <img
                    class="jg-subcat-img jg-subcat-filter-img"
                    src="https://jeans-gluth.de/wp-content/uploads/2026/08/20260804-NEU.png"
                    alt=""
                    aria-hidden="true"
                >
            </span>
                <?php if ($new_active): ?>
                    <h1 class="jg-subcat-title">Neu</h1>
                <?php else: ?>
                    <span class="jg-subcat-title">Neu</span>
                <?php endif; ?>
            </a>
          <?php endif; ?>

       <?php
            $sale_link = $build_filter_link('jg_sale');
            if ($sale_link):
            ?>
            <a class="jg-subcat-item jg-subcat-item--filter<?php echo $sale_active ? ' is-active' : ''; ?>"
               href="<?php echo esc_url($sale_link); ?>"
                    aria-label="<?php echo esc_attr( $sale_active ? 'Sale Filter, aktiv' : 'Sale Filter' ); ?>"
               <?php echo $sale_active ? 'aria-current="page"' : ''; ?>
               data-has-thumb="1">
            <span class="jg-subcat-thumb">
            <img
                class="jg-subcat-img jg-subcat-filter-img"
                src="https://jeans-gluth.de/wp-content/uploads/2026/08/20260802-Sale.png"
                alt=""
                aria-hidden="true"
            >            </span>
              <?php if ($sale_active): ?>
                <h1 class="jg-subcat-title">Sale</h1>
            <?php else: ?>
                <span class="jg-subcat-title">Sale</span>
            <?php endif; ?>
            </a>
          <?php endif; ?>
        <?php endif; ?>

        <?php foreach ($children as $child):
          $link = get_term_link($child);
          if (is_wp_error($link)) continue;

          $thumb_id = get_term_meta($child->term_id, 'thumbnail_id', true);
          $img = $thumb_id ? wp_get_attachment_image($thumb_id, 'woocommerce_thumbnail', false, [
              'class' => 'jg-subcat-img',
              'alt'   => $child->name
          ]) : '';

          $is_active = ((int)$child->term_id === (int)$active_subcat_id);
          ?>
          <a class="jg-subcat-item<?php echo $is_active ? ' is-active' : ''; ?>"
             href="<?php echo esc_url($link); ?>"
                 aria-label="<?php echo esc_attr( $is_active ? ( $child->name . ', aktuell ausgewählt' ) : $child->name ); ?>"
             <?php echo $is_active ? 'aria-current="page"' : ''; ?>
             data-term-id="<?php echo (int) $child->term_id; ?>"
             data-has-thumb="<?php echo $thumb_id ? '1' : '0'; ?>">
            <span class="jg-subcat-thumb"><?php echo $img; ?></span>
                    <?php
            $title_tag = $is_active ? 'h1' : 'span';
            ?>

            <<?php echo $title_tag; ?> class="jg-subcat-title"><?php
                echo str_replace(
                    ' &amp; ',
                    '<br>&amp;&nbsp;',
                    esc_html($child->name)
                );
            ?></<?php echo $title_tag; ?>>
          </a>
        <?php endforeach; ?>

      </div>
            <button type="button" class="jg-subcat-nav jg-next" aria-label="Nach rechts scrollen" hidden></button>
    </div>
    <?php
    return ob_get_clean();
});

/* Hauptmenü Damen/Herren aktiv setzen, wenn Unterkategorie aktiv ist */
add_filter('nav_menu_css_class', function($classes, $item) {

    if (!function_exists('is_product_category') || !is_product_category()) {
        return $classes;
    }

    if (empty($item->object) || $item->object !== 'product_cat') {
        return $classes;
    }

    $current_term = get_queried_object();

    if (!$current_term || empty($current_term->term_id) || $current_term->taxonomy !== 'product_cat') {
        return $classes;
    }

    $current_id = (int) $current_term->term_id;

    $top_id = $current_id;
    $ancestors = get_ancestors($current_id, 'product_cat');

    if (!empty($ancestors)) {
        $top_id = (int) end($ancestors);
    }

    $menu_term_id = (int) $item->object_id;

    if ($menu_term_id === $top_id) {
        $classes[] = 'current-menu-item';
        $classes[] = 'current_page_item';
    }

    return array_unique($classes);

}, 10, 2);

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