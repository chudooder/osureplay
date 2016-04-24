var app = angular.module('osureplay', []);

app.controller('MainCtrl', [
    '$scope',
    function($scope){
        $scope.test = 'whats up guys';
    }]);