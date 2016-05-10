var osuApp = angular.module('osuApp', [
    'ngRoute',
    'osuMain',
    'osuUpload',
    'osuSearch',
    'osuReplay'
    ]);

osuApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'views/main.html',
            controller: 'MainCtrl'
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

osuApp.config(['$compileProvider', function ($compileProvider) {
  $compileProvider.debugInfoEnabled(false);
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