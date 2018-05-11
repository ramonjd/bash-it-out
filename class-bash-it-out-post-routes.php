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
 * Custom_Routes Class
 * See: https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/
 *
 * @package Bash_It_Out
 * @namespace Bash_It_Out
 */
class Post_Routes extends \WP_REST_Controller {
	const REST_NAMESPACE = 'bash-it-out/v1/';
	const REST_BASE = 'posts';
	/**
	 * The namespace.
	 *
	 * @var string
	 */
	protected $namespace;

	/**
	 * Category_List_Rest constructor.
	 */
	public function __construct( int $tag_id = null ) {
		if ( empty( $tag_id ) ) {
			return new WP_Error( 'rest_controller', esc_html__( 'Tag ID not found' ) );
		}
		$this->tag_id = $tag_id;
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}
	/**
	 * Register the routes for the objects of the controller.
	 */
	public function register_routes() {
		// register general post routes
		register_rest_route( static::REST_NAMESPACE, static::REST_BASE, array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_posts' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			),
/*			array(
				'methods'         => WP_REST_Server::CREATABLE,
				'callback'        => array( $this, 'create_post' ),
				'permission_callback' => array( $this, 'permissions_check' ),
				'args'            => $this->get_endpoint_args_for_item_schema( true ),
			),*/
		) );

		// register individial post routes
		register_rest_route( static::REST_NAMESPACE, static::REST_BASE . '/(?P<id>[0-9]+)', array(
			array(
				'methods'         => \WP_REST_Server::READABLE,
				'callback'        => array( $this, 'get_post' ),
				'permission_callback' => array( $this, 'permissions_check' ),
				'args'     => array(
					'id' => array(
						'description'       => esc_html__( 'The id of the post' ),
						'type'              => 'integer',
						'validate_callback' => function( $param ) {
							return is_numeric( $param );
						}
					),
					'content' => array(
						'description'       => esc_html__( 'The id of the post' ),
						'type'              => 'string',
						'validate_callback' => function( $param ) {
							return ! empty( $param );
						},
						'sanitize_callback' => function( $value, $request, $param ) {
							return sanitize_text_field( $value );
						}
					),
				),
			),
/*			array(
				'methods'         => WP_REST_Server::EDITABLE,
				'callback'        => array( $this, 'update_post' ),
				'permission_callback' => array( $this, 'permissions_check' ),
				'args'            => $this->get_endpoint_args_for_item_schema( false ),
			),*/
		) );
	}

	/**
	 * Get bash it out posts
	 *
	 * @param {WP_REST_Request} $request Full data about the request.
	 * @return {WP_Error|WP_REST_Response}
	 */
	public function get_posts( \WP_REST_Request $request ) {
		$posts_query = $this->get_saved_posts();
		if ( ! $posts_query->have_posts() ) {
			return new \WP_Error( 'no_posts_found', 'No posts found', array( 'status' => 404 ) );
		}
		return $this->normalize_saved_posts_return_value( $posts_query->posts );
	}

	/**
	 * Get bash it out post by id
	 *
	 * @param {WP_REST_Request} $request Full data about the request.
	 * @return {WP_Error|WP_REST_Response}
	 */
	public function get_post( \WP_REST_Request $request ) {
		$id = $request->get_param( 'id' );
		$posts_query = $this->get_saved_posts( $id );
		if ( ! $posts_query->have_posts() ) {
			return new \WP_Error( 'no_posts_found', 'No posts found', array( 'status' => 404 ) );
		}
		return $this->normalize_saved_posts_return_value( $posts_query->posts );
	}

	/**
	 * Check if a given request has access to get items
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_Error|bool
	 */
	public function permissions_check( $request ) {
		$nonce = wp_verify_nonce( $request->get_param( '_wpnonce' ), 'wp_rest' );
		return ( current_user_can( 'editor' ) || current_user_can( 'administrator' ) );
	}

	/**
	 * Gets all posts with our tag
	 *
	 * @param {array} $posts an array of posts return from WP_Query
	 * @return {array} normalized response
	 */
	private function normalize_saved_posts_return_value( $posts = array() ) {
		$response = array();
		foreach( $posts as $post ) {
			array_push($response, array(
				'content' => $post->post_content,
				'title' => $post->post_title,
				'id' => $post->ID,
			) );
		}
		return $response;
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
}