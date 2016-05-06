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

        var xScale = d3.scale.linear(); 
        var xValue = function(d, i) {
            return bucketWidth * i - timingWindow.w50;
        }
        var xMap = function(d, i) {
            return xScale(xValue(d, i));
        }

        var yScale = d3.scale.linear();
        var yValue = function(d) { return d; }
        var yMap = function(d) { return yScale(yValue(d)); }

        var cScale = d3.scale.linear()
            .domain([0, 0.2, 0.4, 0.6, 0.8, 1.0])
            .range(["#FFF", "#CDD169", "#59A442", "#24764D", "#0F3C49", "#000"]);

        var update = function(newVal, oldVal) {
            if(!newVal) return;

            hitmap = newVal.hitmap;
            circleRadius = newVal.circleRadius;
            hitmapSize = newVal.hitmapSize;

            dx = Math.sqrt(hitmap.length);
            dy = Math.sqrt(hitmap.length);

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
                .attr('r', circleRadius / hitmapSize * width)
                .style('fill', 'none')
                .style('stroke', 'red')
                .style('stroke-width', 1);


        }
        scope.$watch('val', update);

        var resize = function() {
            width = elem.clientWidth - margin.left - margin.right;
            height = width;

            xScale.range([margin.left, width + margin.left]);
            yScale.range([margin.top, height + margin.top]);
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