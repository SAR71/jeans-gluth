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

<div class="jg-archive-gender-label">
    <?php echo esc_html(strtoupper($top_term->name)); ?>
</div>

<div class="jg-subcat-carousel" role="navigation" aria-label="Unterkategorien">
            <button type="button" class="jg-subcat-nav jg-prev" aria-label="Nach links scrollen" hidden></button>
      <div class="jg-subcat-circles">

        <?php if ($show_filter_circles): ?>
        <?php
        $new_link = $build_filter_link('jg_new');

        $new_image_url = $top_term->slug === 'herren'
            ? 'https://jeans-gluth.de/wp-content/uploads/2026/08/20260804-NEU-Herren.png'
            : 'https://jeans-gluth.de/wp-content/uploads/2026/08/20260804-NEU.png';

        $new_sparkles = [
            ['left' => '8%',  'top' => '12%', 'duration' => '3.7s', 'delay' => '-0.2s'],
            ['left' => '22%', 'top' => '8%',  'duration' => '4.9s', 'delay' => '-1.8s'],
            ['left' => '39%', 'top' => '17%', 'duration' => '3.2s', 'delay' => '-2.5s'],
            ['left' => '57%', 'top' => '10%', 'duration' => '5.1s', 'delay' => '-0.9s'],
            ['left' => '81%', 'top' => '15%', 'duration' => '4.2s', 'delay' => '-3.1s'],
            ['left' => '13%', 'top' => '31%', 'duration' => '5.3s', 'delay' => '-2.2s'],
            ['left' => '29%', 'top' => '27%', 'duration' => '3.9s', 'delay' => '-0.6s'],
            ['left' => '48%', 'top' => '35%', 'duration' => '4.7s', 'delay' => '-3.5s'],
            ['left' => '69%', 'top' => '29%', 'duration' => '3.4s', 'delay' => '-1.3s'],
            ['left' => '89%', 'top' => '37%', 'duration' => '5.5s', 'delay' => '-2.8s'],
            ['left' => '7%',  'top' => '51%', 'duration' => '4.4s', 'delay' => '-3.6s'],
            ['left' => '25%', 'top' => '46%', 'duration' => '3.5s', 'delay' => '-1.1s'],
            ['left' => '43%', 'top' => '54%', 'duration' => '5.2s', 'delay' => '-2.7s'],
            ['left' => '62%', 'top' => '48%', 'duration' => '4.0s', 'delay' => '-0.3s'],
            ['left' => '83%', 'top' => '57%', 'duration' => '4.8s', 'delay' => '-1.9s'],
            ['left' => '16%', 'top' => '70%', 'duration' => '5.0s', 'delay' => '-2.1s'],
            ['left' => '34%', 'top' => '64%', 'duration' => '3.6s', 'delay' => '-3.2s'],
            ['left' => '52%', 'top' => '73%', 'duration' => '4.6s', 'delay' => '-0.8s'],
            ['left' => '72%', 'top' => '67%', 'duration' => '5.4s', 'delay' => '-2.4s'],
            ['left' => '91%', 'top' => '72%', 'duration' => '3.8s', 'delay' => '-1.5s'],
            ['left' => '9%',  'top' => '88%', 'duration' => '4.5s', 'delay' => '-2.9s'],
            ['left' => '27%', 'top' => '82%', 'duration' => '5.6s', 'delay' => '-0.4s'],
            ['left' => '47%', 'top' => '91%', 'duration' => '3.3s', 'delay' => '-3.4s'],
            ['left' => '67%', 'top' => '84%', 'duration' => '4.3s', 'delay' => '-1.7s'],
            ['left' => '86%', 'top' => '90%', 'duration' => '5.0s', 'delay' => '-2.6s'],
        ];

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
                    src="<?php echo esc_url($new_image_url); ?>"
                    alt=""
                    aria-hidden="true"
                >

                <div class="jg-sparkle-overlay" aria-hidden="true">
                    <div class="jg-sparkles">
                        <?php foreach ($new_sparkles as $sparkle): ?>
                            <i style="left: <?php echo esc_attr($sparkle['left']); ?>; top: <?php echo esc_attr($sparkle['top']); ?>; animation-duration: <?php echo esc_attr($sparkle['duration']); ?>; animation-delay: <?php echo esc_attr($sparkle['delay']); ?>;"></i>
                        <?php endforeach; ?>
                    </div>
                </div>
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

    /*
     * NEU – Folgeseiten
     * z.B. /product-category/damen/neu/page/2/
     */
    add_rewrite_rule(
        '^product-category/(damen|herren)/neu/page/([0-9]+)/?$',
        'index.php?product_cat=$matches[1]&jg_new=1&paged=$matches[2]',
        'top'
    );

    /*
     * SALE – Folgeseiten
     * z.B. /product-category/damen/sale/page/2/
     */
    add_rewrite_rule(
        '^product-category/(damen|herren)/sale/page/([0-9]+)/?$',
        'index.php?product_cat=$matches[1]&jg_sale=1&paged=$matches[2]',
        'top'
    );

    /*
     * NEU – erste Seite
     */
    add_rewrite_rule(
        '^product-category/(damen|herren)/neu/?$',
        'index.php?product_cat=$matches[1]&jg_new=1',
        'top'
    );

    /*
     * SALE – erste Seite
     */
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

/*
 * SEO-Rewrite-Variablen wieder in $_GET / $_REQUEST spiegeln.
 *
 * Dadurch funktioniert die bestehende JG-Filterlogik weiterhin,
 * auch wenn die URL statt ?jg_new=1 jetzt /neu/ lautet.
 */
add_action('parse_request', function ($wp) {

    if (
        isset($wp->query_vars['jg_new']) &&
        (string) $wp->query_vars['jg_new'] === '1'
    ) {
        $_GET['jg_new']     = '1';
        $_REQUEST['jg_new'] = '1';
    }

    if (
        isset($wp->query_vars['jg_sale']) &&
        (string) $wp->query_vars['jg_sale'] === '1'
    ) {
        $_GET['jg_sale']     = '1';
        $_REQUEST['jg_sale'] = '1';
    }

}, 1);

/**
 * =========================================================
 * SEO für virtuelle NEU-/SALE-Seiten
 * =========================================================
 */

function jg_get_virtual_archive_seo_data() {

    if (!function_exists('is_product_category') || !is_product_category()) {
        return null;
    }

    $term = get_queried_object();

    if (
        !$term ||
        !($term instanceof WP_Term) ||
        $term->taxonomy !== 'product_cat'
    ) {
        return null;
    }

    if (!in_array($term->slug, ['damen', 'herren'], true)) {
        return null;
    }

    $new_active =
        (string) get_query_var('jg_new') === '1' ||
        (!empty($_GET['jg_new']) && $_GET['jg_new'] === '1');

    $sale_active =
        (string) get_query_var('jg_sale') === '1' ||
        (!empty($_GET['jg_sale']) && $_GET['jg_sale'] === '1');

    if (!$new_active && !$sale_active) {
        return null;
    }

    $gender = ($term->slug === 'damen') ? 'Damen' : 'Herren';

    $base_link = get_term_link($term);

    if (is_wp_error($base_link)) {
        return null;
    }

/*
 * Canonical auf Basis der tatsächlich aufgerufenen URL bestimmen.
 * Query-Parameter werden entfernt.
 */
$request_path = '/';

if (!empty($_SERVER['REQUEST_URI'])) {
    $request_path = wp_parse_url(
        wp_unslash($_SERVER['REQUEST_URI']),
        PHP_URL_PATH
    );
}

$current_canonical = home_url($request_path);

/*
 * /page/1/ ist identisch mit der ersten Seite.
 * Deshalb auf die Basis-URL canonicalisieren.
 */
$current_canonical = preg_replace(
    '~/page/1/?$~',
    '/',
    $current_canonical
);

$current_canonical = trailingslashit($current_canonical);


/*
 * NEU
 */
if ($new_active) {

    return [
        'title'       => 'Neue ' . $gender . 'mode | Neu eingetroffen | Jeans Gluth',
        'description' => 'Entdecke neu eingetroffene ' . $gender . 'mode bei Jeans Gluth. Aktuelle Styles, neue Lieblingsstücke und regelmäßig neue Ware.',
        'canonical'   => $current_canonical,
    ];
}


/*
 * SALE
 */
if ($sale_active) {

    return [
        'title'       => $gender . ' Sale | Reduzierte ' . $gender . 'mode | Jeans Gluth',
        'description' => 'Entdecke reduzierte ' . $gender . 'mode im Sale bei Jeans Gluth. Ausgewählte Kleidung und Accessoires zu attraktiven Preisen.',
        'canonical'   => $current_canonical,
    ];
}

return null;

}

/**
 * SEO-Titel im Browser / Google setzen
 */
add_filter('document_title_parts', function ($title_parts) {

    $seo = jg_get_virtual_archive_seo_data();

    if (!$seo) {
        return $title_parts;
    }

    $title_parts['title'] = $seo['title'];

    /*
     * Site-Name entfernen, weil "Jeans Gluth"
     * bereits im eigenen Title enthalten ist.
     */
    unset($title_parts['site']);
    unset($title_parts['tagline']);

    return $title_parts;

}, 20);


/**
 * Meta Description + Canonical in <head> ausgeben
 */
add_action('wp_head', function () {

    $seo = jg_get_virtual_archive_seo_data();

    if (!$seo) {
        return;
    }

    echo "\n";

    echo '<meta name="description" content="' .
        esc_attr($seo['description']) .
        '">' . "\n";

    echo '<link rel="canonical" href="' .
        esc_url($seo['canonical']) .
        '">' . "\n";

}, 5);

/**
 * Alte Parameter-URLs auf die neuen SEO-URLs weiterleiten.
 *
 * Wichtig:
 * Nur echte URL-Parameter werden umgeleitet.
 * Die intern durch die Rewrite-Regeln gesetzten Werte
 * jg_new / jg_sale lösen KEINE Weiterleitung aus.
 */
add_action('template_redirect', function () {

    if (!function_exists('is_product_category') || !is_product_category()) {
        return;
    }

    $term = get_queried_object();

    if (
        !$term ||
        !($term instanceof WP_Term) ||
        $term->taxonomy !== 'product_cat'
    ) {
        return;
    }

    /*
     * Nur Damen/Herren Hauptkategorien.
     */
    if (!in_array($term->slug, ['damen', 'herren'], true)) {
        return;
    }

    $base_link = get_term_link($term);

    if (is_wp_error($base_link)) {
        return;
    }

    /*
     * Tatsächliche Query-Parameter aus der aufgerufenen URL lesen.
     *
     * Das ist wichtig, weil $_GET durch unseren parse_request-Hook
     * auch bei /neu/ und /sale/ künstlich gefüllt wird.
     */
    $query_args = [];

    if (!empty($_SERVER['QUERY_STRING'])) {
        parse_str(
            wp_unslash($_SERVER['QUERY_STRING']),
            $query_args
        );
    }

    /*
     * Alte NEU-URL:
     * /product-category/damen/?jg_new=1
     */
    if (
        isset($query_args['jg_new']) &&
        (string) $query_args['jg_new'] === '1'
    ) {
        wp_safe_redirect(
            trailingslashit($base_link) . 'neu/',
            301
        );
        exit;
    }

    /*
     * Alte SALE-URL:
     * /product-category/damen/?jg_sale=1
     */
    if (
        isset($query_args['jg_sale']) &&
        (string) $query_args['jg_sale'] === '1'
    ) {
        wp_safe_redirect(
            trailingslashit($base_link) . 'sale/',
            301
        );
        exit;
    }

}, 20);

/**
 * Sichtbarer SEO-Text für virtuelle NEU-/SALE-Seiten.
 * Shortcode: [jg_virtual_archive_description]
 */
add_shortcode('jg_virtual_archive_description', function () {

    if (!function_exists('is_product_category') || !is_product_category()) {
        return '';
    }

    $term = get_queried_object();

    if (
        !$term ||
        !($term instanceof WP_Term) ||
        $term->taxonomy !== 'product_cat' ||
        !in_array($term->slug, ['damen', 'herren'], true)
    ) {
        return '';
    }

    $new_active =
        (string) get_query_var('jg_new') === '1' ||
        (!empty($_GET['jg_new']) && $_GET['jg_new'] === '1');

    $sale_active =
        (string) get_query_var('jg_sale') === '1' ||
        (!empty($_GET['jg_sale']) && $_GET['jg_sale'] === '1');

    $gender = ($term->slug === 'damen') ? 'Damen' : 'Herren';

    if ($new_active) {

        if ($gender === 'Damen') {
            $text = '
                <h2>Neue Damenmode bei Jeans Gluth</h2>
                <p>
                    Entdecke unsere neu eingetroffene Damenmode bei Jeans Gluth.
                    In unserem Sortiment findest du regelmäßig neue Styles,
                    aktuelle Lieblingsstücke und ausgewählte Mode für verschiedene
                    Größen und Anlässe. Da wir als Familienunternehmen nur über
                    begrenzte Lagerflächen verfügen, sind viele Artikel nur in
                    kleinen Stückzahlen verfügbar.
                </p>
            ';
        } else {
            $text = '
                <h2>Neue Herrenmode bei Jeans Gluth</h2>
                <p>
                    Entdecke unsere neu eingetroffene Herrenmode bei Jeans Gluth.
                    Wir erweitern unser Sortiment regelmäßig um neue Shirts,
                    Hemden, Hosen, Jeans und weitere aktuelle Styles.
                    Viele Artikel sind aufgrund unserer begrenzten Lagerfläche
                    nur in kleinen Stückzahlen verfügbar.
                </p>
            ';
        }

        return '<div class="jg-virtual-archive-description">' . $text . '</div>';
    }

    if ($sale_active) {

        if ($gender === 'Damen') {
            $text = '
                <h2>Damenmode im Sale</h2>
                <p>
                    Entdecke reduzierte Damenmode im Sale bei Jeans Gluth.
                    Hier findest du ausgewählte Kleidung und Accessoires zu
                    reduzierten Preisen. Die verfügbaren Größen und Stückzahlen
                    können begrenzt sein – es lohnt sich daher, regelmäßig
                    vorbeizuschauen.
                </p>
            ';
        } else {
            $text = '
                <h2>Herrenmode im Sale</h2>
                <p>
                    Entdecke reduzierte Herrenmode im Sale bei Jeans Gluth.
                    Hier findest du ausgewählte Shirts, Hemden, Hosen, Jeans
                    und weitere Herrenmode zu reduzierten Preisen.
                    Die verfügbaren Stückzahlen und Größen können begrenzt sein.
                </p>
            ';
        }

        return '<div class="jg-virtual-archive-description">' . $text . '</div>';
    }

    return '';
});

