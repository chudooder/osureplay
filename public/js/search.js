var osuSearch = angular.module('osuSearch', []);

osuSearch.service('searchService', function() {
    var params = [
        { name: 'Player', model: 'player', value: '' },
        { name: 'Beatmap Title', model: 'title', value: '' },
        { name: 'Beatmap ID', model: 'beatmap_id', value: '' },
        { name: 'Creator', model: 'creator', value: '' },
        { name: 'Artist', model: 'artist', value: '' },
        { name: 'Version (Difficulty)', mode: 'version', value: '' }
    ];

    var searchResults = [];

    var setSearchResults = function(replays) {
        searchResults = replays;
    }

    var getSearchResults = function() {
        return searchResults;
    }

    return {
        params: params,
        setSearchResults: setSearchResults,
        getSearchResults: getSearchResults
    }
});

osuSearch.controller('SearchCtrl', [
    '$scope', 
    '$http', 
    '$window',
    'replayService',
    'searchService',
    function($scope, $http, $window, replayService, searchService) {
        $scope.replays = searchService.getSearchResults();
        $scope.inputs = searchService.params;

        $scope.search = function() {
            if($scope.formsEmpty()) return;
            var params = {}
            for(input in $scope.inputs) {
                var param = $scope.inputs[input];
                params[param.model] = param.value;
            }

            $http.get("/api/search", {
                params: params
            })
            .success(function(res) {
                $scope.replays = res;
                searchService.setSearchResults($scope.replays);
            })
            .error(function(res){

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
            for(input in $scope.inputs) {
                var param = $scope.inputs[input];
                if(param.value != "") {
                    return false;
                }
            }
            return true;
        };

        $scope.selectReplay = function(replay) {
            replayService.setReplayData(replay);
            // redirect to replay page
            $window.location.href = '/#/replay/'+replay.replay_md5;
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