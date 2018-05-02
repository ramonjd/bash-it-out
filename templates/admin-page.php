<div class="bash-it-out__container">
	<h1>
		<?php echo get_admin_page_title(); ?>
	</h1>
	<?php
		if ( ! get_option( 'permalink_structure' ) ) {
			echo get_admin_page_title() . ' uses the WP API, which requires you to enable <a href="https://codex.wordpress.org/Using_Permalinks">pretty permalinks</a>.';
		}
	?>
	<div class="bash-it-out__settings">
		<label class="bash-it-out__field-container" for="bash-it-out-writing-time">
			<span>Writing time (mins)</span>
			<input type="number" min="10" max="1000" step="10" value="30" name="bash-it-out-writing-time" id="bash-it-out-writing-time" />
		</label>
		<label class="bash-it-out__field-container" for="bash-it-out-word-goal">
			<span>Word goal</span>
			<input type="number" min="100" max="10000" step="100" value="100" name="bash-it-out-word-goal" id="bash-it-out-word-goal" />
		</label>
		<label class="bash-it-out__field-container" for="bash-it-out-reminder-type">
			<span>Reminder type</span>
			<select name="bash-it-out-reminder-type" id="bash-it-out-reminder-type">
				<option value="1">Nice old lady</option>
				<option value="2">Angry editor</option>
			</select>
		</label>
		<button type="button" class="bash-it-out__start button button-primary button-large">Bash it out!</button>
		<p>Hitting start will create a new draft post. Your work will be autosaved every 10s</p>
	</div>

	<div class="bash-it-out__editor-container">
		<?php
			// see: https://developer.wordpress.org/reference/functions/wp_editor/
			$content   = '';
			$editor_id = 'bash-it-out-editor';
			$settings = array(
				'wpautop' => true,
				'media_buttons' => false,
				'textarea_name' => $editor_id,
				'textarea_rows' => 20,
				'tabindex' => '',
				'tabfocus_elements' => ':prev,:next',
				'editor_css' => '',
				'editor_class' => '',
				'teeny' => false,
				'dfw' => false,
				'tinymce' => false,
				'quicktags' => true
			);
			wp_editor( $content, $editor_id, $settings );
		?>
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
				<h3>Words remaining</h3>
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

	<div class="bash-it-out__shadow-background"></div>
	<input type="hidden" id="bash-it-out-identifier" name="bash-it-out-identifier" value="<?php echo get_admin_page_title(); ?>" />
</div>
