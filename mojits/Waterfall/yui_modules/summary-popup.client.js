/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*global YUI */

YUI.add('mojito-waterfall-summary-popup', function (Y, NAME) {
    'use strict';

    var Time = Y.mojito.Waterfall.Time;

    function SummaryPopup(summaries, events, absoluteStartTime, timeWidth, waterfallTable, units) {
        var START_TIME_DESCRIPTION = "Start time since the beginning",
            PHASES_DESCRIPTION = "Phases start and elapsed time relative to the start:",
            EVENTS_DESCRIPTION = "Event timing relative to the start:",
            EVENT_DISTANCE_THRESHOLD = 5,
            PROFILE_DISTANCE_THRESHOLD = 5,
            profileSummaryNodes = [],
            eventsSummaryNodes = [],
            isProfileSummary = false,
            timelineColumn = waterfallTable.one('tbody > tr > td.timeline .timeline-length'),
            timelineColumnWidth,
            timelineColumnLeft,
            popup;

        function setEventsSummary(closeEvents) {
            popup.node.set('innerHTML', '');

            var table = Y.Node.create('<table/>');

            // vertical space
            table.append("<tr><td colspan='4' class='vertical-space'></td></tr>");

            closeEvents.sort(function (a, b) {
                return a.event.time < b.event.time ? -1 : a.event.time > b.event.time ? 1 :
                        a.event.index < b.event.index ? -1 : 1; // if events have the same time, then sort by original index
            });
            Y.Array.each(closeEvents, function (closeEvent, i) {
                if (!eventsSummaryNodes[closeEvent.num]) {
                    var event = closeEvent.event,
                        eventTr = Y.Node.create("<tr class='breakdown'></tr>"),
                        detailsTr;
                    eventTr.append("<td><div class='event-color' style='border-left: 2px solid " + event.color + "'/></td>");
                    eventTr.append("<td class='time'>" + Time.timeToString((event.time - absoluteStartTime) + units, 3) + "</td>");
                    eventTr.append("<td class='name' colspan='2'>" + event.name + "</td>");

                    if (event.details) {
                        detailsTr = Y.Node.create('<tr/>').append(event.details);
                    }

                    eventsSummaryNodes[closeEvent.num] = {
                        event: eventTr,
                        details: detailsTr
                    };
                }

                table.append(eventsSummaryNodes[closeEvent.num].event);
                if (eventsSummaryNodes[closeEvent.num].details) {
                    table.append(eventsSummaryNodes[closeEvent.num].details);
                    if (i !== closeEvents.length) {
                        // vertical space
                        table.append("<tr><td colspan='2' class='vertical-space'><hr/></td></tr>");
                    }
                }
            });

            // vertical space
            table.append("<tr><td colspan='2' class='vertical-space'></td></tr>");
            popup.node.append(table);
        }

        function setProfileSummary(row) {
            popup.node.set('innerHTML', '');

            var table = Y.Node.create('<table/>'),
                enabledEvents = [],
                tr,
                td;

            // vertical space
            table.append("<tr><td colspan='4' class='vertical-space'></td></tr>");

            // start time and description
            tr = Y.Node.create("<tr class='start-time'/>");
            tr.append("<td/>");
            td = Y.Node.create("<td class='time'>" + (summaries[row].startTime > 0 ? "+" : "") + Time.timeToString(summaries[row].startTime + units, 3) + "</td>");
            tr.append(td);
            tr.append("<td colspan='2' class='description' nowrap>" + START_TIME_DESCRIPTION + "</td>");
            table.append(tr);

            // vertical space
            table.append("<tr><td colspan='4' class='vertical-space'></td></tr>");

            // phases description
            table.append("<tr class='breakdown-description'><td colspan='4' class='description' nowrap>" + PHASES_DESCRIPTION + "</td></tr>");

            // breakdowns
            Y.each(summaries[row].durations, function (duration) {
                tr = Y.Node.create("<tr class='breakdown'></tr>");
                tr.append("<td class='duration-color gradient' style='background-color:" + duration.color + "'></td>");
                tr.append("<td class='time'>" + (duration.startTime > 0 ? "+" : "") + Time.timeToString(duration.startTime + units, 3) + "</td>");
                tr.append("<td class='duration'>" + (duration.duration > 0 ? "+" : "") + Time.timeToString(duration.duration + units, 3) + "</td>");
                tr.append("<td class='name'>" + duration.name + "</td>");
                table.append(tr);
            });

            Y.Array.each(events, function (event) {
                if (event.enabled) {
                    enabledEvents.push(event);
                }
            });

            if (enabledEvents.length > 0) {
                // vertical space
                table.append("<tr><td colspan='4' class='vertical-space'></td></tr>");

                // events description
                table.append("<tr class='breakdown-description'><td colspan='4' class='description'>" + EVENTS_DESCRIPTION + "</td></tr>");

                // events
                Y.Array.each(enabledEvents, function (event) {
                    var relativeTime = event.time - (summaries[row].startTime + absoluteStartTime);
                    tr = Y.Node.create("<tr class='breakdown'></tr>");
                    tr.append("<td><div class='event-color' style='border-left: 2px solid " + event.color + "'/></td>");
                    tr.append("<td class='time'>" + (relativeTime > 0 ? "+" : "") + Time.timeToString(relativeTime + units, 3) + "</td>");
                    tr.append("<td class='name' colspan='2'>" + event.name + "</td>");
                    table.append(tr);
                });
            }

            // vertical space
            table.append("<tr><td colspan='4' class='vertical-space'></td></tr>");

            popup.node.append(table);
        }

        function getCloseEvents(mouseX) {
            // Update lastColum properties if they haven't been set.
            timelineColumnLeft = timelineColumn.getX();
            timelineColumnWidth = timelineColumn.get('offsetWidth');

            // Determine if close to events
            var pixelWidth = timelineColumnWidth,//timelineColumn.get('offsetWidth') - timelineColumn.getStyle('paddingRight').replace('px', ''),
                left = timelineColumnLeft,//timelineColumn.getX(),
                eventDistances = [],
                closeEvents = [];

            Y.Array.each(events, function (event, i) {
                if (!event.enabled) {
                    return;
                }
                var eventPercentX = (event.time - absoluteStartTime) / timeWidth,
                    mousePercentX = (mouseX - left) / pixelWidth,
                    percentXDiff = Math.abs(eventPercentX - mousePercentX),
                    pixelXDiff = percentXDiff * pixelWidth;

                eventDistances.push({
                    event: event,
                    distance: pixelXDiff,
                    num: i
                });
            });

            // Sort by distance
            eventDistances.sort(function (a, b) {
                return a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0;
            });

            // Determine close events
            Y.Array.some(eventDistances, function (event) {
                if (event.distance > EVENT_DISTANCE_THRESHOLD) {
                    return true;
                }
                closeEvents.push(event);
            });

            if (closeEvents.length > 0) {
                return closeEvents;
            }
            return null;
        }

        function isOverProfile(mouseX, row) {
            var summary = summaries[row],
                pixelWidth = timelineColumnWidth,
                left = timelineColumnLeft,
                profileStartX = summary.startTime * pixelWidth / timeWidth,
                profileEndX = summary.endTime * pixelWidth / timeWidth;

            mouseX = mouseX - left;

            return mouseX >= profileStartX - PROFILE_DISTANCE_THRESHOLD &&
                   mouseX <= profileEndX + PROFILE_DISTANCE_THRESHOLD;
        }

        popup = new Y.mojito.Waterfall.Popup(waterfallTable, 'table > tbody > tr > td.timeline', function (e, row) {
            var closeEvents = getCloseEvents(e.pageX);

            if (closeEvents) {
                setEventsSummary(closeEvents);
                popup.show();
                isProfileSummary = false;
            } else if (isOverProfile(e.pageX, row)) {
                setProfileSummary(row);
                isProfileSummary = true;
                popup.show();
            } else {
                popup.hide();
            }
        }, function (e, row) {
            var closeEvents = getCloseEvents(e.pageX);

            if (closeEvents) {
                setEventsSummary(closeEvents);
                if (!popup.mousedown) {
                    popup.show();
                }
                isProfileSummary = false;
            } else if (!isOverProfile(e.pageX, row)) {
                popup.hide();
            } else if (!isProfileSummary) {
                setProfileSummary(row);
                isProfileSummary = true;
            }
        }, 'waterfall-summary');

        return popup;
    }

    Y.namespace('mojito.Waterfall').SummaryPopup = SummaryPopup;
}, '0.0.1', {
    requires: [
        'mojito-waterfall-popup',
        'mojito-waterfall-time'
    ]
});
