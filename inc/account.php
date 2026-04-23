<?php
// LastChanged: 2026-04-23 23:01:28
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
      const MAX_RUNTIME_MS = 12000;

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
        // Primärer Treffer: nur relevante Wishlist-Überschriften durchsuchen.
        const directTargets = document.querySelectorAll(
          '.wd-wishlist-group-title h4.title, .wd-wishlist-group-title .title, h4.title'
        );

        for (const el of directTargets) {
          if (replaceNodeText(el)) {
            return true;
          }
        }

        // Fallback in engem Scope statt kompletter Dokument-Iteration.
        const scopedRoots = document.querySelectorAll(
          '.wd-wishlist-content, .wd-wishlist-group, .woocommerce-MyAccount-content'
        );

        for (const root of scopedRoots) {
          const nodes = root.querySelectorAll('h1,h2,h3,h4,h5,span,p,a,div');
          for (const el of nodes) {
            if (el.children.length === 0 && (el.textContent || '').length <= 50 && replaceNodeText(el)) {
              return true;
            }
          }
        }

        return false;
      }

      function start(){
        const startedAt = Date.now();
        if (run()) return;

        let rafQueued = false;
        const obs = new MutationObserver(() => {
          if (Date.now() - startedAt > MAX_RUNTIME_MS) {
            obs.disconnect();
            return;
          }

          if (rafQueued) return;
          rafQueued = true;

          requestAnimationFrame(() => {
            rafQueued = false;
            if (run()) {
              obs.disconnect();
            }
          });
        });

        const observerRoot = document.querySelector('.woocommerce-MyAccount-content') || document.body;
        if (observerRoot) {
          obs.observe(observerRoot, { childList: true, subtree: true, characterData: true });
        }

        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          if (run() || attempts >= 12 || Date.now() - startedAt > MAX_RUNTIME_MS) {
            clearInterval(timer);
            obs.disconnect();
          }
        }, 500);
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
