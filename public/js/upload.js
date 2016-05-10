var osuUpload = angular.module('osuUpload', ['vcRecaptcha']);

osuUpload.directive('customOnChange', function() {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeFunc = scope.$eval(attrs.customOnChange);
            element.bind('change', onChangeFunc);
        }
    };
})

osuUpload.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
          
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);

osuUpload.controller('UploadCtrl', [
    '$scope', 
    '$http', 
    '$window',
    'replayService',
    function($scope, $http, $window, replayService) {
        $scope.error = 'Please select an .osr file. Currently, only osu!standard is supported.';
        $scope.processing = false;
        $scope.fileName = 'Browse...';

        $scope.updateFileText = function() {
            var file = $scope.selectedFile;
            $scope.fileName = file.name;
            $scope.$apply();
        }

        $scope.uploadFile = function() {
            if($scope.canUpload()) return;

            // send a post request with the uploaded data
            var fd = new FormData();
            var file = $scope.selectedFile;
            var captcha = $scope.captchaResponse;
            fd.append('userReplay', file);
            fd.append('g-recaptcha-response', captcha);
            $scope.processing = true;
            $http.post("/api/upload", fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            })
            .success(function(response) {
                if(response.error) {    // error in parsing
                    $scope.error = response.error;
                } else {                // parsing successful
                    replayService.setReplayData(response);
                    $window.location.href = '/#/replay/'
                        +response.replay_md5
                }
                $scope.processing = false;
            })
            .error(function(response) {
                $scope.error = "Something went horribly wrong."
                $scope.processing = false;
            });
        };

        $scope.canUpload = function() {
            if($scope.fileName != 'Browse...')
                return false;
            return true;
        }

    }]);