<?php
if ( ! defined( 'ABSPATH' ) ) exit;

echo '<h2>START: ' . round( memory_get_usage(true) / 1024 / 1024, 1 ) . ' MB</h2>';

get_header();

echo '<h2>HEADER FERTIG: ' . round( memory_get_usage(true) / 1024 / 1024, 1 ) . ' MB</h2>';

while ( have_posts() ) {
    the_post();

    echo '<h2>VOR CONTENT: ' . round( memory_get_usage(true) / 1024 / 1024, 1 ) . ' MB</h2>';

    echo woodmart_get_the_content();

    echo '<h2>NACH CONTENT: ' . round( memory_get_usage(true) / 1024 / 1024, 1 ) . ' MB</h2>';
}

echo '<h2>VOR FOOTER: ' . round( memory_get_usage(true) / 1024 / 1024, 1 ) . ' MB</h2>';

get_footer();

echo '<h2>FOOTER FERTIG: ' . round( memory_get_usage(true) / 1024 / 1024, 1 ) . ' MB</h2>';