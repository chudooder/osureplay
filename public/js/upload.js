var osuUpload = angular.module('osuUpload', []);

console.log('something is happening');

osuUpload.controller('UploadCtrl', ['$scope', '$http', 
    function($scope, $http) {
        $scope.test = 'Hello fam';
    }]);