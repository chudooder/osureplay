// timing distribution
osuReplay.directive('timingPlot', [
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

            var barWidth = Math.max(2, width / buckets.length - 2);
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
                    return 50 * Math.abs(i - buckets.length / 2);
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

}]);