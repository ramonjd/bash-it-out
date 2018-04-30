( function( $, _bio ){
	$( function() {

		/*
			Dependency checks
		*/
		if ( typeof $ !== 'function' ) {
			log( 'Dependency `jQuery` not found', 'error' );
			return;
		}

		if ( typeof _bio !== 'object' ) {
			log( 'Dependency `_bio` not found', 'error' );
			return;
		}

		// only run the script on the admin page
		var $container = $( '.bash-it-out__container' );
		if ( $container.length < 1 ) {
			return;
		}

		/*
			Variables
		 */
		var wordCountGoal = 0;
		var writingTime = 0;
		var countDownTimer = null;
		var wordCountRegex = /[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g;
		// we'll use the WordPress word count util if we can find it
		var wpWordCount = window.wp && window.wp.utils && window.wp.utils.WordCounter ? new window.wp.utils.WordCounter() : null;
		var wpiApiUrls = {
			post: 'wp/v2/posts',
		};
		var currentPostData;
		var autoSave = false;
		var autoSaveTimeout = null;
		var autoSaveInterval = 10000;

		/*
			Elements
		 */
		// Overseer
		var $overseerBox = $( '.bash-it-out__overseer' );
		var $overseerWordsRemaining = $( '.bash-it-out__words-remaining' );
		var $overseerTimeRemaining = $( '.bash-it-out__time-remaining' );
		var $overseerPauseButton = $( '.bash-it-out__overseer-pause' );
		var $overseerQuitButton = $( '.bash-it-out__overseer-quit' );
		var $lastAutoSave = $( '.bash-it-out__autosave' );

		// Settings
		var $metaBoxStartButton = $( '.bash-it-out__start' );
		var $writingTimeField = $( 'input[name="bash-it-out-writing-time"]' );
		var $wordGoalField = $( 'input[name="bash-it-out-word-goal"]' );
		var $reminderTypeField = $( 'select[name="bash-it-out-reminder-type"]' );
		var $metaBoxFields = $writingTimeField.add( $wordGoalField, $reminderTypeField, $metaBoxStartButton );

		// Editor
		var $editorTextArea = $( '#bash-it-out-editor' );

		/*
			Event handlers
		 */
		function onMetaBoxButtonClickHandler( event ) {
			event.preventDefault();
			$( 'html, body' ).animate( {
				scrollTop: $editorTextArea.position().top
			}, 800 );
			focusEditor();
			writingTime = parseInt( $writingTimeField.val() );
			wordCountGoal = parseInt( $wordGoalField.val() );
			autoSave = true;
			createNewPost();
			$overseerBox.addClass( 'bash-it-out__overseer-active' );
			$overseerWordsRemaining.text( wordCountGoal - getWordCount() );
			countDownTimer.set( parseInt( writingTime ) );
			$overseerTimeRemaining.text( countDownTimer.getClock() );
			countDownTimer.start();
			$metaBoxFields.attr( 'disabled', true );
		}

		/**
		 * Event handler for Overseer stop/quit button
		 * @returns undefined
		 */
		function onOverseerQuitClick() {
			countDownTimer.stop();
			$overseerBox.removeClass( 'bash-it-out__overseer-active bash-it-out__overseer-complete' );
			$metaBoxFields.attr( 'disabled', false );
			autoSave = false;
		}

		/**
		 * Event handler for Overseer pause button
		 * @returns undefined
		 */
		function onOverseerPauseClick() {
			var pausedState = countDownTimer.toggle();
			if ( pausedState === true ) {
				$overseerPauseButton.text( 'Resume' );
			} else {
				$overseerPauseButton.text( 'Pause' );
			}
			autoSave = false;
		}

		/**
		 * Callback method we pass to Countdown,
		 * fires when countdown timer expires
		 * @returns undefined
		 */
		function onCountdownComplete() {
			$overseerBox.addClass( 'bash-it-out__overseer-complete' );
			autoSave = false;
		}

		/**
		 * Callback method we pass to Countdown,
		 * fires on each countdown interval
		 * @returns undefined
		 */
		function onCountdownTick( counterValues ) {
			$overseerTimeRemaining.text( counterValues.clock );
			$overseerWordsRemaining.text( wordCountGoal - getWordCount() );
		}

		/**
		 * Focusses on editor textarea and places the cursor at the end of content
		 * @returns undefined
		 */
		function focusEditor() {
			$editorTextArea.focus();
			setTimeout( function() {
				$editorTextArea[ 0 ].selectionStart = $editorTextArea[ 0 ].selectionEnd = getCharCount() + 1;
			}, 0 );
		}

		/**
		 * Returns character count
		 * @returns {number} char count in editor textarea
		 */
		function getCharCount() {
			var textLength = $editorTextArea.val().length;
			return textLength > 0 ? textLength : 0;
		}

		/**
		 * Returns word count
		 * @returns {number} word count in editor textarea
		 */
		function getWordCount() {
			var text = $editorTextArea.val();
			return wpWordCount
				? wc.count( text )
				: ( text.length > 0 ? text.match( wordCountRegex ).length : 0 );
		}

		/**
		 * Returns a title for a new post or page
		 * currently a formatted date and time
		 * @returns {string}
		 */
		function getContentTitle() {
			var date = new Date();
			return [
				_bio.PLUGIN_NAME,
				': ',
				// TODO: localize
				date.toLocaleDateString( 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } ),
				' ',
				date.toLocaleTimeString()
			].join('');
		}

		/**
		 * Creates new post
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function createNewPost() {
			var tags = {
				0:  _bio.TAG_ID
			};
			return $.ajax( {
				method: 'POST',
				url: _bio.REST_URL + wpiApiUrls[ 'post' ],
				data: {
					title:  getContentTitle(),
					content: $editorTextArea.val(),
					comment_status: 'closed',
					type: 'post',
					status: 'draft',
					tags: tags
				},
				beforeSend: function ( xhr ) {
					xhr.setRequestHeader( 'X-WP-Nonce', _bio.nonce );
				},
				success : function( response ) {
					currentPostData = response;
					$lastAutoSave.text( 'Last autosave: ' + response.modified );
					if ( autoSave === true ) {
						triggerAutoSave();
					}
				}
			} );
		}

		/**
		 * Kicks off a timedout autosave
		 * @returns {number} word count in editor textarea
		 */
		function triggerAutoSave() {
			autoSaveTimeout = setTimeout( updatePost, autoSaveInterval );
		}

		/**
		 * Kicks off a timedout autosave
		 * @returns {number} word count in editor textarea
		 */
		function cancelAutoSave() {
			clearTimeout( autoSaveTimeout );
			autoSave === false;
			autoSaveTimeout = null;
		}

		/**
		 * Updates current post
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function updatePost() {
			return $.ajax( {
				method: 'POST',
				url: _bio.REST_URL + wpiApiUrls[ 'post' ] + '/' + currentPostData.id,
				data: {
					content: $editorTextArea.val(),
				},
				beforeSend: function ( xhr ) {
					xhr.setRequestHeader( 'X-WP-Nonce', _bio.nonce );
				},
				success : function( response ) {
					currentPostData = response;
					// eslint-disable-next-line
					console.log( 'updated', response );
					$lastAutoSave.text( 'Last autosave: ' + response.modified );
					if ( autoSave === true ) {
						triggerAutoSave();
					}
				}
			} );
		}

		/**
		 * Displays console message
		 * @param {string} message the message to be displayed
		 * @param {string} type a window.console method (warn|error|info|log)
		 * @returns {number} word count in editor textarea
		 */
		function log( message, type ) {
			type = type || 'info';
			if ( 'console' in window && typeof window.console[ type ] === 'function' ) {
				console.log( _bio.PLUGIN_NAME + ' v.' + _bio.PLUGIN_VERSION + ': %s', message );
			}
		}

		/*
			Countdown
			1 min : 60s
			30 min : 1800s
			1 hour : 3600s
		*/
		function Countdown( onComplete, onTick ) {
			var timerInterval = 1000;
			var complete = false;
			// duration is in seconds
			var duration = 1800;
			var countdown = 0;
			var clock = '00:00:00';
			var end = '';
			// in milliseconds
			var s = 1000;
			var m = s * 60;
			var h = m * 60;
			var d = h * 24;
			var timer;
			var divider = ':';
			var now;
			var distance;
			var paused = true;

			function reset() {
				clock = '00:00:00';
				stop();
				return clock;
			}

			function pad( n ) {
				n = parseInt( n, null );
				return ( n < 10 && n >= 0 ) ? ( '0' + n ) : n;
			}

			function getCompletedTimePercentage( current, duration ) {
				var seconds = current / 1000;
				return 100 - Math.floor( seconds / duration * 100 );
			}

			function set( newDurationInMinutes ) {
				if ( newDurationInMinutes ) {
					duration = newDurationInMinutes * 60;
				}
				// set out seconds countdown to track seconds
				// let's add one second to account for the first setInterval delay
				countdown = duration + 1;

				var durationInMilliseconds = duration * 1000;
				clock = [
					pad( Math.floor( ( durationInMilliseconds % d ) / h ) ),
					pad( Math.floor( ( durationInMilliseconds % h ) / m ) ),
					pad( Math.floor( ( durationInMilliseconds % m ) / s ) )
				].join( divider );
			}

			function start() {
				end = new Date();
				// add selected seconds to current time
				end.setSeconds( end.getSeconds() + countdown );
				timer = setInterval( render, timerInterval );
				paused = false;
			}

			function render() {
				now = new Date();
				distance = end.getTime() - now.getTime();

				if ( distance < 0 ) {
					reset();
					onComplete();
					return false;
				}

				// key
				// day =  Math.floor(distance / d);
				// hour = Math.floor((distance % d) / h);
				// min = Math.floor((distance % h) / m);
				// sec = Math.floor((distance % m) / s);
				clock = [
					pad( Math.floor( ( distance % d ) / h ) ),
					pad( Math.floor( ( distance % h ) / m ) ),
					pad( Math.floor( ( distance % m ) / s ) )
				].join( divider );

				countdown--;

				onTick( {
					clock: clock,
					percentage: getCompletedTimePercentage( distance, duration )
				} );
			}

			function pause() {
				clearInterval( timer );
				paused = true;
			}

			function stop() {
				complete = true;
				clearInterval( timer );
				paused === true;
			}

			function toggle() {
				if ( paused === true ) {
					start();
				} else {
					pause();
				}
				return paused;
			}

			return {
				start: start,
				pause: pause,
				stop: stop,
				toggle: toggle,
				set: set,
				reset: reset,
				getClock: function() {
					return clock;
				}
			};
		}


		/*
			Init
		 */
		// assign event handlers
		if ( $metaBoxStartButton.length ) {
			$metaBoxStartButton.on( 'click', onMetaBoxButtonClickHandler );
		}

		$overseerQuitButton.on( 'click', onOverseerQuitClick );
		$overseerPauseButton.on( 'click', onOverseerPauseClick );

		countDownTimer = Countdown( onCountdownComplete, onCountdownTick );

		// setup warnings
		if ( ! wpWordCount ) {
			log( 'The WordPress javascript library `wp.utils.WordCounter` couldn\'t be loaded. Using fallback.', 'warn' );
		}

	} );
}( jQuery, window.bashItOut ) );