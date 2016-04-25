var osuApp = angular.module('osuReplay', [
    'ngRoute',
    'osuUpload'
    ]);

osuApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/upload', {
            templateUrl: 'views/upload.html',
            controller: 'UploadCtrl'
        }).
        otherwise({
            redirectTo: '/upload'
        });
}]);