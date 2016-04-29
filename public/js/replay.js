var osuReplay = angular.module('osuReplay', []);

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
            $scope.replay = replayData;
        } else {
            var hash = $routeParams.hash;
            $http.get("/api/replay/"+hash)
            .success(function(res) {
                if(res != null) {
                    $scope.replay = res;
                } else {
                    $scope.error = "Could not find replay of the given hash."
                }
            })
            .error(function(res) {

            });
        }

    }]);