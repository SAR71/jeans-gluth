<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_shortcode('jg_subsub_pills', function() {

    if (!function_exists('is_product_category') || !is_product_category()) {
        return '';
    }

    $term = get_queried_object();
    if (!$term || empty($term->term_id) || $term->taxonomy !== 'product_cat') {
        return '';
    }

    $current_id = (int) $term->term_id;

    // Top-Ancestor (Ebene 1)
    $ancestors = get_ancestors($current_id, 'product_cat');
    $depth_rel = is_array($ancestors) ? count($ancestors) : 0;

    // Ebene 1 (z.B. Damen) → nichts anzeigen
    if ($depth_rel === 0) {
        return '';
    }

    // Ebene-2-Kategorie bestimmen
    // - auf Ebene 2: current
    // - auf Ebene 3: parent
    $level2_id = ($depth_rel === 1)
        ? $current_id
        : (int) $term->parent;

    if ($level2_id <= 0) {
        return '';
    }

    // Ebene 3 = direkte Kinder von Ebene 2
    $items = get_terms([
        'taxonomy'   => 'product_cat',
        'parent'     => $level2_id,
        'hide_empty' => true,
        'orderby'    => 'menu_order',
        'order'      => 'ASC',
    ]);

    // Ebene 3 nur anzeigen, wenn es mindestens 2 Einträge gibt
    if (is_wp_error($items) || count($items) < 2) {
        return '';
    }

    // Aktiver Eintrag nur auf Ebene 3
    $active_id = ($depth_rel >= 2) ? $current_id : 0;

    ob_start(); ?>
    <nav class="jg-subsub-pills" aria-label="Unterkategorien">
      <?php foreach ($items as $p):
        $link = get_term_link($p);
        if (is_wp_error($link)) continue;

        $is_active = ($active_id && ((int)$p->term_id === (int)$active_id));
        $cls = $is_active ? 'jg-subsub-pill is-active' : 'jg-subsub-link';
      ?>
        <a class="<?php echo esc_attr($cls); ?>"
           href="<?php echo esc_url($link); ?>"
           <?php echo $is_active ? 'aria-current="page"' : ''; ?>>
          <span class="jg-subsub-text"><?php echo esc_html($p->name); ?></span>
        </a>
      <?php endforeach; ?>
    </nav>
    <?php
    return ob_get_clean();
});
