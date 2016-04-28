var osuSearch = angular.module('osuSearch', []);

osuSearch.controller('SearchCtrl', ['$scope', '$http',
    function($scope, $http) {
        $scope.test = 'hello bam';
        $scope.replays = []

        $scope.search = function() {
            if($scope.formsEmpty()) return;
            params = {}
            if($scope.player)
                params['player'] = $scope.player;
            if($scope.bmID)
                params['beatmap_id'] = $scope.bmID;
            if($scope.creator)
                params['creator'] = $scope.creator;
            if($scope.artist)
                params['artist'] = $scope.artist;
            if($scope.bmName)
                params['title'] = $scope.title;
            if($scope.version)
                params['version'] = $scope.version;

            $http.get("/api/search", {
                params: params
            })
            .success(function(response) {
                $scope.replays = response;
            })
            .error(function(response){

            });
        };

        $scope.convertTime = function(unixTS) {
            var a = new Date(unixTS * 1000);
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            var year = a.getFullYear();
            var month = months[a.getMonth()];
            var date = a.getDate();
            var time = date + ' ' + month + ' ' + year
            return time;
        };

        $scope.accuracy = function(replay) {
            var total = replay.num_300 + replay.num_100 
                + replay.num_50 + replay.num_miss;
            var weighted = replay.num_300 
                + (1.0/3.0) * replay.num_100
                + (1.0/6.0) * replay.num_50;
            var accuracy = weighted / total;
            return 100 * accuracy;
        };


        $scope.formsEmpty = function() {
            return !($scope.player || $scope.bmID ||
                $scope.creator || $scope.artist ||
                $scope.title || $scope.version);
        };
    }]);

osuSearch.directive('onEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event){
            if(event.which === 13) {
                
                scope.$apply(function (){
                    scope.$eval(attrs.onEnter);
                });
                event.preventDefault();
            }
        })
    }
});