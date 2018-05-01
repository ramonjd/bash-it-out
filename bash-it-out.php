<?php
/*
	Plugin name: Bash it out
	Plugin author: ramonjd
	Plugin URI: https://github.com/ramonjd/bash-it-out
	Version: 1.0
	Description: Forget about quality, form or style. Achieve your word count goals with this pressure timer.
	License: GPL2

	{Plugin Name} is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 2 of the License, or
	any later version.

	{Plugin Name} is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with {Plugin Name}. If not, see {License URI}.
 */

namespace Bash_It_Out;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Plugin {
	const PLUGIN_VERSION = '1.0';
	const PLUGIN_NAME = 'Bash It Out';
	const PLUGIN_SLUG = 'bash-it-out';
	const WINDOW_NAMESPACE = 'bashItOut';
	/**
	 * Init
	 */
	public static function init() {
		if ( ! is_admin() ) {
			exit;
		}
		return static::get_instance();
	}

	/**
	 * Get instance
	 */
	public static function get_instance() {
		static $instance;
		if ( ! isset( $instance ) ) {
			$self = get_called_class();
			$instance = new $self();
		}
		return $instance;
	}

	/**
	 * Get instance
	 */
	public function __construct() {
		$this->add_hooks();
		// get the tag id so we can assign new posts to it
		$tag_data = get_term_by( 'name', static::PLUGIN_NAME, 'post_tag' );
		if ( ! $tag_data ) {
			$tag_data = wp_insert_term( static::PLUGIN_NAME, 'post_tag' );
		}
		$this->tag_id = $tag_data->term_id;
	}

	private function add_hooks() {
		add_action( 'current_screen', array( $this, 'check_current_screen' ) );
		add_action( 'admin_menu', array( $this, 'register_admin_menu' ), 10, 3 );
	}

	public function check_current_screen( $current_screen ) {
		if ( $current_screen->id === 'toplevel_page_bash-it-out-editor' ) {
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_clientside_assets' ) );
		}
	}

	public function register_admin_menu() {
		add_menu_page( static::PLUGIN_NAME, static::PLUGIN_NAME, 'manage_options', 'bash-it-out-editor', array( $this, 'render_admin_page' ), '
dashicons-book-alt', 3 );
	}

	public function enqueue_clientside_assets() {
		wp_enqueue_script( 'bash-it-out-js', plugin_dir_url( __FILE__ ) . '/assets/js/bash-it-out.js', array( 'jquery' ), '1.0', true );
		wp_enqueue_style( 'bash-it-out-css', plugin_dir_url( __FILE__ ) . '/assets/css/bash-it-out.css', null, '1.0', 'all' );
		$js_variables = array(
			'PLUGIN_NAME'       => static::PLUGIN_NAME,
			'PLUGIN_VERSION'    => static::PLUGIN_VERSION,
			'REST_URL'          => esc_url_raw( rest_url() ),
			'PLUGIN_SLUG'       => static::PLUGIN_SLUG,
			'TAG_ID'            => $this->tag_id,
			'nonce'             => wp_create_nonce( 'wp_rest' ),
		);
		wp_localize_script( 'bash-it-out-js', static::WINDOW_NAMESPACE, $js_variables );
	}

	public function render_admin_page() {
		include_once __DIR__ . '/templates/admin-page.php';
	}

	public static function activate_plugin() {
		// register custom post tag
		wp_insert_term( static::PLUGIN_NAME, 'post_tag' );
	}

	public static function deactivate_plugin() {

	}

	public function uninstall_plugin() {
		// remove custom post tag
		wp_delete_term( static::PLUGIN_NAME, 'post_tag' );
	}
}

add_action( 'plugins_loaded', array( 'Bash_It_Out\Plugin', 'init' ) );
register_activation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'activate_plugin' ) );
register_deactivation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'deactivate_plugin' ) );
register_uninstall_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'uninstall_plugin' ) );
?>
