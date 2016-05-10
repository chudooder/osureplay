var osuApp = angular.module('osuApp', [
    'ngRoute',
    'osuUpload',
    'osuSearch',
    'osuReplay'
    ]);

osuApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'views/main.html'
        })
        .when('/upload', {
            templateUrl: 'views/upload.html',
            controller: 'UploadCtrl'
        })
        .when('/search', {
            templateUrl: 'views/search.html',
            controller: 'SearchCtrl'
        })
        .when('/about', {
            templateUrl: 'views/about.html'
        })
        .when('/replay/:hash', {
            templateUrl: 'views/replay.html',
            controller: 'ReplayCtrl'
        })
        .otherwise({
            redirectTo: '/upload'
        });
}]);

osuApp.service('replayService', function() {
    var replayData;

    var setReplayData = function(data) {
        replayData = data;
        // console.log(replayData);
    };

    var getReplayData = function() {
        return replayData;
    };

    return {
        setReplayData: setReplayData,
        getReplayData: getReplayData
    };
});