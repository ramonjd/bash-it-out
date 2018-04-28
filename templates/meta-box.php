<?php
	//wp_nonce_field( basename(__FILE__), 'meta-box-nonce' );
	//https://www.sitepoint.com/adding-custom-meta-boxes-to-wordpress/

	if ( Bash_It_Out\Plugin::is_plugin_compatible() ) {
?>
		<label for="bash-it-out-writing-time">
			<span>Writing time (mins)</span>
			<input type="number" min="10" max="1000" step="10" value="30" name="bash-it-out-writing-time" id="bash-it-out-writing-time" />
		</label>
		<label for="bash-it-out-word-goal">
			<span>Word goal</span>
			<input type="number" min="100" max="10000" step="100" value="100" name="bash-it-out-word-goal" id="bash-it-out-word-goal" />
		</label>
		<label for="bash-it-out-reminder-type">
			<span>Reminder type</span>
			<select name="bash-it-out-reminder-type" id="bash-it-out-reminder-type">
				<option value="1">Nice old lady</option>
				<option value="2">Angry editor</option>
			</select>
		</label>
		<button class="bash-it-out__start">Start</button>
<?php
	} else {
		echo '<p><strong>Bash It Out</strong> doesn\'t yet support the Gutenberg editor</p>';
	}
?>



