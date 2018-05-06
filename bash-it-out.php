<?php
/**
 * Plugin Name
 *
 * @package     Bash_It_Out
 *
 * @wordpress-plugin
 * Plugin Name: Bash it out
 * Plugin URI:  https://github.com/ramonjd/bash-it-out
 * Description: Forget about quality, form or style. Achieve your word count goals with this pressure timer.
 * Version:     1.0.0
 * Author:      Ramon
 * Author URI:  https://github.com/ramonjd/
 * Text Domain: bash-it-out
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

include __DIR__ . '/class-bash-it-out-plugin.php';

if ( is_admin() ) {
	add_action( 'plugins_loaded', array( 'Bash_It_Out\Plugin', 'init' ) );
}

register_activation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'activate_plugin' ) );
register_deactivation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'deactivate_plugin' ) );
register_uninstall_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'uninstall_plugin' ) );

