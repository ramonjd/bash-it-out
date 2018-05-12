<?php
/**
 * Bash_It_Out
 *
 * Achieve your word count goals with this pressure timer.
 *
 * @package Bash_It_Out
 * @since 1.0.0
 */

namespace Bash_It_Out;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once( plugin_dir_path( __FILE__ ) . '/class-bash-it-out-post-routes.php' );

/**
 * Plugin Class
 *
 * @package Bash_It_Out
 * @namespace Bash_It_Out
 */
class Plugin {
	/**
	 * Constants
	 */
	const PLUGIN_VERSION   = '1.0.0';
	const MIN_WP_VERSION   = '4.7';
	const PLUGIN_NAME      = 'Bash It Out';
	const PLUGIN_SLUG      = 'bash-it-out';
	const WINDOW_NAMESPACE = 'bashItOut';

	/**
	 * Init
	 */
	public static function init() {
		return static::get_instance();
	}

	/**
	 * Get instance
	 */
	public static function get_instance() {
		static $instance;
		if ( ! isset( $instance ) ) {
			$self     = get_called_class();
			$instance = new $self();
		}
		return $instance;
	}

	/**
	 * Get instance
	 */
	public function __construct() {
		$this->add_hooks();
	}

	/**
	 * Add custom WordPress hooks
	 */
	private function add_hooks() {
		if (is_admin()) {
			add_action('current_screen', array($this, 'check_current_screen'));
			add_action('admin_menu', array($this, 'register_admin_menu'), 10, 3);
		}

		$this->rest_controller = new Post_Routes( static::PLUGIN_NAME );
	}

	/**
	 * Check the current screen to see if we're on the right admin page before we load client side assets
	 *
	 * @param {WP_Screen} $current_screen (See: https://codex.wordpress.org/Plugin_API/Action_Reference/current_screen).
	 */
	public function check_current_screen( \WP_Screen $current_screen ) {
		if ( 'toplevel_page_bash-it-out-editor' === $current_screen->id ) {
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_clientside_assets' ) );
		}
	}

	/**
	 * Register the admin page
	 */
	public function register_admin_menu() {
		add_menu_page( static::PLUGIN_NAME, static::PLUGIN_NAME, 'manage_options', 'bash-it-out-editor', array( $this, 'render_admin_page' ), 'dashicons-book-alt', 3 );
	}

	/**
	 * Load clientside assets and assign window variables
	 */
	public function enqueue_clientside_assets() {
		wp_enqueue_script( 'bash-it-out-js', plugin_dir_url( __FILE__ ) . 'assets/js/bash-it-out.js', array( 'jquery' ), '1.0', true );
		wp_enqueue_style( 'bash-it-out-css', plugin_dir_url( __FILE__ ) . 'assets/css/bash-it-out.css', null, '1.0', 'all' );
		$js_variables = array(
			'PLUGIN_NAME'           => static::PLUGIN_NAME,
			'PLUGIN_VERSION'        => static::PLUGIN_VERSION,
			'REST_URL'              => esc_url_raw( rest_url() ),
			'PLUGIN_REST_BASE'       => esc_url_raw( rest_url() . Post_Routes::REST_NAMESPACE . Post_Routes::REST_BASE ),
			'PLUGIN_SLUG'           => static::PLUGIN_SLUG,
			'nonce'                 => wp_create_nonce( 'wp_rest' ),
		);
		wp_localize_script( 'bash-it-out-js', static::WINDOW_NAMESPACE, $js_variables );
	}

	/**
	 * Calls our custom rest api to get the saved, bashed-posts
	 *
	 * @return {array} posts with our tag slug
	 */
	public function get_saved_posts() {
		return $this->rest_controller->get_saved_posts();
	}

	/**
	 * Render the admin page
	 */
	public function render_admin_page() {
		include_once __DIR__ . '/templates/admin-page.php';
	}

	/**
	 * Executes when the user activates the plugin
	 */
	public static function activate_plugin() {
		global $wp_version;
		if ( version_compare( $wp_version, static::MIN_WP_VERSION, '<' ) ) {
			// WordPress version is less than static::MIN_WP_VERSION
			die( '<div class="notice notice-error"><strong>' . static::PLUGIN_NAME . '</strong> requires WordPress version <strong>' . static::MIN_WP_VERSION . '</strong></div>' );
		}
	}

	/**
	 * Executes when the user deactivates the plugin
	 */
	public static function deactivate_plugin() {}

	/**
	 * Executes when the user uninstalls the plugin
	 */
	public function uninstall_plugin() {
		// Remove custom post tag.
		wp_delete_term( static::PLUGIN_NAME, 'post_tag' );
	}
}

