/**
 * Created by isc on 12/05/15.
 */
angular.module('myApp.controllers')
    .controller('labelCtrl', ['$document', '$sce', '$scope', '$http',
        'defaults', '$controller', 'Session', '$rootScope', 'camomileService',

        function ($document, $sce, $scope, $http, defaults, $controller, Session, $rootScope, camomileService) {

            $controller('CommonCtrl', {
                $scope: $scope,
                $http: $http,
                defaults: defaults,
                Session: Session
            });

            $scope.model.incomingQueue = $rootScope.queues.labelIn;
            $scope.model.outgoingQueue = $rootScope.queues.labelOut;

            $scope.model.q = {};

            $scope.model.updateIsDisplayedVideo = function (activate) {
                $scope.model.isDisplayedVideo = activate;
            };

            // initialize page state
            $scope.model.updateIsDisplayedVideo(false);

            var _getVideo = function (id_medium, callback) {

                camomileService.getMedium(id_medium, function (err, medium) {
                    callback(err, $sce.trustAsResourceUrl($scope.model.videoPath + '/' + medium.url + '.mp4'));
                });
            };

            // Initializes the data from the queue
            // rename from "initQueueData" to "popQueueElement"
            $scope.model.popQueueElement = function () {

                document.getElementById('videoTest1').innerHTML = "";
                document.getElementById('videoTest2').innerHTML = "";
                document.getElementById('videoTest3').innerHTML = "";

                // Get queue first element and pop it from the queue
                camomileService.dequeue($scope.model.incomingQueue, function (err, item) {

                    if (err) {
                        alert(item.error);
                        $scope.$apply(function () {
                            $scope.model.video = undefined;
                            $scope.model.isDisplayedVideo = false;
                            $scope.model.updateIsDisplayedVideo(false);
                        });

                        return;
                    }

                    $scope.model.updateIsDisplayedVideo(true);

                    $scope.model.q = item;
                    $('#shotImage').tooltip({title:$scope.model.q.person_name, placement:"left"});
                    document.getElementById('shot').src = "/static/" + $scope.model.q.person_name + ".png";
                    $scope.model.initialData = $scope.model.q.person_name;

                    // Update the add entry button's status
                    $scope.model.updateIsDisplayedVideo($scope.model.q.person_name != "");

                    async.parallel({
                            video: function (callback) {
                                _getVideo($scope.model.q.medium_id, callback);
                            },
                            serverDate: function (callback) {
                                camomileService.getDate(function (err, data) {
                                    callback(null, data.date);
                                });
                            }
                        },
                        function (err, results) {
                            $scope.model.video = results.video;
                            $scope.model.serverDate = results.serverDate;
                            $scope.model.clientDate = Date.now();

                            var offset = 0.2;
                            $scope.model.infbndsec = parseFloat($scope.model.q.start + offset || 0);
                            $scope.model.supbndsec = parseFloat($scope.model.q.end - offset || 0);

                            $scope.$apply(function () {
                                $scope.model.current_time = $scope.model.infbndsec;
                            });

                        });
                });
            };

            // Event launched when click on the save button.
            $scope.model.saveQueueElement = function (status) {

                var item = {};

                item.log = {};
                item.log.user = Session.username;
                item.log.date = $scope.model.serverDate;
                item.log.duration = Date.now() - $scope.model.clientDate;

                item.input = {};
                item.input.shot_id = $scope.model.q.shot_id;
                item.input.medium_id = $scope.model.q.medium_id;
                item.input.person_name = $scope.model.initialData;
                item.input.start = $scope.model.q.start;
                item.input.end = $scope.model.q.end;

                item.output = {};
                item.output.status = status;

                document.getElementById('shot').src = "../img/default.jpg";
                document.getElementById('confirm').blur();
                document.getElementById('btn').blur();
                document.getElementById('btnno').blur();
                document.getElementById('btndk').blur();
                $('#shotImage').tooltip('destroy');

                camomileService.enqueue($scope.model.outgoingQueue, item, function (err, data) {

                    if (err) {
                        console.log("Something went wrong");
                    } else {
                        $scope.model.popQueueElement();
                    }

                });
            };
        }
    ]);
