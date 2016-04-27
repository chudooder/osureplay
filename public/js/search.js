var osuSearch = angular.module('osuSearch', []);

osuSearch.controller('SearchCtrl', ['$scope', '$http',
    function($scope, $http) {
        $scope.test = 'hello bam';
    }]);