'use strict';

angular.module('acCalendar', ['ngDraggable'])
    .constant('moment', moment)
    .provider('$acCalendar', function() {
        var options = {
            moment : {
                date: {
                    hour         : 'ha',
                    day          : 'D MMM',
                    month        : 'MMMM',
                    weekDay      : 'dddd',
                    weekDayShort : 'ddd',
                    time         : 'HH:mm',
                    datetime     : 'MMM D, h:mm a'
                },
                title: {
                    day: 'dddd D MMMM, YYYY',
                    week: 'Week {week} of {year}',
                    month: 'MMMM YYYY',
                    year: 'YYYY'
                }
            },
            i18n : {
                previous: 'Anterior',
                today: 'Hoje',
                next: 'Próximo',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
                year: 'Ano'
            }
        };

        this.setOptions = function (options_in) {
            angular.merge(options, options_in);
        };

        this.getOptions = function () {
            return options;
        };

        this.$get = function () {
            return {
                options : options
            };
        };
    })
    .service('$acCalendarService', function() {
        var model = {
            calendarView  : 'month',
            showToday     : false,
            eventView     : false,
            view   : [],
            config : [],
            events : [],
            group  : []
        };

        var buttons = {
            prev  : true,
            next  : true,
            today : true,
            month : true,
            day   : true,
            week  : true
        };

        this.mergeModel = function(model_in) {
            return angular.extend({}, model, model_in);
        };

        this.mergeButtons = function(buttons_in) {
            return angular.extend({}, buttons, buttons_in);
        };

        this.getWeekDayNames = function(format) {
            var weekdays = [];
            var count = 0;
            while (count < 7) {
                weekdays.push(moment().weekday(count++).format(format));
            }
            return weekdays;
        };

        this.getMonthView = function(viewDate_in, model_in) {
            var monthView = [];
            var viewDate = viewDate_in.toDate();
            var startOfMonth = moment(viewDate).startOf('month');
            var day = startOfMonth.clone().startOf('week');
            var endOfMonthView = moment(viewDate).endOf('month').endOf('week');
            var today = moment().startOf('day');
            var yesterday;

            while (day.isBefore(endOfMonthView)) {
                var inMonth = day.month() === moment(viewDate).month();

                var cell = {
                    label     : day.date(),
                    date      : day.clone(),
                    inMonth   : inMonth,
                    isPast    : today.isAfter(day),
                    isToday   : today.isSame(day),
                    isFuture  : today.isBefore(day),
                    isWeekend : [0, 6].indexOf(day.day()) > -1,
                    events    : this.filterEvents(model_in.events, day),
                    config    : this.getConfig(model_in.config, day)
                };

                monthView.push(cell);
                yesterday = day.date();
                day.add(1, 'day');

                if (yesterday == day.date()) day.add(1, 'hours');
            }
            return monthView;
        };

        this.getWeekView = function(currentMonth_in, model_in) {
            var monthView = this.getMonthView(currentMonth_in, model_in);
            var rows = Math.floor(monthView.length / 7);
            var weeksView = [];

            for (var i = 0; i < rows; i++) {
                weeksView[i] = [];
                for (var j = 0; j < 7; j++) {
                    weeksView[i].push(monthView.shift());
                }
            }
            return weeksView;
        };

        this.filterEvents = function(events_in, day_in) {
            var events = [];

            events_in.map(function(value) {
                if (day_in) {
                    if (value.start && value.start.isSame(day_in, 'day')) {
                        events.push(value);
                    }
                } else {
                    if (!value.start) {
                        events.push(value);
                    }
                }
            });
            return events;
        };

        this.getConfig = function(config_in, day_in) {
            var config;

            config_in.map(function(value) {
                if (value.date.isSame(day_in, 'day')) {
                    config = value;
                }
            });
            return config;
        };
    })
    .directive('acCalendar', function() {
        return {
            restrict   : 'E',
            scope      : {
                buttons : '=',
                ngModel : '='
            },
            template   : '<ac-calendar-container>' +
            '<ac-calendar-view>' +
            '<ac-controls></ac-controls>' +
            '<ac-month-view class="ng-hide" ng-show="options.model.calendarView == \'month\'"></ac-month-view>' +
            '<ac-week-view class="ng-hide" ng-show="options.model.calendarView == \'week\'"></ac-week-view>' +
            '<ac-day-view class="ng-hide" ng-show="options.model.calendarView == \'day\'"></ac-day-view>' +
            '</ac-calendar-view>' +
            '<ac-event-view class="ng-hide" ng-show="eventView.length || options.model.eventView"></ac-event-view>' +
            '<ac-calendar-container>',
            controller : function($scope, $acCalendarService, $acCalendar) {
                $scope.loadOptions = function() {
                    $scope.options = {
                        i18n    : $acCalendar.options.i18n,
                        buttons : $acCalendarService.mergeButtons($scope.buttons),
                        model   : $acCalendarService.mergeModel($scope.ngModel)
                    };
                };

                $scope.loadMonthView = function() {
                    $scope.title = $scope.currentMonth.format($acCalendar.options.moment.title.month);
                    $scope.weekdaysName = $acCalendarService.getWeekDayNames($acCalendar.options.moment.date.weekDay);
                    $scope.weekdaysShortName = $acCalendarService.getWeekDayNames($acCalendar.options.moment.date.weekDayShort);
                    $scope.weeksView = $acCalendarService.getWeekView($scope.currentMonth, $scope.options.model);
                };

                $scope.loadEventView = function() {
                    $scope.eventView = $acCalendarService.filterEvents($scope.options.model.events);
                };

                $scope.loadEvents = function (weekIndex_in, day_in) {
                    if (weekIndex_in) {
                        $scope.clearEvents(weekIndex_in);
                        if (day_in.events.length)
                            $scope.events[weekIndex_in] = day_in.events;
                    } else {
                        var weekIndex, weekTotal, dayIndex, dayTotal;

                        for (weekIndex=0, weekTotal=$scope.weeksView.length; weekIndex < weekTotal; weekIndex++) {
                            $scope.clearEvents(weekIndex);

                            for (dayIndex=0, dayTotal=$scope.weeksView[weekIndex].length; dayIndex < dayTotal; dayIndex++) {

                                if ($scope.weeksView[weekIndex][dayIndex].date.isSame(day_in.date, 'day')) {
                                    if ($scope.weeksView[weekIndex][dayIndex].events.length)
                                        $scope.events[weekIndex] = $scope.weeksView[weekIndex][dayIndex].events;
                                }
                            }
                        }
                    }
                };

                $scope.clearEvents = function(index_in) {
                    if (index_in) $scope.events[index_in] = [];
                    else $scope.events = [];
                };

                $scope.loadOptions();

            },
            link: function(scope, element, attrs) {
                scope.currentMonth = moment().startOf(scope.options.model.calendarView);
                scope.loadMonthView();
            }
        };
    })
    .directive('acControls', function() {
        var template = '<ac-actions>' +
            '<ac-left>' +
            '<ac-group-button>' +
            '<button type="button" class="ac-button" ng-class="{\'ac-button-active\': options.view == \'month\'}" ng-if="options.buttons.prev" ng-click="prevMonth()">{{options.i18n.previous}}</button>' +
            '<button type="button" class="ac-button" ng-class="{\'ac-button-active\': options.view == \'month\'}" ng-if="options.buttons.next" ng-click="nextMonth()">{{options.i18n.next}}</button>' +
            '<button type="button" class="ac-button" ng-class="{\'ac-button-active\': options.view == \'month\'}" ng-if="options.buttons.today" ng-click="today()">{{options.i18n.today}}</button>' +
            '</ac-group-button>' +
            '</ac-left>' +
            '<ac-text>{{title}}</ac-text>' +
            '<ac-right>' +
            '<ac-group-button>' +
            '<button class="ac-button" type="button" ng-class="{\'ac-button-active\': options.model.calendarView == \'week\'}" ng-click="options.model.calendarView = \'week\'">{{options.i18n.week}}</button>' +
            '<button class="ac-button" type="button" ng-class="{\'ac-button-active\': options.model.calendarView == \'month\'}" ng-click="options.model.calendarView = \'month\'">{{options.i18n.month}}</button>' +
            '<button class="ac-button" type="button" ng-class="{\'ac-button-active\': options.model.calendarView == \'day\'}" ng-click="options.model.calendarView = \'day\'">{{options.i18n.day}}</button>' +
            '</ac-group-button>' +
            '</ac-right>' +
            '</ac-actions>';

        return {
            restrict: 'E',
            require: '^acCalendar',
            template: template,
            controller: function($scope) {
                $scope.prevMonth = function() {
                    $scope.currentMonth.subtract(1, 'month');
                    $scope.loadMonthView();
                    $scope.clearEvents();
                };

                $scope.nextMonth = function() {
                    $scope.currentMonth.add(1, 'month');
                    $scope.loadMonthView();
                    $scope.clearEvents();
                };

                $scope.today = function() {
                    $scope.currentMonth = moment().startOf('month');
                    $scope.loadMonthView();
                    $scope.clearEvents();
                };
            }
        };
    })
    .directive('acMonthView', function() {
        return {
            restrict   : 'E',
            require    : '^acCalendar',
            template   : '<ac-week-name>' +
            '<ac-day-name ng-repeat="dayName in weekdaysName">' +
            '<span class="ac-day-name">{{dayName}}</span>' +
            '<span class="ac-day-name-short">{{weekdaysShortName[$index]}}</span>' +
            '</ac-day-name>' +
            '</ac-week-name>' +
            '<ac-month>' +
            '<ac-week-events ng-repeat="(weekIndex, week) in weeksView">' +
            '<ac-week>' +
            '<ac-day ng-repeat="day in week" ng-init="showTodayEvents(weekIndex, day)" ng-click="showEvents(weekIndex, day)" ng-drop="true" ng-drop-success="onDropDay(day, $data)" ng-class="{\'ac-outmonth\': !day.inMonth, \'ac-ispast\': day.isPast, \'ac-isfuture\': day.isFuture, \'ac-isweekend\': day.isWeekend, \'ac-istoday\': day.isToday, \'ac-eventOpen\': (day.events.length && dateEventOpen.date.isSame(day.date)), \'ac-eventOverload\': (day.config.maxEvents && day.config.maxEvents < day.events.length), \'ac-eventFull\': day.config.maxEvents == day.events.length}">' +
            '<ac-day-top>' +
            '<ac-day-label>{{day.label}}</ac-day-label>' +
            '</ac-day-top>' +
            '<ac-day-bottom>' +
            '<ac-day-event-total>{{day.events.length}} <span ng-if="day.config.maxEvents"> / {{day.config.maxEvents}}</span></div>' +
            '</ac-day-bottom>' +
            '</ac-day>' +
            '</ac-week>' +
            '<ac-events class="ng-hide" ng-show="events[weekIndex].length">' +
            '<ac-event class="{{event.cssClass}}" ng-repeat="event in events[weekIndex]" data-allow-transform="false" ng-drag="{{event.draggable}}" ng-drag-data="{weekIndex: weekIndex, event: event}" ng-center-anchor="true" ng-class="{\'ac-draggable\': event.draggable}">' +
            '{{event.title}}' +
            '</ac-event>' +
            '</ac-events>' +
            '</ac-week-events>' +
            '</ac-month>',
            controller : function($scope) {
                if ($scope.options.model.calendarView == 'month') {
                    $scope.dateEventOpen = null;
                    $scope.showEvents = function (weekIndex_in, day_in) {
                        $scope.clearEvents();
                        if ($scope.dateEventOpen && $scope.dateEventOpen.date.isSame(day_in.date)) {
                            $scope.dateEventOpen = null;
                        } else {
                            $scope.loadEvents(weekIndex_in, day_in);
                            $scope.dateEventOpen = day_in;
                        }
                    };

                    $scope.showTodayEvents = function (weekIndex_in, day_in) {
                        if ($scope.options.model.showToday) {
                            var today = moment().startOf('day');

                            if (today.isSame(day_in.date)) {
                                $scope.showEvents(weekIndex_in, day_in);
                                $scope.dateEventOpen = day_in;
                                $scope.ngModel.showToday = false;
                            }
                        }
                    };

                    $scope.clearEvents();
                }
            },
            link : function(scope, element, attr) {
                scope.onDropDay = function (day_in, data_in) {
                    var eventIndex;
                    var eventModelIndex = scope.ngModel.events.indexOf(data_in.event);
                    var event = scope.ngModel.events[eventModelIndex];

                    if (data_in.weekIndex != null) {
                        if (!day_in.date.isSame(data_in.event.start, 'day')) {
                            eventIndex = scope.events[data_in.weekIndex].indexOf(data_in.event);

                            scope.events[data_in.weekIndex].splice(eventIndex, 1);
                        }
                    } else {
                        eventIndex = scope.eventView.indexOf(data_in.event);

                        scope.eventView.splice(eventIndex, 1);
                    }

                    event.start = day_in.date;

                    scope.loadOptions();
                    scope.loadMonthView();

                    if (scope.dateEventOpen && scope.dateEventOpen.date.isSame(day_in.date)) {
                        scope.loadEvents(null, day_in);
                    }
                };
            }
        };
    })
    .directive('acEventView', function() {
        return {
            restrict : 'E',
            require  : '^acCalendar',
            template : '<ac-event-view-container ng-drop="true" ng-drop-success="onDropEventView($data)">' +
            '<ac-events>' +
            '<ac-event class="{{event.cssClass}}" ng-repeat="event in eventView" ng-drag="{{event.draggable}}" ng-drag-data="{weekIndex: null, event: event}" data-allow-transform="false" ng-center-anchor="true" ng-class="{\'ac-draggable\': event.draggable}">' +
            '{{event.title}}' +
            '</ac-event>' +
            '</ac-events>' +
            '</ac-event-view-container>',
            controller : function($scope, $acCalendarService) {
                $scope.eventView = $acCalendarService.filterEvents($scope.options.model.events);

                $scope.onDropEventView = function (data_in) {
                    if (data_in.weekIndex) {
                        var eventModelIndex = $scope.ngModel.events.indexOf(data_in.event);
                        var eventIndex = $scope.events[data_in.weekIndex].indexOf(data_in.event);

                        $scope.ngModel.events[eventModelIndex].start = null;
                        $scope.ngModel.events[eventModelIndex].end = null;
                        $scope.events[data_in.weekIndex].splice(eventIndex, 1);
                        $scope.loadOptions();
                        $scope.loadMonthView();

                        $scope.eventView = $acCalendarService.filterEvents($scope.options.model.events);
                    }
                };
            }
        };
    })
    .directive('acWeekView', function() {
        return {
            restrict: 'E',
            require: '^acCalendar'
        };
    })
    .directive('acDayView', function() {
        return {
            restrict: 'E',
            require: '^acCalendar'
        };
    });