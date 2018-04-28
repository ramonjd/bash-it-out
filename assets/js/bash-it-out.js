$( function() {

	/*
		Variables
 	*/

	var wordCountGoal = 0;
	var writingTime = 0;
	var countDownTimer = null;

	/*
		Elements
	 */
	// Overseer
	var $overseerBox = $( '.bash-it-out__overseer' );
	var $overseerWordsRemaining = $( '.bash-it-out__words-remaining' );
	var $overseerTimeRemaining = $( '.bash-it-out__time-remaining' );
	var $overseerPauseButton = $( '.bash-it-out__overseer-pause' );
	var $overseerQuitButton = $( '.bash-it-out__overseer-quit' );

	// Meta box
	var $metaBoxStartButton = $( '.bash-it-out__start' );
	var $writingTimeField = $( '#bash-it-out-writing-time' );
	var $wordGoalField = $( '#bash-it-out-word-goal' );
	var $reminderTypeField = $( '#bash-it-out-reminder-type' );
	var $metaBoxFields = $writingTimeField.add( $wordGoalField ).add( $reminderTypeField ).add( $metaBoxStartButton );

	// Editor elements
	var $editorIframe;
	var $editorTextArea;



	/*
		Event handlers
	 */
	function onMetaBoxButtonClickHandler( event ) {
		event.preventDefault();
		$editorIframe = $( '#content_ifr' );
		$editorTextArea = $( '.wp-editor-area' );
		$( 'html, body' ).animate( {
			scrollTop: $( '#poststuff' ).position().top
		}, 800 );
		focusEditor();
		writingTime = parseInt( $writingTimeField.val() );
		wordCountGoal = parseInt( $wordGoalField.val() );
		$overseerBox.addClass( 'bash-it-out__overseer-active' );
		$overseerWordsRemaining.text( wordCountGoal - getWordCount() );
		countDownTimer.set( parseInt( writingTime ) );
		$overseerTimeRemaining.text( countDownTimer.getClock() );
		countDownTimer.start();
		$metaBoxFields.attr( 'disabled', true );
	}

	function onOverseerQuitClick() {
		countDownTimer.stop();
		$overseerBox.removeClass( 'bash-it-out__overseer-active' );
		$metaBoxFields.attr( 'disabled', false );
	}

	function onOverseerPauseClick() {
		countDownTimer.toggle();
	}

	function onCountdownComplete() {
		console.log( 'You did it!' );
	}

	function onCountdownTick( counterValues ) {
		$overseerTimeRemaining.text( counterValues.clock );
		$overseerWordsRemaining.text( wordCountGoal - getWordCount() );
	}

	function isVisualEditorEnabled() {
		return ( typeof tinyMCE !== 'undefined' ) && tinyMCE.activeEditor && ! tinyMCE.activeEditor.isHidden() ? true : false;
	}

	function focusEditor() {
		var isVisualEditor = isVisualEditorEnabled();
		var $element = isVisualEditor ? $editorIframe.contents().find( 'body' ) : $editorTextArea;
		$element.focus();

		// for some reason I can't set the cursor in the visual editor (yet!)
		if ( ! isVisualEditor ) {
			setTimeout( function() {
				$element[ 0 ].selectionStart = $element[ 0 ].selectionEnd = getCharCount() + 1;
			}, 0 );
		}
	}

	function getCharCount() {
		var text = '';
		if ( isVisualEditorEnabled() ) {
			text = $editorIframe.contents().find( 'body' ).text();
		} else {
			text = $editorTextArea.val();
		}
		return text === '' ? 0 : text.length;
	}

	function getWordCount() {
		var text = '';
		if ( isVisualEditorEnabled() ) {
			text = $editorIframe.contents().find( 'body' ).text();
		} else {
			text = $editorTextArea.val();
		}
		return text === '' ? 0 : text.split( ' ' ).length;
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
		}

		function toggle() {
			if ( paused === true ) {
				start();
			} else {
				pause();
			}
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


} );