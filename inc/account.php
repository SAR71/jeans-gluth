<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* Dashboard umbenennen + Downloads entfernen */
add_filter( 'woocommerce_account_menu_items', function( $items ) {

    // Dashboard umbenennen
    if ( isset( $items['dashboard'] ) ) {
        $items['dashboard'] = 'Kontoübersicht';
    }

    // Downloads entfernen
    unset( $items['downloads'] );

    return $items;

});

/* Wunschliste in Wunschzettel umbenennen ***** */
add_filter( 'woocommerce_account_menu_items', 'jg_rename_wishlist_menu_item', 20 );
function jg_rename_wishlist_menu_item( $items ) {

    foreach ($items as $key => $value) {

        if ($value === 'Wunschliste' || $value === 'Wishlist') {
            $items[$key] = 'Wunschzettel';
        }

    }

    return $items;
}
add_filter( 'gettext', 'jg_translate_wishlist_titles', 20, 3 );
function jg_translate_wishlist_titles( $translated, $text, $domain ) {

    if ( $translated === 'Deine Wunschlisten' ) {
        $translated = 'Meine Wunschzettel';
    }

    if ( $translated === 'DEINE WUNSCHLISTEN' ) {
        $translated = 'MEINE WUNSCHZETTEL';
    }

    return $translated;
}
add_action('wp_footer', function () {
    if (!function_exists('is_account_page') || !is_account_page()) return;
    ?>
    <script>
    (function () {
      const FROM = 'my wishlist';
      const TO   = 'Meine Favoriten';

      function norm(s){
        return (s || '')
          .replace(/\s+/g,' ')
          .trim()
          .toLowerCase();
      }

      function replaceNodeText(el){
        // ersetzt nur, wenn der sichtbare Text genau "My wishlist" ist (egal ob Groß/Klein)
        if (!el) return false;
        const t = norm(el.textContent);
        if (t === FROM) {
          el.textContent = TO;
          return true;
        }
        return false;
      }

      function run(){
        let changed = false;

        // 1) exakt dein Element aus dem Screenshot
        document.querySelectorAll('.wd-wishlist-group-title h4.title, h4.title').forEach(el=>{
          changed = replaceNodeText(el) || changed;
        });

        // 2) Fallback: überall dort, wo exakt "My wishlist" steht
        // (wichtig, falls das Markup anders ist als erwartet)
        document.querySelectorAll('h1,h2,h3,h4,h5,div,span,p,a').forEach(el=>{
          // nur kleine Elemente prüfen (Performance)
          if (el.children.length === 0 && (el.textContent || '').length <= 50) {
            changed = replaceNodeText(el) || changed;
          }
        });

        return changed;
      }

      function start(){
        // initial
        run();

        // Observer: wenn das Plugin nachlädt/neu rendert, ersetzen wir sofort wieder
        const obs = new MutationObserver(() => run());
        obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });

        // Fallback: manche Skripte überschreiben per Timer – wir “gewinnen” trotzdem
        let i = 0;
        const timer = setInterval(() => {
          run();
          i++;
          if (i > 30) clearInterval(timer); // nach ~30s stoppen
        }, 1000);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    })();
    </script>
    <?php
}, 9999);
