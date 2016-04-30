var osuReplay = angular.module('osuReplay', []);

var COLOR_100 = '#57E313';
var COLOR_50 = '#DAAE46';
var COLOR_MISS = '#F82929';

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

var initScope = function(scope, replay) {
    scope.replay = replay;
    scope.timeline = {
        objects: replay.timeline,
        length: replay.beatmap.length
    }
    console.log(replay);
}

// timeline
osuReplay.directive('timelinePlot', [
    '$window', 
    function($window) {

    var timelineImpl = function(scope, element, attrs) {
        var elem = element[0];

        var margin = {top: 10, right: 10, bottom: 10, left: 10};
        var width;
        var height = 200;

        var svg = d3.select(element[0])
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

        // main stuff

        var update = function(newVal, oldVal) {
            if(!newVal) {
                return;
            }
            console.log('updating at width ' + width);

            var length = newVal.length;
            var objects = newVal.objects;

            xScale.domain([0, length]);

            // reset the plot
            svg.selectAll('*').remove();

            // draw the base line
            var lineWidth = 10;
            var lineX1 = xScale(0);
            var lineX2 = xScale(length);
            var lineY = margin.top + height - lineWidth/2;
            svg.append('line')
                .attr('x1', lineX1)
                .attr('y1', lineY)
                .attr('x2', lineX2)
                .attr('y2', lineY)
                .style('stroke-width', lineWidth)
                .style('stroke', '#CCC')
                .style('stroke-linecap', 'round');

            // iterate over data and draw points on line

            /*
            var rectWidth = 6;
            var rectHeight = 20;
            svg.selectAll('rect')
                .data(objects)
            .enter().append('rect')
                .attr('x', function(d) { return xMap(d) - rectWidth/2 })
                .attr('y', lineY - rectHeight/2)
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .style('fill', cMap)
                .style('opacity', 0.5);
            */
            
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
                .style('opacity', 1);
            

        };
        scope.$watch('val', update);

        var resize = function() {
            console.log('ayy');
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
    }
}]);