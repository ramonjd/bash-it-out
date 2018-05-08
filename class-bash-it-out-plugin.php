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

/**
 * Plugin Class
 *
 * @package Bash_It_Out
 * @namespace Bash_It_Out
 */
class Plugin {
	const PLUGIN_VERSION   = '1.0.0';
	const MIN_WP_VERSION   = '4.7';
	const PLUGIN_NAME      = 'Bash It Out';
	const PLUGIN_SLUG      = 'bash-it-out';
	const WINDOW_NAMESPACE = 'bashItOut';
	const REST_NAMESPACE = 'bash-it-out/v1/';

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
		$this->add_taxonomy();
	}

	/**
	 * Register custom post tag
	 */
	private function add_taxonomy() {
		$tag_data = get_term_by( 'name', static::PLUGIN_NAME, 'post_tag' );
		if ( ! $tag_data ) {
			$tag_data = wp_insert_term( static::PLUGIN_NAME, 'post_tag' );
		}
		$this->tag_id   = $tag_data->term_id;
		$this->tag_slug = $tag_data->slug;
	}

	/**
	 * Add custom WordPress hooks
	 */
	private function add_hooks() {
		add_action( 'current_screen', array( $this, 'check_current_screen' ) );
		add_action( 'admin_menu', array( $this, 'register_admin_menu' ), 10, 3 );
		add_action( 'rest_api_init', function () {
			register_rest_route( self::REST_NAMESPACE, 'posts', array(
				'methods'  => \WP_REST_Server::READABLE,
				'callback' => array( $this, 'get_saved_posts_endpoint' ),
				'args'     => array(
					'id' => array(
						'validate_callback' => function( $param ) {
							return is_numeric( $param );
						}
					),
				),
				'permission_callback' => function () {
					return current_user_can( 'editor' ) || current_user_can( 'administrator' );
				}
			) );
		} );
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
			'PLUGIN_REST_URL'       => esc_url_raw( rest_url() . self::REST_NAMESPACE ),
			'PLUGIN_SLUG'           => static::PLUGIN_SLUG,
			'TAG_ID'                => $this->tag_id,
			'nonce'                 => wp_create_nonce( 'wp_rest' ),
		);
		wp_localize_script( 'bash-it-out-js', static::WINDOW_NAMESPACE, $js_variables );
	}

	/**
	 * Gets all posts with our tag
	 *
	 * @param {number|null} $id a post id
	 * @return {WP_Query} posts with our tag slug
	 */
	public function get_saved_posts( $id = null ) {
		$args = array(
			'tag_id'      => $this->tag_id,
			'post_status' => array( 'draft', 'pending', 'publishing' ),
			'orderby'     => array(
				'date' => 'DESC',
			),
		);
		if ( isset(  $id ) ) {
			$args = array_merge( $args, array(
				'p' => $id,
			)  );
		}
		$query = new \WP_Query( $args );
		return $query;
	}

	/**
	 * Gets all posts with our tag custom API endpoint
	 * See: https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/
	 *
	 * @param  WP_REST_Request $request The incoming request.
	 * @return {object|null} Posts or null if none.
	 */
	public function get_saved_posts_endpoint( \WP_REST_Request $request ) {
		$id = $request->get_param( 'id' );
		$posts_query = $this->get_saved_posts( $id );
		if ( ! $posts_query->have_posts() ) {
			return new \WP_Error( 'no_posts_found', 'No posts found', array( 'status' => 404 ) );
		}
		$matching_posts = array();
		$posts = $posts_query->posts;
		foreach( $posts as $post ) {
			//TODO: create custom endpoints to normalize all the responses
			array_push($matching_posts, array(
				'content' => $post->post_content,
				'title' => $post->post_title,
				'id' => $post->ID,
			) );
		}
		return $matching_posts;
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

