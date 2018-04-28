<?php
/*
	Plugin name: Bash it out
	Plugin author: Ramon
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
	const VERSION = '1.0';
	static $gutenberg_error_message;

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
			$self = get_called_class();
			$instance = new $self();
		}
		return $instance;
	}

	/**
	 * Get instance
	 */
	public function __construct() {
		if ( is_admin() ) {
			$this->add_hooks();
		}
	}
	// first stage is to only develop for tinymce
	public static function is_plugin_compatible() {
		return is_plugin_active( 'gutenberg/gutenberg.php' ) === false;
	}

	private function add_hooks() {
		add_action( 'add_meta_boxes', array( $this, 'add_custom_meta_box' ), 10, 2 );
		add_action( 'admin_footer-post.php', array( $this, 'render_overseer' ) );
		add_action( 'admin_footer-post-new.php', array( $this, 'render_overseer' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_clientside_assets' ) );
	}

	public function add_custom_meta_box( $post_type, $post ) {
		add_meta_box(
			'bash-it-out-meta-box',
			'Bash it out',
			array( $this, 'render_meta_box' ),
			null,
			'normal',
			'high'
		);
	}

	public static function enqueue_clientside_assets() {
		wp_enqueue_script( 'bash-it-out', plugin_dir_url( __FILE__ ) . '/assets/js/bash-it-out.js', array( 'jquery' ), '1.0', true );
		wp_enqueue_style( 'bash-it-out', plugin_dir_url( __FILE__ ) . '/assets/css/bash-it-out.css', null, '1.0', 'all' );
	}

	public function render_meta_box() {
		include_once __DIR__ . '/templates/meta-box.php';
	}

	public function render_overseer() {
		include_once __DIR__ . '/templates/overseer.php';
	}

	public static function activate_plugin() {
		if ( ! static::is_plugin_compatible() ) {
			wp_die(
				'<p><strong>Bash It Out</strong> doesn\'t yet support the Gutenberg editor</p>',
				'Plugin Activation Error',
				array( 'response'=>200, 'back_link' => true )
			);
		}

	}

	public static function deactivate_plugin() {}

	public static function uninstall_plugin() {}
}

add_action( 'plugins_loaded', array( 'Bash_It_Out\Plugin', 'init' ) );
register_activation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'activate_plugin' ) );
register_deactivation_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'deactivate_plugin' ) );
register_uninstall_hook( __FILE__, array( 'Bash_It_Out\Plugin', 'uninstall_plugin' ) );
?>
