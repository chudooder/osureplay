var osuReplay = angular.module('osuReplay', []);

var COLOR_300 = '#32BCE7';
var COLOR_100 = '#57E313';
var COLOR_50 = '#DAAE46';
var COLOR_MISS = '#F82929';
var COLOR_GRAY = '#666666';

osuReplay.controller('ReplayCtrl', [
    '$scope', 
    '$http', 
    '$routeParams',
    'replayService',
    function($scope, $http, $routeParams, replayService) {
        $scope.replay = null;
        $scope.error = ""

        var replayData = replayService.getReplayData();
        if(replayData != null) {
            initScope($scope, replayData);
        } else {
            var hash = $routeParams.hash;
            $http.get("/api/replay/"+hash)
            .success(function(res) {
                if(res != null) {
                    initScope($scope, res);
                } else {
                    $scope.error = "Could not find replay of the given hash."
                    return;
                }
            })
            .error(function(res) {

            });
        }

    }]);

var getTimingWindow = function(replay) {
    var od = replay.beatmap.od;
    var modOD = od;
    if(replay.mods.ez)
        modOD = 0.5 * od;
    else if(replay.mods.hd)
        modOD = Math.min(1.4 * od, 10);

    var w300 = 79.5 - 6.0 * modOD
    var w100 = 139.5 - 8.0 * modOD
    var w50 = 199.5 - 10.0 * modOD
    return {
        w300: w300,
        w100: w100,
        w50: w50
    }
}

var initScope = function(scope, replay) {
    scope.replay = replay;
    scope.timeline = {
        objects: replay.timeline,
        length: replay.beatmap.length
    }
    var timingWindow = getTimingWindow(replay);
    scope.timings = {
        timingWindow: timingWindow,
        buckets: replay.timings
    }
}

// timeline
osuReplay.directive('timelinePlot', [
    '$window', 
    function($window) {

    var timelineImpl = function(scope, element, attrs) {
        var elem = element[0];

        var margin = {top: 10, right: 10, bottom: 10, left: 10};
        var width;
        var height = 75;

        var svg = d3.select(elem)
            .append('svg');

        var xValue = function(d) { return d.t; };
        var xScale = d3.scale.linear();
        var xMap = function(d) { return xScale(xValue(d)); };

        var cMap = function(d) {
            var mapping = {
                '100': COLOR_100,
                '50': COLOR_50,
                'miss': COLOR_MISS
            };

            return mapping[d.event];
        }

        function pad(num, size) {
            var s = num+"";
            while (s.length < size) s = "0" + s;
            return s;
        }

        var getTimeString = function(len) {
            var mins = Math.floor(len / 60000);
            var secs = Math.floor(len / 1000) % 60;

            return mins + ':' + pad(secs, 2);
        }

        // main stuff

        var update = function(newVal, oldVal) {
            if(!newVal) {
                return;
            }

            var length = newVal.length;
            var objects = newVal.objects;

            xScale.domain([0, length]);

            // reset the plot
            svg.selectAll('*').remove();


            var timingTooltip = svg.append('text')
                .attr('x', 0)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .style('fill', COLOR_GRAY)
                .text('lmao');

            // draw the base line
            var lineWidth = 10;
            var lineX1 = xScale(0);
            var lineX2 = xScale(length);
            var lineY = margin.top + height - lineWidth/2 - 20;
            var lineColor = '#CCC';
            if(objects.length == 0) {
                lineColor = '#FFBF00'
            }
            svg.append('line')
                .attr('x1', lineX1)
                .attr('y1', lineY)
                .attr('x2', lineX2)
                .attr('y2', lineY)
                .style('stroke-width', lineWidth)
                .style('stroke', lineColor)
                .style('stroke-linecap', 'round');

            // iterate over data and draw points on line
            
            var circleRadius = 5;
            svg.selectAll('circle')
                .data(objects)
            .enter().append('circle')
                .attr('cx', function(d) { return xMap(d) })
                .attr('cy', lineY)
                .attr('r', circleRadius)
                .style('fill', 'white')
                .style('stroke', cMap)
                .style('stroke-width', 2)
                .style('opacity', 1)
                .on('mouseover', function(d) {
                    timingTooltip.style('visibility', 'visible')
                        .text(d.timing+' ms');
                })
                .on('mouseout', function(d) {
                    timingTooltip.style('visibility', 'hidden');
                })
                .on('mousemove', function(d) {
                    timingTooltip.attr('x', d3.select(this).attr('cx'))
                        .attr('y', lineY - 20);
                })

            svg.append('text')
                .attr('x', lineX1)
                .attr('y', lineY + 20)
                .attr('fill', COLOR_GRAY)
                .text('0:00');

            svg.append('text')
                .attr('x', lineX2)
                .attr('y', lineY + 20)
                .attr('fill', COLOR_GRAY)
                .attr('text-anchor', 'end')
                .text(getTimeString(length));
            

        };
        scope.$watch('val', update);

        var resize = function() {
            width = elem.clientWidth - margin.left - margin.right;
            // height = elem.clientHeight - margin.top - margin.bottom;
            
            svg.attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);

            xScale.range([margin.left, width + margin.left]);
        }

        // resize event
        angular.element($window).bind('resize', function() {
            resize();
            scope.$digest();
            update(scope.val, scope.val)
        });

        resize();
    }

    return {
        restrict: 'E',
        scope: {
            val: '='
        },
        link: timelineImpl
    };
}]);

// timing distribution
osuReplay.directive('timingDistrib', [
    '$window',
    function($window) {

    var timingDistribImpl = function(scope, element, attrs) {
        var elem = element[0];

        var margin = {top: 20, right: 10, bottom: 20, left: 10};
        var width;
        var height = 150;
        var timingWindow, buckets, bucketWidth;

        var xScale = d3.scale.linear(); 
        var xValue = function(d, i) {
            return bucketWidth * i - timingWindow.w50;
        }
        var xMap = function(d, i) {
            return xScale(xValue(d, i));
        }

        var yScale = d3.scale.linear()
            .range([0, height]);
        var yValue = function(d) { return d; }
        var yMap = function(d) { return yScale(yValue(d)); }

        var colorMap = function(d, i) {
            var t = bucketWidth*i - timingWindow.w50;
            if(Math.abs(t) < timingWindow.w300)
                return COLOR_300;
            else if(Math.abs(t) < timingWindow.w100)
                return COLOR_100;
            else
                return COLOR_50;
        }

        var svg = d3.select(elem)
            .append('svg');

        var update = function(newVal, oldVal) {
            if(!newVal) return;
            timingWindow = newVal.timingWindow;
            buckets = newVal.buckets;
            bucketWidth = timingWindow.w50*2 / buckets.length; 

            // reset the plot
            svg.selectAll('*').remove();

            xScale.domain([-timingWindow.w50, timingWindow.w50]);
            yScale.domain([0, d3.max(buckets)]);

            var xAxisPos = height + margin.top;
            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient('bottom');

            svg.append('g')
                .attr('class', 'x axis')
                .attr("transform", "translate(0," + (xAxisPos) + ")")
                .call(xAxis);

            var barWidth = width / buckets.length - 2;
            svg.selectAll('.bar')
                .data(buckets)
            .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', xMap)
                .attr('y', height + margin.top)
                .attr('width', barWidth)
                .attr('height', 0)
                .style('fill', colorMap)
            .transition()
                .duration(500)
                .delay(function(d, i) {
                    return 100 * Math.abs(i - buckets.length / 2);
                })
                .attr('y', function(d, i) {
                    return height + margin.top - yMap(d, i);
                })
                .attr('height', function(d, i) {
                    return yMap(d, i);
                });

        }
        scope.$watch('val', update);

        var resize = function() {
            width = elem.clientWidth - margin.left - margin.right;
            
            svg.attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);

            xScale.range([margin.left, width + margin.left]);
        }

        // resize event
        angular.element($window).bind('resize', function() {
            resize();
            scope.$digest();
            update(scope.val, scope.val)
        });

        resize();

    };

    return {
        restrict: 'E',
        scope: {
            val: '='
        },
        link: timingDistribImpl
    };

}])