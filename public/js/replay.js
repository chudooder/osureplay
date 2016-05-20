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
    if(replay.mods.easy)
        modOD = 0.5 * od;
    else if(replay.mods.hard_rock)
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

var getCircleRadius = function(replay, ignoreMods) {
    var modCS = replay.beatmap.cs;
    if(!ignoreMods) {
        if(replay.mods.hard_rock) {
            modCS *= 1.3;
        } else if (replay.mods.easy) {
            modCS /= 2;
        }
    }
    return (104.0 - modCS * 8.0) / 2.0;
}

var initScope = function(scope, replay) {
    scope.replay = replay;
    scope.timeline = {
        objects: replay.timeline,
        length: replay.beatmap.length
    }
    var timingWindow = getTimingWindow(replay);
    scope.timingWindow = timingWindow;
    scope.timings = {
        timingWindow: timingWindow,
        buckets: replay.timings
    }
    scope.streams = {
        timingWindow: timingWindow,
        timings: replay.stream_timings
    }
    scope.hitmap = {
        circleRadius: getCircleRadius(replay, false),
        normalRadius: getCircleRadius(replay, true),
        hitmapSize: replay.hitmap_size,
        hitmap: replay.hitmap,
        events: replay.timeline
    }

    scope.convertTime = function(unixTS) {
        var a = new Date(unixTS * 1000);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var time = date + ' ' + month + ' ' + year
        return time;
    };

    scope.accuracy = function(replay) {
        var total = replay.num_300 + replay.num_100 
            + replay.num_50 + replay.num_miss;
        var weighted = replay.num_300 
            + (1.0/3.0) * replay.num_100
            + (1.0/6.0) * replay.num_50;
        var accuracy = weighted / total;
        return 100 * accuracy;
    };

    scope.modString = function(replay) {
        var abbrev = {
            'sudden_death': 'SD',
            'perfect': 'PF',
            'hard_rock': 'HR',
            'nightcore': 'NC',
            'double_time': 'DT',
            'hidden': 'HD',
            'flashlight': 'FL',
            'no_fail': 'NF',
            'easy': 'EZ',
            'half_time': 'HT',
            'spun_out': 'SO',
            'relax': 'RL',
            'auto_pilot': 'AP'
        }

        var str = ''

        for(var k in abbrev) {
            var enabled = replay.mods[k];
            if(enabled) {
                if(str == '') str = '+';
                str += abbrev[k];
            }
        }
        return str;
    }
};