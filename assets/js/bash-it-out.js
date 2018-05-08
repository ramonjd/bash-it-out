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
			Constants
		 */
		var AUTO_SAVE_INTERVAL = 10000;
		var REST_URLS = {
			post: _bio.REST_URL + 'wp/v2/posts',
			get: _bio.PLUGIN_REST_URL + 'posts'
		};

		/*
			Variables
		 */
		var wordCountGoal = 0;
		var writingTime = 0;
		var countDownTimer = null;
		var currentPostData = null;
		var autoSave = false;
		var autoSaveTimeout = null;
		var hasReachedWordGoal = false;
		var pressureTimeout = null;
		// This represents the word count of a saved post
		var baseWordCount = 0;

		/*
			Elements
		 */
		var $container = $( '.bash-it-out__container' );

		// Overseer
		var $overseerWordsRemaining = $( '.bash-it-out__words-remaining' );
		var $overseerTimeRemaining = $( '.bash-it-out__time-remaining' );
		var $overseerPauseButton = $( '.bash-it-out__overseer-pause' );
		var $overseerPauseButtonText = $( '.bash-it-out__overseer-pause-text' );
		var $overseerQuitButton = $( '.bash-it-out__overseer-quit' );
		var $lastAutoSave = $( '.bash-it-out__autosave' );

		// Settings
		var $settingsBoxStartButton = $( '.bash-it-out__start' );
		var $settingsBoxLoadPostButton = $( '.bash-it-out__load-post' );
		var $settingsBoxResetButton = $( '.bash-it-out__reset' );
		var $writingTimeField = $( 'input[name="bash-it-out-writing-time"]' );
		var $wordGoalField = $( 'input[name="bash-it-out-word-goal"]' );
		var $reminderTypeField = $( 'select[name="bash-it-out-reminder-type"]' );
		var $savedPostsField = $( 'select[name="bash-it-out-saved-posts"]' );
		var $resetAutoSave = $( '.bash-it-out__reset_autosave' );
		var $settingsBoxFields = $writingTimeField.add( $savedPostsField, $wordGoalField, $reminderTypeField, $settingsBoxStartButton, $settingsBoxLoadPostButton, $settingsBoxResetButton );

		// Editor
		var $editorTextArea = $( '#bash-it-out-editor' );
		var $editorTextAreaContainer = $( '.bash-it-out__editor-container' );
		var $progressBar = $( '.bash-it-out__progressbar' );

		/*
			Event handlers
		 */
		function onStartButtonClick( event ) {
			event.preventDefault();
			$( 'html, body' ).animate( {
				scrollTop: $editorTextAreaContainer.position().top
			}, 800 );
			focusEditor();
			writingTime = parseInt( $writingTimeField.val() );
			wordCountGoal = parseInt( $wordGoalField.val() );
			autoSave = true;
			baseWordCount = getWordCount();

			if ( currentPostData && currentPostData.id ) {
				updatePost();
			} else {
				createNewPost();
			}

			$container.addClass( 'bash-it-out__editor-active' );
			$overseerWordsRemaining.text( wordCountGoal - getWordCount() );
			countDownTimer.set( parseInt( writingTime ) );
			$overseerTimeRemaining.text( countDownTimer.getClock() );
			countDownTimer.start();
			$settingsBoxFields.attr( 'disabled', true );
		}

		/**
		 * Event handler for Overseer stop/quit button
		 * @returns undefined
		 */
		function onOverseerQuitClick() {
			countDownTimer.stop();
			$container.attr('class', 'bash-it-out__container' );
			$settingsBoxFields.attr( 'disabled', false );
			autoSave = false;
			clearTimeout( pressureTimeout );
		}

		/**
		 * Event handler for settings load post button
		 * @returns undefined
		 */
		function onLoadPostClick() {
			toggleLoading();
			getPosts( $savedPostsField.val() )
				.then( function( response ) {
					toggleLoading( false );
					currentPostData = response && response[ 0 ] ? response[ 0 ] : null;
					$editorTextArea.val( currentPostData.content );
				} );
		}

		/**
		 * Event handler for settings reset button
		 * @returns undefined
		 */
		function onResetClick() {
			autoSave = false;
			if ( currentPostData ) {
				toggleLoading();
				updatePost()
					.then( function( response ) {
						$editorTextArea.val( '' );
						toggleLoading( false );
						//TODO: abstract
						$resetAutoSave
							.html( '<a href="' + response.link + '">' + response.title.rendered + '</a> saved.' )
							.fadeIn()
							.delay( 5000 )
							.fadeOut( function(){
								$resetAutoSave.html( '' );
							} );
						currentPostData = null;
					} );
			} else if ( $editorTextArea.val().length > 0 ) {
				createNewPost()
					.then( function( response ) {
					$editorTextArea.val( '' );
					toggleLoading( false );
					//TODO: abstract
					$resetAutoSave
						.html( '<a href="' + response.link + '">' + response.title.rendered + '</a> created.' )
						.fadeIn()
						.delay( 5000 )
						.fadeOut( function(){
							$resetAutoSave.html( '' );
						} );
					currentPostData = null;
				} );
			} else {
				$editorTextArea.val( '' );
			}
		}

		/**
		 * Event handler for Overseer pause button
		 * @returns undefined
		 */
		function onOverseerPauseClick() {
			var pausedState = countDownTimer.toggle();
			if ( pausedState === true ) {
				$overseerPauseButtonText.text( 'Resume' );
				$container
					.addClass( 'bash-it-out__paused' )
					.removeClass( 'bash-it-out__annoy' );
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
			clearTimeout( pressureTimeout );
			$container.addClass( 'bash-it-out__complete' );
			autoSave = false;
		}

		/**
		 * Callback method we pass to Countdown,
		 * fires on each countdown interval
		 * @returns undefined
		 */
		function onCountdownTick( counterValues ) {
			if ( isAdminPageActive() ) {
				$overseerTimeRemaining.text(counterValues.clock);
			}
		}

		/**
		 * Fires on keyup of the text editor so we can track bashing activity
		 * @returns undefined
		 */
		function onEditorTextAreaKeyUp() {
			var wordCount = getWordCount();
			wordCount = wordCount - baseWordCount;
			$overseerWordsRemaining.text( wordCount + '/' + wordCountGoal );
			checkStatusWordCountStatus( wordCount );
			setProgressValue( wordCount );
			// TODO: easter egg track key strokes
			clearTimeout( pressureTimeout );
			$container.removeClass( 'bash-it-out__annoy' );
			if ( ! hasReachedWordGoal ) {
				startPressureTimer();
			}
		}

		/**
		 * Activates loading status in the UI
		 * @param {boolean} loadingStatus true|false activate|deactivate loading status
		 * @returns undefined
		 */
		function toggleLoading( loadingStatus ) {
			if ( $container.hasClass( 'bash-it-out__loading' ) || loadingStatus === false ) {
				$container.removeClass( 'bash-it-out__loading' );
				$settingsBoxFields.attr( 'disabled', false );
			} else {
				$container.addClass( 'bash-it-out__loading' );
				$settingsBoxFields.attr( 'disabled', true );
			}
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
			var wordCount = text.split(/\w+/).length - 1;
			return wordCount > -1 ? wordCount : 0;
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
		 * Fires when the user has reached the set word count
		 * @returns undefined
		 */
		function onWordGoalCompleted() {
			countDownTimer.stop();
			autoSave = false;
			clearTimeout( pressureTimeout );
			$overseerWordsRemaining.text( 0 );
			$container.addClass( 'bash-it-out__complete' );
		}

		/**
		 * Sets the value of the word count progress bar
		 * @returns undefined
		 */
		function setProgressValue( currentWordCount ) {
			var progressValue = 100;
			if ( currentWordCount < wordCountGoal ) {
				progressValue = Math.floor( currentWordCount / wordCountGoal * 100);
			}
			$progressBar.val( progressValue );
		}

		/**
		 * Checks to see if the user has reached the set word count
		 * @returns {boolean} whether the word count as been reached
		 */
		function checkStatusWordCountStatus ( currentWordCount ) {
			if ( currentWordCount >= wordCountGoal ) {
				if ( hasReachedWordGoal === false ) {
					hasReachedWordGoal = true;
					onWordGoalCompleted();
				}
			} else {
				hasReachedWordGoal = false;
			}
			return hasReachedWordGoal;
		}

		/**
		 * Kicks off the nagging timer
		 * @returns undefined
		 */
		function startPressureTimer() {
			// TODO: when $reminderTypeField.val() is up, start nagging by colour/image/sound;
			// TODO: increment by fading in colour/image each second after half-way into the pressure time
			clearTimeout( pressureTimeout );
			pressureTimeout = setTimeout( function() {
				$container.addClass( 'bash-it-out__annoy' );
			}, $reminderTypeField.val() );
		}

		/**
		 * Retrieves one or all bash it out posts
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function getPosts( id ) {
			var url = REST_URLS.get + '?_wpnonce=' + _bio.nonce;
			if ( id ) {
				url = url + '&id=' + id;
			}
			return $.getJSON( url );
		}

		/**
		 * Creates new post
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function createNewPost() {
			return savePostData(
				REST_URLS[ 'post' ],
				{
					title:  getContentTitle(),
					content: $editorTextArea.val(),
					comment_status: 'closed',
					type: 'post',
					status: 'draft',
					tags: {
						0:  _bio.TAG_ID
					}
				},
				function( error, response ) {
					$lastAutoSave.html(
						'<a href="' + response.link + '">' + response.title.rendered + '</a> saved.'
					);
				}
			);
		}

		/**
		 * Updates current post
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function updatePost() {
			return savePostData(
				REST_URLS[ 'post' ] + '/' + currentPostData.id,
				{
					content: $editorTextArea.val()
				},
				function( error, response ) {
					$lastAutoSave.html(
						'<a href="' + response.link + '">' +
						response.title.rendered +
						'</a> autosaved at: ' +
						new Date( response.modified ).toLocaleTimeString()
					);
				}
			);
		}

		/**
		 * Saves post data
		 * @param {string} url the api url to post to
		 * @param {object} data post data
		 * @param {function} callback function to call after response is received
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function savePostData( url, data, callback ) {
			return $.ajax( {
				method: 'POST',
				url: url,
				data: data,
				beforeSend: function ( xhr ) {
					xhr.setRequestHeader( 'X-WP-Nonce', _bio.nonce );
				},
				success : function( response ) {
					if ( ! response ) {
						countDownTimer.stop();
						//TODO: show error in UI
					}

					currentPostData = response;

					if ( autoSave === true ) {
						triggerAutoSave();
					}

					if ( $.type( callback ) === 'function' ) {
						callback( null, response );
					}
				},
				error: function( error ) {
					log.error( error, 'error' );
					countDownTimer.stop();
					if ( $.type( callback ) === 'function' ) {
						callback( error );
					}
					//TODO: show error in UI
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
				autoSaveTimeout = setTimeout( updatePost, AUTO_SAVE_INTERVAL );
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
		// TODO: Get info on saved posts to display in dropdown https://developer.wordpress.org/plugins/javascript/heartbeat-api/
		// assign event handlers
		if ( $settingsBoxStartButton.length ) {
			$settingsBoxStartButton.on( 'click', onStartButtonClick );
		}

		$settingsBoxLoadPostButton.on( 'click', onLoadPostClick );
		$overseerQuitButton.on( 'click', onOverseerQuitClick );
		$overseerPauseButton.on( 'click', onOverseerPauseClick );
		$settingsBoxResetButton.on( 'click', onResetClick );

		$editorTextArea.on( 'keyup', onEditorTextAreaKeyUp );

		countDownTimer = Countdown( onCountdownComplete, onCountdownTick );


	} );
}( jQuery, window.bashItOut ) );