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

                    //$scope.model.resetTransparentPlan();
                    $scope.model.updateIsDisplayedVideo(true);

                    $scope.model.q = item;
                    document.getElementById('label_name').innerHTML = $scope.model.q.person_name;
                    document.getElementById('shot').src = "/static/"+$scope.model.q.person_name+".png";
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

                            $scope.model.restrict_toggle = 2;
                            $scope.model.current_time_temp = $scope.model.q.start;
                            $scope.model.infbndsec = parseFloat($scope.model.q.start || 0);
                            if ($scope.model.infbndsec < 0) {
                                $scope.model.infbndsec = 0;
                            }
                            $scope.model.supbndsec = parseFloat($scope.model.q.end || 0);
                            if ($scope.model.supbndsec > $scope.model.fullDuration) {
                                $scope.model.supbndsec = $scope.model.fullDuration;
                            }
                            $scope.model.duration = $scope.model.supbndsec - $scope.model.infbndsec;

                            $scope.$apply(function () {
                                $scope.model.current_time = $scope.model.q.start;
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
                /*camomileService.me(function(callback){
                    item.log.user_id = _id;
                });*/

                item.input = {};
                item.input.shot_id = $scope.model.q.shot_id;
                item.input.medium_id = $scope.model.q.medium_id;
                item.input.person_name = $scope.model.initialData;
                item.input.start = $scope.model.q.start;
                item.input.start = $scope.model.q.start;

                item.output = {};
                item.output.status = status;

                document.getElementById('shot').src = "../img/default.jpg";

                camomileService.enqueue($scope.model.outgoingQueue, item, function (err, data) {

                    if (err) {
                        console.log("Something went wrong");
                    } else {
                        $scope.model.popQueueElement();
                    }

                });
            };

            $document.on(
                "keydown",
                function (event) {
                    var targetID = event.target.id;
                    var button_checked = false;
                    if (targetID == 'confirm' || targetID == 'cancel') {
                        button_checked = true;
                    }
                    //enter
                    if (event.keyCode == 13 && targetID != 'localServerInput') {
                        //If the focus is on the check buttons, blur the focus first
                        if (button_checked) {
                            event.target.blur();
                        }
                        $scope.$apply(function () {
                            $scope.model.saveQueueElement("yes");
                        });
                    }
                    //space
                    if (event.keyCode == 32) {
                        if (button_checked) {
                            event.target.blur();
                        }
                        $scope.$apply(function () {
                            $scope.model.toggle_play();
                        });
                    }
                    //esc-> skip
                    if (event.keyCode == 27) {
                        $scope.$apply(function () {
                            //skip
                            //$scope.model.saveQueueElement(false);
                        });
                    }
                    //Left
                    if (event.keyCode == 37) {
                        $scope.$apply(function () {
                            if ($scope.model.current_time - 0.04 > $scope.model.infbndsec) {
                                $scope.model.current_time = $scope.model.current_time - 0.04;
                            } else {
                                $scope.model.current_time = $scope.model.infbndsec;
                            }
                        });
                    }
                    //Right
                    if (event.keyCode == 39) {
                        $scope.$apply(function () {
                            if ($scope.model.current_time + 0.04 < $scope.model.supbndsec) {
                                $scope.model.current_time = $scope.model.current_time + 0.04;
                            } else {
                                $scope.model.current_time = $scope.model.supbndsec;
                            }
                        });
                    }
                    //Up
                    if (event.keyCode == 38) {
                        $scope.$apply(function () {
                            if ($scope.model.current_time - 1 > $scope.model.infbndsec) {
                                $scope.model.current_time = $scope.model.current_time - 1;
                            } else {
                                $scope.model.current_time = $scope.model.infbndsec;
                            }
                        });

                    } //Down
                    if (event.keyCode == 40) {
                        $scope.$apply(function () {

                            if ($scope.model.current_time + 1 < $scope.model.supbndsec) {
                                $scope.model.current_time = $scope.model.current_time + 1;
                            } else {
                                $scope.model.current_time = $scope.model.supbndsec;
                            }
                        });
                    }
                }
            );

        }
    ]);
