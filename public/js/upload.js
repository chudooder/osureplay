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

osuUpload.controller('UploadCtrl', ['$scope', '$http', 
    function($scope, $http) {
        $scope.test = 'Hello fam';
        $scope.fileName = 'Browse...';

        $scope.updateFileText = function() {
            var file = $scope.selectedFile;
            $scope.fileName = file.name;
            $scope.test = 'Nice job mate';
            $scope.$apply();
        }

        $scope.uploadFile = function() {
            // send a post request
            var fd = new FormData();
            var file = $scope.selectedFile;
            var captcha = $scope.captchaResponse;
            fd.append('userReplay', file);
            fd.append('g-recaptcha-response', captcha);
            $http.post("/api/upload", fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            })
            .success(function(response) {
                $scope.test = "got the file mate.";
                console.log(response);
            })
            .error(function(response) {
                $scope.test = "whoops";
            });
        };

    }]);