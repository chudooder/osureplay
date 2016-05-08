// timing distribution
osuReplay.directive('hitmap', [
    '$window',
    function($window) {

    var hitmapImpl = function(scope, element, attrs) {
        var elem = element[0];

        var margin = {top: 10, right: 10, bottom: 10, left: 10};
        var width = 256;
        var height = 256;
        var hitmap, circleRadius, hitmapSize;

        var dx, dy;


        var xValue = function(d, i) { return d.xi };
        var xScale = d3.scale.linear(); 
        var xMap = function(d, i) {
            return xScale(xValue(d, i));
        }

        var yValue = function(d) { return d.yi };
        var yScale = d3.scale.linear();
        var yMap = function(d) { 
            return yScale(yValue(d)); 
        }

        var cScale = d3.scale.linear()
            .domain([0, 0.2, 0.4, 0.6, 0.8, 1.0])
            .range(["#FFF", "#CDD169", "#59A442", "#24764D", "#0F3C49", "#000"]);

        var eventCMap = function(d) {
            var mapping = {
                '100': COLOR_100,
                '50': COLOR_50,
                'miss': COLOR_MISS
            };

            return mapping[d.event];
        }

        var update = function(newVal, oldVal) {
            if(!newVal) return;

            hitmap = newVal.hitmap;
            circleRadius = newVal.circleRadius;
            events = newVal.events;
            hitmapSize = newVal.hitmapSize;

            dx = Math.sqrt(hitmap.length);
            dy = Math.sqrt(hitmap.length);

            xScale.domain([0, dx]);
            yScale.domain([0, dy]);

            // reset the plot
            d3.select(elem).selectAll('*').remove();

            var drawHeatmap = function(canvas) {
                var max = d3.max(hitmap) / 1.0;
                var context = canvas.node().getContext("2d");
                var imgWidth = dx;
                var imgHeight = dy;
                var image = context.createImageData(imgWidth, imgHeight);
                var size = Math.sqrt(hitmap.length);

                for (var y = 0, p = -1; y < imgHeight; ++y) {
                    for (var x = 0; x < imgWidth; ++x) {
                        var yp = Math.floor(y / imgHeight * dy);
                        var xp = Math.floor(x / imgWidth * dx);
                        var c = d3.rgb(cScale(hitmap[yp*size+xp] / max));
                        image.data[++p] = c.r;
                        image.data[++p] = c.g;
                        image.data[++p] = c.b;
                        image.data[++p] = 255;
                    }
                }

                context.putImageData(image, 0, 0)
            }

            d3.select(elem).append('canvas')
                .attr('x', margin.left)
                .attr('y', margin.top)
                .attr('width', dx)
                .attr('height', dy)
                .style('width', width + 'px')
                .style('height', height + 'px')
                .style('border-style', 'solid')
                .style('border-width', '1px')
                .style('image-rendering', 'pixelated')
                .call(drawHeatmap);


            var svg = d3.select(elem).append('svg')
                .style('position', 'absolute')
                .style('top', 0)
                .style('left', 0)
                .attr('width', width)
                .attr('height', height);

            svg.append('circle')
                .attr('cx', width / 2)
                .attr('cy', height / 2)
                .attr('r', circleRadius * width / hitmapSize)
                .style('fill', 'none')
                .style('stroke', 'red')
                .style('stroke-width', 1);

            svg.append('line')
                .attr('x1', width / 2)
                .attr('y1', 0)
                .attr('x2', width / 2)
                .attr('y2', height)
                .attr('class', 'hitmap-line');

            svg.append('line')
                .attr('x1', 0)
                .attr('y1', height / 2)
                .attr('x2', width)
                .attr('y2', height / 2)
                .attr('class', 'hitmap-line');

            svg.selectAll('.dot')
                .data(events)
            .enter()
            .append('circle')
            .filter(function(d) { return d.xi != -1  && d.event == 'miss' })
                .attr('cx', xMap)
                .attr('cy', yMap)
                .attr('r', 3)
                .style('fill', eventCMap)
            /* Some bugfixing code
            .append('text')
            .filter(function(d) { return d.xi != -1  && d.event == 'miss' })
                .attr('x', xMap)
                .attr('y', yMap)
                .text(function(d) { return d.t })
            */



        }
        scope.$watch('val', update);

        var resize = function() {
            width = elem.clientWidth - margin.left - margin.right;
            height = width;

            xScale.range([0, width]);
            yScale.range([0, height]);
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
        link: hitmapImpl
    };

}]);