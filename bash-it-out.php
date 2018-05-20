<?php
/**
 * Bash It Out
 *
 * @package     Bash_It_Out
 * @link        https://github.com/ramonjd/bash-it-out
 * @since       1.0.0
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

if ( ! defined( 'WPINC' ) ) {
	exit;
}

require_once plugin_dir_path( __FILE__ ) . '/class-bash-it-out-plugin.php';

add_action( 'plugins_loaded', array( 'Bash_It_Out\Plugin', 'init' ) );

register_activation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'activate_plugin' ) );
register_deactivation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'deactivate_plugin' ) );
register_uninstall_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'uninstall_plugin' ) );

