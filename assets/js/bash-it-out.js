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
		if ( ! isAdminPageActive() ) {
			return;
		}

		/*
			Variables
		 */
		var wordCountGoal = 0;
		var writingTime = 0;
		var countDownTimer = null;
		var wpiApiUrls = {
			post: 'wp/v2/posts',
		};
		var currentPostData;
		var autoSave = false;
		var autoSaveTimeout = null;
		var autoSaveInterval = 10000;
		var wordGoalReached = false;
		var pressureTimeout = null;

		/*
			Elements
		 */
		var $container = $( '.bash-it-out__container' );
		var $backgroundShadow = $( '.bash-it-out__shadow-background' );

		// Overseer
		var $overseerBox = $( '.bash-it-out__overseer' );
		var $overseerWordsRemaining = $( '.bash-it-out__words-remaining' );
		var $overseerTimeRemaining = $( '.bash-it-out__time-remaining' );
		var $overseerPauseButton = $( '.bash-it-out__overseer-pause' );
		var $overseerPauseButtonText = $( '.bash-it-out__overseer-pause-text' );
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
		var $editorTextAreaContainer = $( '.bash-it-out__editor-container' );
		var $progressBar = $( '.bash-it-out__progressbar' );

		/*
			Event handlers
		 */
		function onMetaBoxButtonClickHandler( event ) {
			event.preventDefault();
			$( 'html, body' ).animate( {
				scrollTop: $editorTextAreaContainer.position().top
			}, 800 );
			focusEditor();
			writingTime = parseInt( $writingTimeField.val() );
			wordCountGoal = parseInt( $wordGoalField.val() );
			autoSave = true;
			createNewPost();
			$editorTextAreaContainer.addClass( 'bash-it-out__editor-active' );
			$overseerBox.addClass( 'bash-it-out__overseer-active' );
			$backgroundShadow.addClass( 'bash-it-out__shadow-background-active' );
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
			$editorTextAreaContainer.removeClass( 'bash-it-out__editor-active' );
			$backgroundShadow.removeClass( 'bash-it-out__shadow-background-active bash-it-out__shadow-background-annoy' );
			$metaBoxFields.attr( 'disabled', false );
			autoSave = false;
			clearTimeout( pressureTimeout );
		}

		/**
		 * Event handler for Overseer pause button
		 * @returns undefined
		 */
		function onOverseerPauseClick() {
			var pausedState = countDownTimer.toggle();
			if ( pausedState === true ) {
				$overseerPauseButtonText.text( 'Resume' );
				$container.addClass( 'bash-it-out__paused' );
				clearTimeout( pressureTimeout );
			} else {
				$overseerPauseButtonText.text( 'Pause' );
				$container.removeClass( 'bash-it-out__paused' );
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
			clearTimeout( pressureTimeout );
			autoSave = false;
		}

		/**
		 * Callback method we pass to Countdown,
		 * fires on each countdown interval
		 * @returns undefined
		 */
		function onCountdownTick( counterValues ) {
			if ( isAdminPageActive() ) {
				var wordCount = getWordCount();
				$overseerTimeRemaining.text(counterValues.clock);
				$overseerWordsRemaining.text(wordCountGoal - wordCount);
				checkStatusWordCountStatus( wordCount );
				renderProgressBar( wordCount );
			}
		}

		/**
		 * Fires on keyup of the text editor so we can track bashing activity
		 * @returns undefined
		 */
		function onEditorTextAreaKeyUp( event ) {
			// TODO: easter egg track key strokes
			clearTimeout( pressureTimeout );
			$backgroundShadow.removeClass( 'bash-it-out__shadow-background-annoy' );
			startPressureTimer();
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
			return text.split(/\w+/).length - 1;
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

		function onWordGoalCompleted() {
			countDownTimer.stop();
			autoSave = false;
			$overseerWordsRemaining.text( 0 );
			$container.addClass( 'bash-it-out__complete' );
		}

		function renderProgressBar( currentWordCount ) {
			var progressValue = 100;
			if ( currentWordCount < wordCountGoal ) {
				progressValue = Math.floor( currentWordCount / wordCountGoal * 100);
			}
			$progressBar.val( progressValue );
		}

		function checkStatusWordCountStatus ( currentWordCount ) {
			if ( currentWordCount >= wordCountGoal ) {
				if ( wordGoalReached === false ) {
					wordGoalReached = true;
					onWordGoalCompleted();
				}
			} else {
				wordGoalReached = false;
			}
			return wordGoalReached;
		}

		function startPressureTimer() {
			// when $reminderTypeField.val() is up, start nagging by colour/image/sound;
			// increment by fading in colour/image each second after half-way into the pressure time
			clearTimeout( pressureTimeout );
			pressureTimeout = setTimeout( function() {
				$backgroundShadow.addClass( 'bash-it-out__shadow-background-annoy' );
			}, $reminderTypeField.val() );
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
					if ( ! response ) {
						countDownTimer.stop();
						//TODO: show error
					}
					//TODO: abstract this
					currentPostData = response;
					$lastAutoSave.html( '<a href="response.link">' + response.title.rendered + '</a> saved.' );

					if ( autoSave === true ) {
						triggerAutoSave();
					}
				},
				error: function( error ) {
					countDownTimer.stop();
					//TODO: show error
				}
			} );
		}

		/**
		 * Kicks off a timedout autosave
		 * @returns {number} word count in editor textarea
		 */
		function triggerAutoSave() {
			if ( isAdminPageActive() ) {
				clearTimeout( autoSaveTimeout );
				autoSaveTimeout = setTimeout( updatePost, autoSaveInterval );
			}
		}

		/**
		 * Stops autosave
		 * @returns {number} word count in editor textarea
		 */
		function cancelAutoSave() {
			clearTimeout( autoSaveTimeout );
			autoSave === false;
			autoSaveTimeout = null;
		}

		/**
		 * Updates current post
		 * TODO: could we do this with https://developer.wordpress.org/plugins/javascript/heartbeat-api/ ?
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
					//TODO: abstract this
					$lastAutoSave.html( '<a href="response.link">' + response.title.rendered + '</a> autosaved at: ' + new Date( response.modified ).toLocaleTimeString() );
					if ( autoSave === true ) {
						triggerAutoSave();
					}
				},
				error: function( error ) {
					countDownTimer.stop();
					//TODO: show error
				}
			} );
		}

		/**
		 * Checks if we're on the admin page and cancels all timeouts if not
		 * @returns {boolean} if we're on the page
		 */
		function isAdminPageActive() {
			var $identifier = $( '#bash-it-out-identifier' );
			if ( $identifier.length < 1 ) {
				// We're no longer on the page Toto
				cancelAutoSave();
				countDownTimer && countDownTimer.stop();
				return false;
			}
			return true;
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
				},
				isPaused: function() {
					return paused;
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
		$editorTextArea.on( 'keyup', onEditorTextAreaKeyUp );

		countDownTimer = Countdown( onCountdownComplete, onCountdownTick );


	} );
}( jQuery, window.bashItOut ) );