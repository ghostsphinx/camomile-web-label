'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp.controllers', ['myApp.services']);
angular.module('myApp.directives', ['myApp.filters', 'myApp.services']);
angular.module('myApp.services', ['ngResource']);

angular.module(
        'myApp', ['myApp.filters',
            'myApp.services',
            'myApp.directives',
            'myApp.controllers',
            'ngRoute',
            'ngSanitize',
            'mgcrea.ngStrap'
        ])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/', {
            templateUrl: 'partials/label.html'
        });
        $routeProvider.otherwise({
            redirectTo: '/'
        });
    }])

// Store config for data and tool access in the rootScope after promise resolution
.run(['$resource', '$location', '$rootScope', function ($resource, $location, $rootScope) {
    // remove /# and everything following to ensure we get host root url (and everything between / and #)
    $rootScope.absUrl = $location.absUrl().replace(/(\/.*#.*)/, '');
    // remove trailing slash
    $rootScope.absUrl = $rootScope.absUrl.replace(/(\/)$/, '');

    var index = $rootScope.absUrl.indexOf('lig');
    if (index == -1) {
        index = $rootScope.absUrl.indexOf('limsi');
    }
    if (index != -1) {
        $rootScope.absUrl = $rootScope.absUrl.substr(0, index - 1);
    }

}]);

function streamTest(){
        var path = document.getElementById("localServerInput").value;
        var html = '<video id="playertest1" src="'+path+'/3-24/0121200000DVBT6x1.mp4" height="80px" style="margin-top:-40px; margin-left:15px;" crossorigin="anonymous"></video>';
        document.getElementById('videoTest1').innerHTML = html;
        document.getElementById('playertest1').currentTime = 12*60+56;
        document.getElementById('playertest1').pause();
        html = '<video id="playertest2" src="'+path+'/DW/DW-news-DE/004435bc-97bf-8935-0d63-fb47561fdfa4.mp4" height="80px" style="margin-top:-40px; margin-left:15px;" crossorigin="anonymous"></video>';
        document.getElementById('videoTest2').innerHTML = html;
        document.getElementById('playertest2').currentTime = 28;
        document.getElementById('playertest2').pause();
        html = '<video id="playertest3" src="'+path+'/INA/snowden/F2_TS/20130610/130610FR20600_B.MPG.mp4" height="80px" style="margin-top:-40px; margin-left:15px;" crossorigin="anonymous"></video>';
        document.getElementById('videoTest3').innerHTML = html;
        document.getElementById('playertest3').currentTime = 6*60+49;
        document.getElementById('playertest3').pause();
    }
function eraseTest(){
        document.getElementById('videoTest1').innerHTML = "";
        document.getElementById('videoTest2').innerHTML = "";
        document.getElementById('videoTest3').innerHTML = "";
}