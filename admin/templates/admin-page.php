<?php
/**
 * Admin page template
 *
 * @package     Bash_It_Out
 */

?>

<div class="bash-it-out__container">
	<aside class="bash-it-out__sidebar postbox">
		<img class="bash-it-out__fist" src="<?php echo esc_attr( plugin_dir_url( __FILE__ ) . '../../assets/images/bash-it-out.png' ); ?>" alt="<?php echo esc_attr( get_admin_page_title() ); ?>" />
		<h1>
			<?php echo esc_html( get_admin_page_title() ); ?>
		</h1>
		<?php
		    $bash_it_out_tag_html = '<strong>' . esc_html( get_admin_page_title() ) . '</strong>';
		    if ( method_exists( 'Bash_It_Out\Plugin', 'get_tag_info' ) ) {
				$bash_it_out_tag_html = '<a href="' . esc_html( Bash_It_Out\Plugin::get_tag_info()['link'] ) . '">' . $bash_it_out_tag_html . '</a>';
			}
		?>
		<p> Can't reach your word count goals? Does writer's block have its craggy hand around the throat of your creativity? Sometimes just bashing something out is the answer. Set your word count goal below, along with a time limit and let your fingers fly. Your editor will remind you should you falter. Happy writing!</p>
		<p>Every time you bash one out, it creates a new draft post with the tag <?php echo $bash_it_out_tag_html ?>. Your work will be autosaved every 10 seconds.</p>
		<fieldset class="bash-it-out__settings">
			<label class="bash-it-out__field-container" for="bash-it-out-writing-time">
				<span class="bash-it-out__label-text bash-it-out__label-group">Writing time (mins)</span>
				<input type="number" min="10" max="1000" step="10" value="30" name="bash-it-out-writing-time" id="bash-it-out-writing-time" />
			</label>
			<label class="bash-it-out__field-container" for="bash-it-out-word-goal">
				<span class="bash-it-out__label-group">
					<span class="bash-it-out__label-text">Word goal</span>
					<span class="bash-it-out__tooltip">
						<span class="dashicons dashicons-editor-help"></span>
						<dfn title="Word goal" class="bash-it-out__tooltip-content">Words are all numbers and letters with one or more characters. If you've loaded a previously-saved post, this number will be in addition to the loaded post's total count.</dfn>
					</span>
				</span>
				<input type="number" min="100" max="2000" step="100" value="500" name="bash-it-out-word-goal" id="bash-it-out-word-goal" />
			</label>
			<label class="bash-it-out__field-container" for="bash-it-out-reminder-type">
				<span class="bash-it-out__label-group">
					<span class="bash-it-out__label-text">Type of reminder:</span>
					<span class="bash-it-out__tooltip">
						<span class="dashicons dashicons-editor-help"></span>
						<dfn title="Type of reminder" class="bash-it-out__tooltip-content">Set the time before your editor reminds/nags you to keep bashing it out.</dfn>
					</span>
				</span>
				<select name="bash-it-out-reminder-type" id="bash-it-out-reminder-type">
					<option value="15000">Sleepy editor (15s)</option>
					<option value="10000" selected>Friendly editor (10s)</option>
					<option value="5000">Angry editor (5s)</option>
				</select>
			</label>
			<button type="button" class="bash-it-out__start button button-primary button-large">
				Bash it out!
				<span class="dashicons dashicons-hammer"></span>
			</button>
		</fieldset>
		<?php
		if ( method_exists( 'Bash_It_Out\Plugin', 'get_saved_posts' ) ) {
			$posts           = Bash_It_Out\Plugin::get_saved_posts();
			$has_posts       = is_array( $posts ) && ! empty( $posts );
			$container_class = $has_posts ? '' : 'hidden';
			?>
			<fieldset class="bash-it-out__fieldset-saved-posts <?php echo esc_attr( $container_class ); ?>">
				<label class="bash-it-out__field-container" for="bash-it-out-saved-posts">
					<span class="bash-it-out__label-text bash-it-out__label-group">Load a previously bashed-out post</span>
					<select name="bash-it-out-saved-posts" id="bash-it-out-saved-posts" >
						<?php
						if ( $has_posts ) {
							foreach ( $posts as $post ) {
								?>
								<option value="<?php echo esc_attr( $post['id'] ); ?>"><?php echo esc_html( $post['title'] ); ?></option>
							<?php
							}
						}
						?>
					</select>
				</label>
				<button type="button" class="bash-it-out__load-post button button-secondary">
					Load post into editor
				</button>
			</fieldset>
			<?php
		}
		?>
	</aside>
	<main class="bash-it-out__editor-container">
		<h2 class="bash-it-out__current-post-title"></h2>
		<?php
			// WP Editor. See: https://developer.wordpress.org/reference/functions/wp_editor/.
			$content   = '';
			$editor_id = 'bash-it-out-editor';
			$settings  = array(
				'wpautop'           => true,
				'media_buttons'     => false,
				'textarea_name'     => $editor_id,
				'textarea_rows'     => 30,
				'tabindex'          => '',
				'tabfocus_elements' => ':prev,:next',
				'editor_css'        => '',
				'editor_class'      => '',
				'teeny'             => false,
				'dfw'               => false,
				'tinymce'           => false,
				'quicktags'         => false,
			);
			wp_editor( $content, $editor_id, $settings );
		?>
		<img class="bash-it-out__annoying-editor" src="<?php echo esc_attr( plugin_dir_url( __FILE__ ) . '../../assets/images/editor.png' ); ?>" alt="Editor says: You stopped writing!" />
		<img class="bash-it-out__happy-editor" src="<?php echo esc_attr( plugin_dir_url( __FILE__ ) . '../../assets/images/editor-complete.png' ); ?>" alt="Editor says: You finished your writing goals!" />
		<div class="bash-it-out__reset-container">
			<button type="button" class="bash-it-out__save-now button button-secondary button-small">
				Save now
			</button>
			<button type="button" class="bash-it-out__reset button button-secondary button-small">
				Reset (Saves and clears the editor)
			</button>
			<div class="bash-it-out__reset_autosave"></div>
		</div>
		<div class="bash-it-out__overseer">
			<progress  class="bash-it-out__progressbar" value="0" max="100">0%</progress>
			<div class="bash-it-out__overseer-container">
				<div class="bash-it-out__overseer-column">
					<span class="bash-it-out__autosave"></span>
				</div>
				<div class="bash-it-out__overseer-column">
					<h3>Time remaining</h3>
					<time class="bash-it-out__time-remaining">--:--:--</time>
				</div>
				<div class="bash-it-out__overseer-column">
					<h3>Words
						<span class="bash-it-out__tooltip">
							<span class="dashicons dashicons-editor-help"></span>
							<dfn title="Word goal" class="bash-it-out__tooltip-content">Represents the word count goal for this session, minus any already-saved words</dfn>
						</span>
					</h3>
					<output class="bash-it-out__words-remaining">-</output>
				</div>
				<div class="bash-it-out__overseer-column">
					<button type="button" class="bash-it-out__overseer-pause button button-primary button-large">
						<span class="dashicons dashicons-controls-pause"></span>
						<span class="dashicons dashicons-controls-play hidden"></span>
						<span class="bash-it-out__overseer-pause-text">Pause</span>
					</button>
				</div>
				<div class="bash-it-out__overseer-column">
					<button type="button" class="bash-it-out__overseer-quit button button-primary button-large">Quit</button>
				</div>
			</div>
		</div>
	</main>
	<div class="bash-it-out__shadow-background"></div>
	<input type="hidden" id="bash-it-out-identifier" name="bash-it-out-identifier" value="<?php echo esc_attr( get_admin_page_title() ); ?>" />
</div>
