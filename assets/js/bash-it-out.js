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

		if ( typeof _bio.Countdown !== 'object' ) {
			log( 'Dependency `_bio.Countdown` not found', 'error' );
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

		/*
			Variables
		 */
		var wordCountGoal = 0;
		var writingTime = 0;
		var autoSave = false;
		var autoSaveTimeout = null;
		var hasReachedWordGoal = false;
		var pressureTimeout = null;
		// This is the word count of a saved post.
		// We don't count this in word goals, and minus its value from any current word count value.
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
		var $happyEditorImage = $( '.bash-it-out__happy-editor' );

		// Settings
		var $settingsBoxStartButton = $( '.bash-it-out__start' );
		var $settingsBoxLoadPostButton = $( '.bash-it-out__load-post' );
		var $settingsBoxResetButton = $( '.bash-it-out__reset' );
		var $settingsBoxSaveButton = $( '.bash-it-out__save-now' );
		var $writingTimeField = $( 'input[name="bash-it-out-writing-time"]' );
		var $wordGoalField = $( 'input[name="bash-it-out-word-goal"]' );
		var $reminderTypeField = $( 'select[name="bash-it-out-reminder-type"]' );
		var $savedPostsField = $( 'select[name="bash-it-out-saved-posts"]' );
		var $resetAutoSave = $( '.bash-it-out__reset_autosave' );
		var $currentPostTitle = $( '.bash-it-out__current-post-title' );
		var $savedPostsFieldset = $( '.bash-it-out__fieldset-saved-posts' );
		var $settingsBoxFields = $writingTimeField.add(
			$savedPostsField,
			$wordGoalField,
			$reminderTypeField,
			$settingsBoxStartButton,
			$settingsBoxLoadPostButton,
			$settingsBoxResetButton
		);

		// Editor
		var $editorTextArea = $( '#bash-it-out-editor' );
		var $editorTextAreaContainer = $( '.bash-it-out__editor-container' );
		var $progressBar = $( '.bash-it-out__progressbar' );

		/*
			current post state management
		 */
		var currentPostData = null;

		/**
		 * Assigns new values to currentPostData
		 * @param {object} newState The new state values.
		 * @returns {object}
		 */
		function setCurrentPostData( newState ) {
			return $.extend( {}, currentPostData, newState );
		}

		/**
		 * Returns default values of currentPostData
		 * @returns {object}
		 */
		function getInitialCurrentPostData() {
			return {
				id: null,
				title: 'Waiting to bash a new one out...',
				date: null,
				link: null,
				content: null,
				modified: null,
				wordCount: null
			};
		}

		/*
			Event handlers
		 */
		function onStartButtonClick() {
			focusEditor();

			// Get the selected values.
			// TODO: save these settings for next time?
			writingTime = parseInt( $writingTimeField.val() );
			wordCountGoal = parseInt( $wordGoalField.val() );

			// Switch autosave on.
			autoSave = true;

			// How many words are in the editor right now?
			// No cheating! :(
			baseWordCount = getWordCount();

			// If we've already loaded a post
			// update it, otherwise create a new one.
			if ( currentPostData.id ) {
				currentPostData.wordCount = baseWordCount;
				updatePost();
			} else {
				createNewPost();
			}

			$container.addClass( 'bash-it-out__editor-active' );
			setPostTitleAndWordCountValues();
			_bio.Countdown.set( parseInt( writingTime ) );
			$overseerTimeRemaining.text( _bio.Countdown.getClock() );
			_bio.Countdown.start();
			$settingsBoxFields.attr( 'disabled', true );
		}

		/**
		 * Event handler for Overseer stop/quit button
		 * @returns undefined
		 */
		function onOverseerQuitClick() {
			_bio.Countdown.kill();
			$container.attr('class', 'bash-it-out__container' );
			$settingsBoxFields.attr( 'disabled', false );
			autoSave = false;
			if ( ! $editorTextArea.val().length > 0 ) {
				cancelAutoSave();
			}
			$overseerWordsRemaining.text( '' );
			$overseerTimeRemaining.text( '' );
			setPostTitleAndWordCountValues();
			clearTimeout( pressureTimeout );
			$overseerPauseButtonText.text( 'Pause' );
		}

		/**
		 * Event handler for Overseer pause button
		 * @returns undefined
		 */
		function onOverseerPauseClick() {
			pauseHandler( _bio.Countdown.toggle() );
			focusEditor();
		}

		/**
		 * Handles the paused state
		 * @param {bool} pausedState The paused state with which to set the UI.
		 * @returns undefined
		 */
		function pauseHandler( pausedState ) {
			if ( pausedState === true ) {
				clearTimeout( pressureTimeout );
				$overseerPauseButtonText.text( 'Resume' );
				$container
					.addClass( 'bash-it-out__paused' )
					.removeClass( 'bash-it-out__annoy' );
			} else {
				$overseerPauseButtonText.text( 'Pause' );
				$container.removeClass( 'bash-it-out__paused' );
			}
		}

		/**
		 * Event handler for settings load post button
		 * @returns undefined
		 */
		function onLoadPostClick() {
			// Stop any save timers from previous posts.
			cancelAutoSave();
			var postId = parseInt( $savedPostsField.val() );
			if ( currentPostData.id === postId ) {
				log( 'This post is already loaded', 'warn' );
				return false;
			}
			toggleLoading();
			getPosts( postId )
				.then( function( response ) {
					toggleLoading( false );
					currentPostData = setCurrentPostData( response[ 0 ] );
					$editorTextArea.val( currentPostData.content );
					setPostTitleAndWordCountValues();
				} );
		}

		/**
		 * Manual save event
		 * @returns undefined
		 */
		function onSaveNowClick() {
			if ( currentPostData.id ) {
				toggleLoading();
				updatePost()
					.then( onAutoSaveFinished );
			} else if ( $editorTextArea.val().length > 0 ) {
				createNewPost()
					.then( onAutoSaveFinished );
			}
		}

		/**
		 * Event handler for settings reset button
		 * @returns undefined
		 */
		function onResetClick() {
			cancelAutoSave();
			if ( currentPostData.id ) {
				toggleLoading();
				updatePost()
					.then( onResetClickCallback );
			} else if ( $editorTextArea.val().length > 0 ) {
				createNewPost()
					.then( onResetClickCallback );
			} else {
				$editorTextArea.val( '' );
			}
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
				$overseerTimeRemaining.text( counterValues.clock );
			}
		}

		/**
		 * Fires on keyup of the text editor so we can track bashing activity
		 * @returns undefined
		 */
		function onEditorTextAreaKeyUp() {
			setPostTitleAndWordCountValues();

			// TODO: easter egg track key strokes
			clearTimeout( pressureTimeout );
			$container.removeClass( 'bash-it-out__annoy' );

			// The user has kicked off a bash it out session,
			// so let's start the timer.
			if ( ! _bio.Countdown.isPaused() && ! hasReachedWordGoal && isInWritingMode() ) {
				startPressureTimer();
			}

			if ( ! autoSave ) {
				autoSave = true;
				onSaveNowClick();
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
		 * Get the word count and displays it to the UI/passes it onto related methods
		 * @returns undefined
		 */
		function setPostTitleAndWordCountValues() {
			var wordCount = getWordCount();
			currentPostData = setCurrentPostData( { wordCount: wordCount } );
			$currentPostTitle.text( currentPostData.title + ' (' + currentPostData.wordCount + ' words)' );
			wordCount = wordCount - baseWordCount;
			$overseerWordsRemaining.text( wordCount + '/' + wordCountGoal );
			checkStatusWordCountStatus( wordCount );
			setProgressValue( wordCount );
		}

		/**
		 * Sets a faded out message after reset save
		 * @param {array} response posts api response
		 * @returns undefined
		 */
		function onAutoSaveFinished( response ) {
			toggleLoading( false );
			$resetAutoSave
				.html( '<a href="' + response[ 0 ].link + '">' + response[ 0 ].title + '</a> saved.' )
				.fadeIn()
				.delay( 5000 )
				.fadeOut( function(){
					$resetAutoSave.html( '' );
				} );
			setPostTitleAndWordCountValues();
		}

		/**
		 * Reset editor callback
		 * @param {array} response posts api response
		 * @returns undefined
		 */
		function onResetClickCallback( response ) {
			$editorTextArea.val( '' );
			currentPostData = getInitialCurrentPostData();
			baseWordCount = 0;
			onAutoSaveFinished( response )
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
			var wordCount = text.split( /\w+/ ).length - 1;
			return wordCount > -1 ? wordCount : 0;
		}

		/**
		 * Fires when the user has reached the set word count
		 * @returns undefined
		 */
		function onWordGoalCompleted() {
			_bio.Countdown.pause();
			pauseHandler( true );
			clearTimeout( pressureTimeout );
			$container.addClass( 'bash-it-out__complete' );
			setTimeout( function() {
				$happyEditorImage.show().delay( 3000 ).fadeOut( 2500 );
			}, 0 );
		}

		/**
		 * Fires when the user has previously reached the set word count but the word counts goes dooowwwn
		 * @returns undefined
		 */
		function removeWordGoalCompleted() {
			if ( _bio.Countdown.isComplete() ) {
				_bio.Countdown.start();
				pauseHandler( false );
			}
			autoSave = true;
			$container.removeClass( 'bash-it-out__complete' );
			$happyEditorImage.hide();
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
			// We only check when writing mode, a.k.a pressure mode, is on.
			if ( ! isInWritingMode() ) {
				return false;
			}

			if ( currentWordCount >= wordCountGoal ) {
				if ( hasReachedWordGoal === false ) {
					hasReachedWordGoal = true;
					onWordGoalCompleted();
				}
			} else {
				hasReachedWordGoal = false;
				removeWordGoalCompleted();
			}
			return hasReachedWordGoal;
		}

		/**
		 * Kicks off the nagging timer
		 * @returns undefined
		 */
		function startPressureTimer() {
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
			var url = _bio.PLUGIN_REST_BASE;
			if ( id ) {
				url = url + '/' + id;
			}
			url = url + '?_wpnonce=' + _bio.nonce;
			return $.getJSON( url );
		}

		/**
		 * Creates new post
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function createNewPost() {
			return savePostData(
				_bio.PLUGIN_REST_BASE,
				{
					content: $editorTextArea.val(),
					comment_status: 'closed',
					type: 'post',
					status: 'draft',
					tags: {
						0:  _bio.TAG_ID
					}
				},
				function( error, response ) {
					if ( error || ! response || ! response[ 0 ] ) {
						return log( 'Post could not be created', 'error' );
					}
					$lastAutoSave.html(
						'<a href="' + response[ 0 ].link + '">Draft</a> saved.'
					);
					$savedPostsFieldset.removeClass( 'hidden' );
					$savedPostsField.append( '<option value="' + response[ 0 ].id + '">' + response[ 0 ].title + '</option>' );
				}
			);
		}

		/**
		 * Updates current post
		 * @returns {jQuery.jqXHR} jQuery deferred object
		 */
		function updatePost() {
			return savePostData(
				_bio.PLUGIN_REST_BASE + '/' + currentPostData.id,
				{
					content: $editorTextArea.val()
				},
				function( error, response ) {
					if ( error || ! response || ! response[ 0 ] ) {
						return log( 'Post could not be saved', 'error' );
					}
					$lastAutoSave.html(
						'<a href="' + response[ 0 ].link + '">Draft</a> autosaved at: ' +
						new Date( response[ 0 ].modified ).toLocaleTimeString()
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
				dataType: 'json',
				beforeSend: function ( xhr ) {
					xhr.setRequestHeader( 'X-WP-Nonce', _bio.nonce );
				},
				success: function( response ) {
					if ( ! response ) {
						_bio.Countdown.kill();
						//TODO: show error in UI
					}

					currentPostData = setCurrentPostData( response[ 0 ] );
					$currentPostTitle.text( currentPostData.title + ' (' + currentPostData.wordCount + ' words)' );

					if ( autoSave === true ) {
						triggerAutoSave();
					}

					if ( $.type( callback ) === 'function' ) {
						callback( null, response );
					}

					return response;
				},
				error: function( error ) {
					log( error, 'error' );
					autoSave = false;
					_bio.Countdown.kill();
					if ( $.type( callback ) === 'function' ) {
						callback( error );
					}

					return error;
					//TODO: show error in UI
				}
			} );
		}

		/**
		 * Kicks off a timedout autosave
		 * @returns {number} word count in editor textarea
		 */
		function triggerAutoSave() {
			if ( isAdminPageActive() && currentPostData.id ) {
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
			autoSave = false;
			autoSaveTimeout = null;
		}

		/**
		 * Checks if the editor is in writing mode
		 * @returns {boolean}
		 */
		function isInWritingMode() {
			return $container.hasClass( 'bash-it-out__editor-active' );
		}

		/**
		 * Checks if we're on the admin page and cancels all timeouts if not
		 * @returns {boolean} if we're on the page
		 */
		function isAdminPageActive() {
			var $identifier = $( '#bash-it-out-identifier' );
			if ( $identifier.length < 1 ) {
				// We're no longer on the page Toto.
				cancelAutoSave();
				_bio.Countdown.kill();
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
			Init
		 */
		function init() {
			// Assign event handlers.
			$settingsBoxStartButton.on( 'click', onStartButtonClick );
			$settingsBoxLoadPostButton.on( 'click', onLoadPostClick );
			$overseerQuitButton.on( 'click', onOverseerQuitClick );
			$overseerPauseButton.on( 'click', onOverseerPauseClick );
			$settingsBoxResetButton.on( 'click', onResetClick );
			$settingsBoxSaveButton.on( 'click', onSaveNowClick );
			$editorTextArea.on( 'keyup', onEditorTextAreaKeyUp );

			// Set up the counter.
			_bio.Countdown.init( onCountdownComplete, onCountdownTick );

			// Load default post data.
			currentPostData = getInitialCurrentPostData();
			$currentPostTitle.text( currentPostData.title );
		}

		init();

	} );
}( jQuery, window.bashItOut ) );