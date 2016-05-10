var osuMain = angular.module('osuMain', []);

osuMain.controller('MainCtrl', [
    '$scope',
    '$window',
    'replayService',
    function($scope, $window, replayService) {
        $scope.goToExample = function() {
            replayService.setReplayData(null);
            $window.location.href = '/#/replay/d1a3916d2a04e814a492f210236e1ad2';
        }
    }]);