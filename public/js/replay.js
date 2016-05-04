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
    scope.streams = {
        timingWindow: timingWindow,
        timings: replay.stream_timings
    }
};