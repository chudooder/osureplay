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
                .style('fill', COLOR_GRAY);

            var timeTooltip = svg.append('text')
                .attr('x', 0)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .style('fill', COLOR_GRAY);

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
            svg.selectAll('.dot')
                .data(objects)
            .enter().append('circle')
                .attr('class', 'dot')
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
                    timeTooltip.style('visibility', 'visible')
                        .text(getTimeString(d.t));
                })
                .on('mouseout', function(d) {
                    timingTooltip.style('visibility', 'hidden');
                    timeTooltip.style('visibility', 'hidden');
                })
                .on('mousemove', function(d) {
                    timingTooltip.attr('x', d3.select(this).attr('cx'))
                        .attr('y', lineY - 20);
                    timeTooltip.attr('x', d3.select(this).attr('cx'))
                        .attr('y', lineY + 30);
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