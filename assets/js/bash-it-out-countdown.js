/*
* Countdown.js
* Bash It Out's timer and countdown utility methods
* */

window.bashItOut = window.bashItOut || {};

window.bashItOut.Countdown = ( function() {

	/*
	Countdown
	1 min : 60s
	30 min : 1800s
	1 hour : 3600s
*/
	function Countdown() {
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
		var onComplete = onTick = function(){};

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
				onComplete && onComplete();
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

			onTick && onTick( {
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

		function init( onCompleteCallback, onTickCallback ) {
			onComplete = onCompleteCallback;
			onTick = onTickCallback;
		}

		return {
			init: init,
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

	return new Countdown();

}() );