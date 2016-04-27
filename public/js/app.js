var osuApp = angular.module('osuReplay', [
    'ngRoute',
    'osuUpload',
    'osuSearch'
    ]);

osuApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/upload', {
            templateUrl: 'views/upload.html',
            controller: 'UploadCtrl'
        })
        .when('/search', {
            templateUrl: 'views/search.html',
            controller: 'SearchCtrl'
        })
        .otherwise({
            redirectTo: '/upload'
        });
}]);