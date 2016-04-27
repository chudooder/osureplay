var osuSearch = angular.module('osuSearch', []);

osuSearch.controller('SearchCtrl', ['$scope', '$http',
    function($scope, $http) {
        $scope.test = 'hello bam';
        $scope.replays = []

        $scope.search = function() {
            params = {}
            console.log('lmao');
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
                console.log($scope.replays);
            })
            .error(function(response){

            });
        }
    }]);