// © 2017 Arthur McLean

// Define the calendar app
var calendar = {
    today:          null, // Always today
    currentMonth:   null, // The currently selected month (first of the month)
    currentDay:     null, // The currently selected day

    // Kick things off:
    init: function() {
        calendar.today = moment().startOf('day');

        calendar.initMonth();

        // Make links work:
        $('.back a').click( calendar.goPrevMonth );
        $('.next a').click( calendar.goNextMonth );
        $('#create_events').click( calendar.generateRandomEvents );
        $('#clear_events').click( calendar.clearEvents );
        $('#jump_to_today').click( calendar.today.clone(), calendar.selectDay );

        $(window).load( calendar.adjustMainHeight() );
        $(window).resize( calendar.adjustMainHeight() );
    },

    /**
     * adjustMainHeight:
     * Adjust the main row to be the height of the calendar
     *
     * @param {bool} scrollDay - Should we scroll the day to the middle
     */
    adjustMainHeight: function(scrollDay) {
        // Set the height
        $('#day_container').height( $('#calendar_container').height() );

        if( scrollDay ) {
            calendar.adjustDayScroll();
        }
    },

    adjustDayScroll: function() {
        // Scroll to the middle of the div (since the middle of the day is the more common time to have events)
        $('#day_container').scrollTop( $('#day_container').height() * .75 );
    },

    /**
     * initMonth:
     * Initialize the visible month:
     *
     * @param {obj} date - date to start the calendar on.
     * @param {bool} initDay - should we initialize the day as well?
     */
    initMonth: function(date, initDay) {
        var event = {}; // To pass through to selectDay
        if( date === undefined ) {
            // Set the selected month to the current month
            date = calendar.today.clone();

            initDay = true;
            event.data = calendar.today.clone();
        } else {
            // Initialize the day with the currently selected date:
            event.data = date.clone();
        }

        // Set to the first day of the month
        date.startOf('day').startOf('month');
        calendar.currentMonth = date.clone();

        // Now that we have logged the current month, see if we need to initialize the day as well
        if( initDay ) {
            calendar.selectDay(event);
        }

        $('#display_date').text( date.format('MMMM YYYY') );

        // Figure out the beginning and end of the current display range
        var start = date.clone().startOf('week');

        // Get to the end of the month
        date.endOf('month');
        var end = date.clone().endOf('week');

        $('#calendar-body').empty();

        var current = start.clone();
        var tr, endOfWeek, td, div, currentMonth, span, hour, found, id;

        while( current.isSameOrBefore(end) ) {
            // Make a new row
            tr          = $('<tr/>');
            endOfWeek   = current.clone().endOf('week');
            
            while( current.isSameOrBefore(endOfWeek) ) {
                // Add days
                td  = $('<td/>').click( current.clone(), calendar.selectDay );
                div = $('<div/>');
                if( current.isSame(calendar.currentMonth, 'month') ) {
                    currentMonth = true;
                    div.addClass('current-month');
                } else {
                    currentMonth = false;
                }

                if( current.isSame( calendar.currentDay, 'day' ) ) {
                    div.addClass('selected');
                }

                span = $('<span/>').text( current.format('D') );

                // Check to see if there are any events today... not the most efficient
                hour    = current.clone();
                found   = false;
                while( !found && hour.isSame(current, 'day') ) {
                    id = hour.format('x');
                    if( localStorage.getItem(id) !== null ) {
                        // We found something!
                        found = true;
                    }
                    hour.add(1, 'hour');
                }

                if( found ) {
                    span.addClass('badge');

                    if( !currentMonth ) {
                        span.addClass('secondary');
                    }
                }

                // Put it all together
                span.appendTo(div);
                div.appendTo(td);
                td.appendTo(tr);

                // Add a day
                current.add(1, 'day');
            }

            tr.appendTo( $('#calendar-body') );
        }

        // The calendar height may have changed:
        calendar.adjustMainHeight(initDay);
    },

    /**
     * selectDay:
     * Select a single day.
     * @param {obj} event - mouse click (or synthetic event), with event.data as the clicked day.
     */
    selectDay: function(event) {
        var date            = event.data.clone();
        var current         = date.clone();
        calendar.currentDay = current.clone();

        // Redraw the month
        calendar.initMonth(date.clone(), false);

        $('#display_day').text( date.format('MMMM D, YYYY') );
        $('#hours').empty();

        var id, content, hour, time, item, save, cancel, remove, btns1, btns2;
        while( current.isSame(date, 'day') ) {
            id      = current.format('x'); // unix timestamp makes a unique id
            content = localStorage.getItem(id);
            item    = $('<div class="small-8 columns" id="content_' + id + '" contenteditable>' + (content ? content : '') + '</div>').
                    focus( current.clone(), calendar.showControls ).
                    blur( current.clone(), calendar.updateControls );

            save    = $('<button class="button save" type="button" title="Save"><span class="show-for-sr">Save</span><i class="fa fa-check-circle-o" aria-hidden="true"></i></button>').
                    click( current.clone(), calendar.saveItem );
            cancel  = $('<button class="button cancel" type="button" title="Cancel"><span class="show-for-sr">Cancel</span><i class="fa fa-ban" aria-hidden="true"></i></button>').
                    click( current.clone(), calendar.cancelItem );
            remove  = $('<button class="button remove" type="button" title="Remove"><span class="show-for-sr">Remove</span><i class="fa fa-times-circle-o" aria-hidden="true"></i></button>').
                    click( current.clone(), calendar.removeItem );
            
            // The action buttons container (save and cancel)
            btns1   = $('<div class="small-2 text-right columns hide" id="action_' + id + '"></div>');
            btns1.append(save).append(cancel);

            // The remove button container (it's also an action, but it's a stand-alone)
            btns2   = $('<div class="small-2 text-right columns" id="remove_' + id + '"></div>');
            if( $.trim( content ).length === 0 ) {
                // hide the remove button
                btns2.addClass('hide');
            }
            btns2.append(remove);

            time    = $('<div class="small-2 columns time text-right">' + current.format('h a') + '</div>').
                    click( current.clone(), calendar.focusItem );

            hour    = $('<div class="row hour"></div>');
            hour.append(time).append(item).append(btns1).append(btns2);
            
            hour.appendTo( $('#hours') );

            current.add(1, 'hour');
        }

        // Scroll the day to the middle
        calendar.adjustDayScroll();
    },

    showControls: function(event) {
        var id = event.data.format('x');
        $('#remove_' + id).addClass('hide');
        $('#action_' + id).removeClass('hide');
    },

    /**
     * updateControls:
     * Show the correct set of controls...
     *  - save/cancel if unsaved chagnes
     *  - remove if saved changes
     *  - nothing if no item for this time slot
     */
    updateControls: function(event) {
        var id      = event.data.format('x');
        var item    = $.trim( $('#content_' + id).text() );
        var orig    = localStorage.getItem(id);
        var diff    = false;

        // Is the current value changed?
        if( item.length ) {
            // We have a current item
            if( orig === null ) {
                // We don't have an original to compare to, but the user typed something
                diff = true;
            } else if( orig !== item ) {
                // There is an original item, and it's different from the current item
                diff = true;
            }
        } else {
            // No current item
            if( orig !== null ) {
                // There was something there before, and it's gone now
                diff = true;
            }
        }

        if( diff ) {
            // There is a change, so we don't need the remove control, but we do need the action controls
            $('#remove_' + id).addClass('hide');
            $('#action_' + id).removeClass('hide');
        } else {
            // The actions controls are not needed
            $('#action_' + id).addClass('hide');

            if( item.length ) {
                // The item is there, but unchanged, so show delete control
                $('#remove_' + id).removeClass('hide');
            } else {
                // Nothing there, so no controls needed
                $('#remove_' + id).addClass('hide');
            }
        }
    },

    // Focus on an editable area from clicks elsewhere
    focusItem: function(event) {
        var id = event.data.format('x');
        $('#content_' + id).focus();
    },

    saveItem: function(event) {
        var id      = event.data.format('x');
        var item    = $.trim( $('#content_' + id).text() );
        if( item.length ) {
            localStorage.setItem(id, item);
        } else {
            // Remove the item as they saved a blank
            localStorage.removeItem(id);
        }

        calendar.updateControls(event);
        
        // Redraw the month
        calendar.initMonth( calendar.currentDay, false );
    },

    cancelItem: function(event) {
        var id      = event.data.format('x');
        var content = localStorage.getItem(id);
        if( content !== null && content.length ) {
            // Replace with the original content
            $('#content_' + id).text( content );
        } else {
            // Just clear it out
            $('#content_' + id).empty();
        }

        calendar.updateControls(event);
    },

    removeItem: function(event) {
        var id      = event.data.format('x');
        var elem    = $('#content_' + id);
        
        if( confirm('Are you sure you want to remove "' + elem.text() + '"?') ) {
            elem.empty();
            localStorage.removeItem(id);

            calendar.updateControls(event);

            // Redraw the month
            calendar.initMonth( calendar.currentDay, false );
        }
    },

    // Simple navigation back one month
    goPrevMonth: function(event) {
        event.preventDefault();
        calendar.initMonth( calendar.currentMonth.subtract(1, 'month'), true );
    },

    // Simple navigation forward one month
    goNextMonth: function(event) {
        event.preventDefault();
        calendar.initMonth( calendar.currentMonth.add(1, 'month'), true );
    },

    /**
     * getRandomNumRange:
     * Returns a random number between the min and max values, inclusive.
     * Credit: https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
     */
    getRandomNumRange: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Generate random events to get the calendar started
    generateRandomEvents: function(event) {
        event.preventDefault();

        var start = calendar.today.clone();
        start.subtract(2, 'month').startOf('month');
        var end = calendar.today.clone();
        end.add(2, 'month').endOf('month');

        var current = start.clone();

        var tasks = [
            'Scrub the plasma injectors.',
            'Ensure EPS taps are running within acceptable parameters.',
            'Flush the warp core coolant.',
            'Inspect the dilithium storage array.',
            'Replace the dilithium articulation frame.',
            'Repaint the warp nacelles.',
            'Inspect the Bussard ramscoop for debris.',
            'Clean the antimatter purge-vent.',
            'Replace the subspace harmonic monitors.',
            'Inspect the field stress compensators for damage.',
            'Test the teratogenic coolant for impurities.',
            'Rehearsal for the Klingon opera.'
        ];

        var duration, taskNum;
        while( current.isSameOrBefore(end) ) {
            duration    = calendar.getRandomNumRange(12, 48);
            taskNum     = calendar.getRandomNumRange(0, tasks.length - 1);
            current.add(duration, 'hours');
            localStorage.setItem(current.format('x'), tasks[taskNum]);
        }

        // Redraw the month
        calendar.initMonth( calendar.currentDay, true );
    },
    
    // Clear all events:
    // In production mode, we'd probably not have this, or at least have a confirm.
    clearEvents: function(event) {
        event.preventDefault();
        if( confirm('Are you sure you want to remove ALL the events on the calendar?') ) {
            localStorage.clear();

            // Redraw the selected day with no events
            event.data = calendar.today.clone();
            calendar.selectDay(event);

            // Redraw the month
            calendar.initMonth( calendar.currentDay, true );
        }
    },
};

// Kick off the app
$(document).ready( calendar.init() );
