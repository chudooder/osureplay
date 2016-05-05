// stream timings
osuReplay.directive('streamsPlot', [
    '$window',
    function($window) {

    var streamsImpl = function(scope, element, attrs) {
        var elem = element[0];

        var margin = {top: 20, right: 10, bottom: 20, left: 30};
        var width;
        var height = 150;

        var timingWindow, timings;

        var svg = d3.select(elem)
            .append('svg')

        var xValue = function(d, i) { return i; };
        var xScale = d3.scale.linear();
        var xMap = function(d, i) {
            return xScale(xValue(d, i));
        }

        var yValue = function(d, i) { return d; };
        var yScale = d3.scale.linear()
            .range([-height/2, height/2]);
        var yMap = function(d, i) {
            return yScale(yValue(d, i));
        }

        var colorMap = function(d, i) {
            var t = d;
            if(Math.abs(t) < timingWindow.w300)
                return COLOR_300;
            else if(Math.abs(t) < timingWindow.w100)
                return COLOR_100;
            else
                return COLOR_50;
        }

        var update = function(newVal, oldVal) {
            if(!newVal) return;

            // reset the plot
            svg.selectAll('*').remove();

            timingWindow = newVal.timingWindow;
            timings = newVal.timings;

            xScale.domain([0, timings.length]);
            yScale.domain([-timingWindow.w50, timingWindow.w50]);

            var timingTooltip = svg.append('text')
                .attr('x', 0)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .style('fill', COLOR_GRAY)
                .style('visibility', 'hidden')
                .text('lmao');

            var centerY = margin.top + height / 2;
            var barWidth = Math.max(2, width / timings.length);

            var xAxisPos = height + margin.top;
            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient('bottom');

            var yAxisPos = margin.left;
            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient('left');

            svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (xAxisPos) + ')')
                .call(xAxis)

            svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + (yAxisPos) + ',' +
                    (height/2 + margin.top) + ')')
                .call(yAxis);

            // main visible bar
            svg.selectAll('.bar')
                .data(timings)
            .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', xMap)
                .attr('y', centerY)
                .attr('height', 0)
                .attr('width', barWidth)
                .style('fill', colorMap)
            .transition(500)
                .delay(function(d, i) {
                    return i * 50; 
                })
                .attr('y', function(d, i) {
                    var height = yMap(d, i);
                    if(height > 0) {
                        return centerY;
                    } else {
                        return centerY + height;
                    }
                })
                .attr('height', function(d, i) {
                    return Math.abs(yMap(d, i));
                });

            // hover area
            svg.selectAll('.hoverarea')
                .data(timings)
            .enter().append('rect')
                .attr('class', 'hoverarea')
                .attr('x', xMap)
                .attr('y', margin.top)
                .attr('width', barWidth)
                .attr('height', height)
                .style('fill', '#FFF')
                .style('opacity', 0)
                .on('mouseover', function(d) {
                    var formatted = d.toFixed(1);
                    timingTooltip.style('visibility', 'visible')
                        .text(formatted + ' ms');
                })
                .on('mouseout', function(d) {
                    timingTooltip.style('visibility', 'hidden');
                })
                .on('mousemove', function(d, i) {
                    timingTooltip
                        .attr('x', function() {
                            return xMap(d, i) + barWidth/2
                        })
                        .attr('y', function() {
                            var barVal = yMap(d, i);
                            if(barVal > 0) {
                                return yMap(d, i) + centerY + 10;
                            } else {
                                return yMap(d, i) + centerY - 10;
                            }
                        });
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
    }

    return {
        restrict: 'E',
        scope: {
            val: '='
        },
        link: streamsImpl
    };

}]);