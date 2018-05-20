/*
* Countdown.js
* Bash It Out's timer and countdown utility methods
* */

window.bashItOut = window.bashItOut || {};
window.bashItOut.Countdown = ( function() {
	/**
	 * Countdown class
	 *
	 * @namespace bashItOut
	 * @returns { object } The class interface.
	 */
	function Countdown() {
		/*
			Constants
		*/
		var TIMER_INTERVAL = 1000;
		// Duration is in seconds.
		var DURATION = 1800;
		// Clock face divider.
		var DIVIDER = ':';
		// Helper to calculate the Date from milliseconds.
		var S = 1000;
		var M = S * 60;
		var H = M * 60;
		var D = H * 24;

		/*
			Variables
		*/
		var complete = false;
		var countdown = 0;
		var clock = '00:00:00';
		var end = '';
		var timer;
		var now;
		var distance;
		var paused = true;
		var onComplete = onTick = function(){};

		/**
		 * Sets up a new timer with user duration
		 * @param {int} newDurationInMinutes
		 * @returns undefined
		 */
		function set( newDurationInMinutes ) {
			if ( newDurationInMinutes ) {
				DURATION = newDurationInMinutes * 60;
			}
			// set out seconds countdown to track seconds
			// let's add one second to account for the first setInterval delay
			countdown = DURATION + 1;

			var durationInMilliseconds = DURATION * 1000;

			clock = [
				pad( Math.floor( ( durationInMilliseconds % D ) / H ) ),
				pad( Math.floor( ( durationInMilliseconds % H ) / M ) ),
				pad( Math.floor( ( durationInMilliseconds % M ) / S ) )
			].join( DIVIDER );
		}

		/**
		 * Starts the timer
		 * @returns undefined
		 */
		function start() {
			end = new Date();
			// add selected seconds to current time
			end.setSeconds( end.getSeconds() + countdown );
			if ( timer ) {
				clearTheTimer();
			}
			timer = setInterval( render, TIMER_INTERVAL );
			paused = false;
			complete = false;
		}

		/**
		 * Resets vars and clock face
		 * @returns undefined
		 */
		function reset() {
			clock = '00:00:00';
			kill();
			paused = true;
			complete = false;
			return clock;
		}

		/**
		 * Util function to pad numbers with zero
		 * @returns {string|int}
		 */
		function pad( n ) {
			n = parseInt( n, null );
			return ( n < 10 && n >= 0 ) ? ( '0' + n ) : n;
		}

		/**
		 * Gets the percentage of time complete in relation to the duration
		 * @returns {int}
		 */
		function getCompletedTimePercentage( current, DURATION ) {
			var seconds = current / 1000;
			return 100 - Math.floor( seconds / DURATION * 100 );
		}

		/**
		 * Clears the interval
		 * @returns undefined
		 */
		function clearTheTimer() {
			clearInterval( timer );
			timer = null;
		}

		/**
		 * Render function that puts together the clock face every interval tick
		 * @returns undefined
		 */
		function render() {
			now = new Date();
			distance = end.getTime() - now.getTime();

			if ( distance < 0 ) {
				reset();
				onComplete && onComplete();
				return false;
			}

			clock = [
				// The day in hours.
				pad( Math.floor( ( distance % D ) / H ) ),
				// The hours in minutes
				pad( Math.floor( ( distance % H ) / M ) ),
				// The minutes in seconds.
				pad( Math.floor( ( distance % M ) / S ) )
			].join( DIVIDER );

			countdown--;

			onTick && onTick( {
				clock: clock,
				percentage: getCompletedTimePercentage( distance, DURATION )
			} );
		}

		/**
		 * Pauses the clock
		 * @returns undefined
		 */
		function pause() {
			clearTheTimer();
			paused = true;
		}

		/**
		 * Kills the clock by calling it completed
		 * @returns undefined
		 */
		function kill() {
			complete = true;
			paused = true;
			clearTheTimer();
		}

		/**
		 * Toggles pause and returns whether the clock is paused
		 *
		 * @returns {bool}
		 */
		function toggle() {
			if ( paused === true ) {
				start();
			} else {
				pause();
			}
			return paused;
		}

		/**
		 * Sets up a new clock
		 * @returns undefined
		 */
		function init( onCompleteCallback, onTickCallback ) {
			onComplete = onCompleteCallback;
			onTick = onTickCallback;
		}

		return {
			init: init,
			start: start,
			pause: pause,
			kill: kill,
			toggle: toggle,
			set: set,
			reset: reset,
			getClock: function() {
				return clock;
			},
			isPaused: function() {
				return paused;
			},
			isComplete: function() {
				return complete;
			}
		};
	}

	return new Countdown();

}() );