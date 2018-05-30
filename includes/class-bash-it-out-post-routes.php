<?php
/**
 * Bash_It_Out
 *
 * Achieve your word count goals with this pressure timer.
 *
 * @package Bash_It_Out
 * @subpackage Bash_It_Out/includes
 * @since 1.0.0
 */

namespace Bash_It_Out;

if ( ! defined( 'WPINC' ) ) {
	exit;
}

/**
 * Custom_Routes Class
 * See: https://developer.wordpress.org/rest-api/extending-the-rest-api/
 *
 * @package Bash_It_Out
 * @link    https://github.com/ramonjd/bash-it-out
 * @subpackage Bash_It_Out/includes
 * @namespace Bash_It_Out
 */
class Post_Routes extends \WP_REST_Controller {
	/**
	 * Constants
	 */
	const REST_NAMESPACE = 'bash-it-out/v1/';
	const REST_BASE      = 'posts';

	/**
	 * Class constructor.
	 *
	 * @param {string} $plugin_name name of plugin.
	 */
	public function __construct( $plugin_name ) {
		if ( empty( $plugin_name ) ) {
			return new WP_Error( 'rest_controller', esc_html__( 'Correct arguments not found' ) );
		}
		$this->plugin_name = $plugin_name;
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register the routes for the objects of the controller.
	 */
	public function register_routes() {
		register_rest_route( static::REST_NAMESPACE, static::REST_BASE, array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_posts' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			),
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'create_post' ),
				'permission_callback' => array( $this, 'permissions_check' ),
				'args'                => $this->get_endpoint_args_for_item_schema( \WP_REST_Server::CREATABLE ),
			),
			'schema' => array( $this, 'get_public_item_schema' ),
		) );

		register_rest_route( static::REST_NAMESPACE, static::REST_BASE . '/(?P<id>[0-9]+)', array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_post' ),
				'permission_callback' => array( $this, 'permissions_check' ),
				'args'                => array(
					'id'      => array(
						'description'       => esc_html__( 'The id of the post' ),
						'type'              => 'integer',
						'validate_callback' => function( $param ) {
							return is_numeric( $param );
						},
					),
					'content' => array(
						'description'       => esc_html__( 'The content of the post' ),
						'type'              => 'string',
						'validate_callback' => function( $param ) {
							return ! empty( $param );
						},
						'sanitize_callback' => function( $value, $request, $param ) {
							return sanitize_text_field( $value );
						},
					),
				),
			),
			array(
				'methods'             => \WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_post' ),
				'permission_callback' => array( $this, 'permissions_check' ),
				'args'                => $this->get_endpoint_args_for_item_schema( \WP_REST_Server::EDITABLE ),
			),
		) );
	}

	/**
	 * Get bash it out posts
	 *
	 * @param {WP_REST_Request} $request Full data about the request.
	 * @return {WP_Error|WP_REST_Response}
	 */
	public function get_posts( $request ) {
		return $this->get_saved_posts();
	}

	/**
	 * Get bash it out post by id
	 *
	 * @param {WP_REST_Request} $request Full data about the request.
	 * @return {WP_Error|WP_REST_Response}
	 */
	public function get_post( $request ) {
		return $this->get_saved_posts( $request->get_param( 'id' ) );
	}

	/**
	 * Create a new bash it out post
	 * See: https://developer.wordpress.org/reference/functions/wp_insert_post/
	 *
	 * @param {WP_REST_Request} $request Full data about the request.
	 * @return {array|WP_Error}
	 */
	public function create_post( $request ) {
		$title = $request->get_param( 'title' );
		if ( isset( $title ) && ! empty( $title ) ) {
			$title = wp_filter_nohtml_kses( sanitize_text_field( $title ) );
		} else {
			$title = date( 'H:i:s, l, F j, Y' ) . ' - ' . $this->plugin_name;
		}

		$content = $request->get_param( 'content' );

		if ( ! isset( $content ) ) {
			return new \WP_Error( 'malformed_request', 'The post could not be updated due to some bad parameters', array( 'status' => 400 ) );
		}

		$user_id   = get_current_user_id();
		$post_args = array(
			'post_author'    => $user_id,
			'post_title'     => $title,
			'post_content'   => $content,
			'post_status'    => 'draft',
			'comment_status' => 'closed',
		);
		$result    = wp_insert_post( $post_args );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// If the result is a post ID.
		if ( is_numeric( $result ) ) {
			// Set the plugin's tag.
			wp_set_post_tags( $result, $this->plugin_name, true );
			return $this->normalize_posts_return_value( array( get_post( $result ) ) );
		}

		return new \WP_Error( 'wp_insert_post', 'The post could not be created. There was no ID in the response.', array( 'status' => 404 ) );
	}

	/**
	 * Update new bash it out post
	 * See: https://developer.wordpress.org/reference/functions/wp_update_post/
	 *
	 * @param {WP_REST_Request} $request Full data about the request.
	 * @return {array|WP_Error}
	 */
	public function update_post( $request ) {
		$id      = $request->get_param( 'id' );
		$content = $request->get_param( 'content' );

		if ( ! isset( $content ) || ! isset( $id ) ) {
			return new \WP_Error( 'malformed_request', 'The post could not be updated due to some bad parameters', array( 'status' => 400 ) );
		}

		$post_args = array(
			'ID'           => $id,
			'post_content' => $content,
		);
		$result    = wp_update_post( $post_args );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// If the result is a post ID.
		if ( 0 !== is_numeric( $result ) && $result ) {
			return $this->normalize_posts_return_value( array( get_post( $result ) ) );
		}

		return new \WP_Error( 'no_post_found', 'No post found with that id', array( 'status' => 404 ) );
	}

	/**
	 * Check if a given request has access to get items
	 *
	 * @return {WP_Error|bool}
	 */
	public function permissions_check() {
		return ( current_user_can( 'editor' ) || current_user_can( 'administrator' ) );
	}

	/**
	 * Gets all posts with our tag
	 *
	 * @param {array} $posts an array of posts return from WP_Query.
	 * @return {array} normalized response
	 */
	private function normalize_posts_return_value( $posts = array() ) {
		$response = array();
		foreach ( $posts as $post ) {
			array_push($response, array(
				'content'  => esc_textarea( $post->post_content ),
				'title'    => $post->post_title,
				'date'     => $post->post_date,
				'id'       => $post->ID,
				'link'     => get_permalink( $post->ID ),
				'modified' => $post->post_modified,
			) );
		}
		return $response;
	}

	/**
	 * Gets all posts with our tag
	 *
	 * @param {number|null} $id a post id.
	 * @return {WP_Query} posts with our tag slug.
	 */
	public function get_saved_posts( $id = null ) {
		$tag_data = get_term_by( 'name', $this->plugin_name, 'post_tag' );
		$args     = array(
			'tag_id'      => $tag_data->term_id,
			'post_status' => array( 'draft', 'pending', 'publishing' ),
			'orderby'     => array(
				'date' => 'DESC',
			),
		);
		if ( isset( $id ) ) {
			$args = array_merge( $args, array(
				'p' => $id,
			)  );
		}
		$query = new \WP_Query( $args );
		if ( ! $query->have_posts() ) {
			return new \WP_Error( 'no_posts_found', 'No posts found', array( 'status' => 404 ) );
		}
		return $this->normalize_posts_return_value( $query->posts );
	}
}
