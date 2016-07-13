var express = require("express"),
    app = express(),
    program = require('commander'),
    fs = require('fs'),
    request = require('request'),
    async = require('async'),
    sprintf = require('sprintf').sprintf;


var YAML = require('yamljs');
var fermata = require('fermata');
var camomileClient = require('./camomile');

// remember cookie
var request = request.defaults({
    jar: true
});

// read parameters from command line or from environment variables
// (CAMOMILE_API, CAMOMILE_LOGIN, CAMOMILE_PASSWORD, PYANNOTE_API)

// PBR patch : support parametrized shotIn and shotOut
program
    .option('--config <path>', 'path of the configuration file (e.g. ./config.yml)')
    .parse(process.argv);

var yamlObject = YAML.load(program.config);
var camomile_api = 'http://' + yamlObject.camomile.host;
var login = yamlObject.camomile.username;
var password = yamlObject.camomile.password;
var port = 8070;

// configure express app
app.configure(function () {
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/app'));
    app.use(app.router);
});

// handle the hidden form submit
app.post('/', function (req, res) {
    res.redirect('/');
});

// log in Camomile API and callback
function log_in(callback) {

    var options = {
        url: camomile_api + '/login',
        method: 'POST',
        body: {
            'username': login,
            'password': password
        },
        json: true
    };

    request(
        options,
        function (error, response, body) {
            // TODO: error handling
            callback(null);
        });
};

// log out from Camomile API and callback
function log_out(callback) {

    var options = {
        url: camomile_api + '/logout',
        method: 'POST'
    };

    request(
        options,
        function (error, response, body) {
            // TODO: error handling
            callback(null);
        });
};

function getQueueByName(name, callback) {

    var options = {
        url: camomile_api + '/queue',
        method: 'GET',
        qs: {
            name: name
        },
        json: true,
    };

    request(
        options,
        function (error, response, body) {
            if (body.length === 0) {
                queue = undefined;
            } else {
                queue = body[0]._id;
            };
            callback(error, queue);
        });
};

function getNames(callback) {

    var options = {
        url: camomile_api + '/corpus/576cf836f09c8001005c29db/metadata/annotation.evidence.',
        method: 'GET',
        json: true,
    };

    request(
        options,
        function (error, response, body) {
            callback(body);
        });
};

function getPngCode(name, callback) {

    var options = {
        url: camomile_api + '/corpus/576cf836f09c8001005c29db/metadata/annotation.evidence.' + name  + '.0.image',
        method: 'GET',
        json: true,
    };

    request(
        options,
        function (error, response, body) {
            callback(name, body);
        });
};

function getAllQueues(callback) {

    async.parallel({

            // MediaEval "label" use case
            labelIn: function (callback) {
                //getQueueByName('  mediaeval.label.in', callback);
                getQueueByName(yamlObject.annotation.label.queue.todo, callback);
            },
            labelOut: function (callback) {
                //getQueueByName('mediaeval.label.out', callback);
                getQueueByName(yamlObject.annotation.label.queue.done, callback);
            },
        },
        function (err, queues) {
            callback(err, queues);
        });
};

// create NodeJS route "GET /config" returning front-end configuration as JSON
// and callback (passing no results whatsoever)
function create_config_route(queues, callback) {

    // ~~~~ Sample /config response ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // {
    //     'camomile_api': 'http://camomile.fr/api',
    //     'pyannote_api': 'http://pyannote.lu',
    //     'queues': {
    //         'shotIn': '54476ba692e66a08009cc355',
    //         'shotOut': '54476ba692e66a08009cc356',
    //         'headIn': '54476ba692e66a08009cc357',
    //         'headOut': '54476ba692e66a08009cc358',
    // }
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    var get_config = function (req, res) {
        res.json({
            'camomile_api': camomile_api,
            //'pyannote_api': pyannote_api,
            'queues': {
                'labelIn': queues.labelIn,
                'labelOut': queues.labelOut,
            }
        });
    };

    app.get('/config', get_config);

    console.log('   * labelIn  --> /queue/' + queues.labelIn);
    console.log('   * labelOut --> /queue/' + queues.labelOut);

    callback(null);

}

function create_images_database(callback) {

    if(!fs.existsSync("app/static")) fs.mkdirSync("app/static");

    async.waterfall([
        log_in,
        getNames
        ],function(names_list, callback){
            var name, cpt = 0;
            async.each(names_list,function(name, callback){
                if(cpt<names_list.length){
                    async.waterfall([
                        async.apply(getPngCode, name)
                        ],function(name, png){
                            var b64 = png.data.replace(/^data:image\/png;base64,/,"");
                            fs.writeFile('app/static/'+name+'.png',b64,"base64");
                        });
                    cpt++;
                }
                else callback()
            }, function(err){
                if(err){
                    console.log("Problem fetching images")
                }
            });

            },function(err){
                callback(null);
            });
    callback(null);
};

// create AngularJS module 'Config' in /app/config.js ('DataRoot' + 'ToolRoot')
// and callback (passing no results whatsoever)
// WARNING: this should be deprecated in favor of route "GET /config"
function create_config_file(callback) {

    // ~~~~ Sample /app/config.js ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //     angular.module('myApp.config', [])
    //         .value('DataRoot', 'http://camomile.fr/api')
    //         .value('ToolRoot', 'http://pyannote.lu');
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


    async.waterfall([
        function(callback){
            config_js = sprintf(
                "angular.module('myApp.config', [])" + "\n" +
                "   .value('DataRoot', '%s')",
                camomile_api//, list
            );
            callback(null,config_js);
        },
        function(config_js, callback){
            fs.writeFile(
                __dirname + '/app/config.js', config_js,
                function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        callback(null);
                    }
                }
            );
        }
        ],function(err, results){
            //nothing to do
        }
    );
    callback(null);
};

// run app when everything is set up
function run_app(err, results) {
    app.listen(port);
    console.log('App is running at http://localhost:' + port + ' with');
    console.log('   * Camomile API --> ' + camomile_api);

    setInterval(function(){
        async.waterfall([
        log_in,
        getNames
        ],function(names_list, callback){
            var name, cpt = 0;
            async.each(names_list,function(name, callback){
                if(cpt<names_list.length){
                    async.waterfall([
                        async.apply(getPngCode, name)
                        ],function(name, png){
                            var b64 = png.data.replace(/^data:image\/png;base64,/,"");
                            fs.writeFile('app/static/'+name+'.png',b64,"base64");
                        });
                    cpt++;
                    if(cpt==10) console.log("Images database refreshed.");
                }
                else callback()
            }, function(err){
                if(err){
                    console.log("Problem fetching images")
                }
            });
        });
    },300000);

};

// this is where all these functions are actually called, in this order:
// log in, create queues, create route /config, log out, create /app/config.js
// and (then only) run the app
async.waterfall(
    [log_in, getAllQueues, create_config_route, create_images_database, create_config_file, log_out],
    run_app
);
