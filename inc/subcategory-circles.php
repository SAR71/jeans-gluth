<?php
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

    // NEU + SALE nur anzeigen, wenn man direkt auf Damen oder Herren ist
    $allowed_top_slugs = ['damen', 'herren'];
    $is_top_level_view = ($current_id === $top_id);
    $show_filter_circles = $is_top_level_view && in_array($top_term->slug, $allowed_top_slugs, true);

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

    $build_filter_link = function($key) use ($term, $current_args) {
        $args = $current_args;

        $is_active = !empty($args[$key]) && $args[$key] === '1';

        if ($is_active) {
            unset($args[$key]);
        } else {
            $args[$key] = '1';
        }

        unset($args['paged']);

        $base_link = get_term_link($term);
        if (is_wp_error($base_link)) {
            return '';
        }

        return !empty($args) ? add_query_arg($args, $base_link) : $base_link;
    };

    $sale_active = !empty($_GET['jg_sale']) && $_GET['jg_sale'] === '1';
    $new_active  = !empty($_GET['jg_new'])  && $_GET['jg_new'] === '1';

    ob_start(); ?>
    <div class="jg-subcat-carousel" role="navigation" aria-label="Unterkategorien">
      <div class="jg-subcat-circles">

        <?php if ($show_filter_circles): ?>
          <?php
          $new_link = $build_filter_link('jg_new');
          if ($new_link):
          ?>
            <a class="jg-subcat-item jg-subcat-item--filter<?php echo $new_active ? ' is-active' : ''; ?>"
               href="<?php echo esc_url($new_link); ?>"
               <?php echo $new_active ? 'aria-current="page"' : ''; ?>
               data-has-thumb="0">
              <span class="jg-subcat-thumb">
                <span class="jg-subcat-thumb-label">Neu</span>
              </span>
              <span class="jg-subcat-title">Neu</span>
            </a>
          <?php endif; ?>

          <?php
          $sale_link = $build_filter_link('jg_sale');
          if ($sale_link):
          ?>
            <a class="jg-subcat-item jg-subcat-item--filter<?php echo $sale_active ? ' is-active' : ''; ?>"
               href="<?php echo esc_url($sale_link); ?>"
               <?php echo $sale_active ? 'aria-current="page"' : ''; ?>
               data-has-thumb="0">
              <span class="jg-subcat-thumb">
                <span class="jg-subcat-thumb-label">Sale</span>
              </span>
              <span class="jg-subcat-title">Sale</span>
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
             <?php echo $is_active ? 'aria-current="page"' : ''; ?>
             data-term-id="<?php echo (int) $child->term_id; ?>"
             data-has-thumb="<?php echo $thumb_id ? '1' : '0'; ?>">
            <span class="jg-subcat-thumb"><?php echo $img; ?></span>
            <span class="jg-subcat-title"><?php echo str_replace(
                ' &amp; ',
                '<br>&amp;&nbsp;',
                esc_html($child->name)
            ); ?></span>
          </a>
        <?php endforeach; ?>

      </div>
    </div>
    <?php
    return ob_get_clean();
});