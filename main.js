const AutoUpdater = require('auto-updater');
const http = require("http");
const fs = require('fs');
const sys = require("sys");
const awsIot = require('aws-iot-device-sdk');
const appPath = __dirname;
const credPath = appPath+'/credentials';
const EventLogger = require('node-windows').EventLogger;
const projectPublicName = fs.readFileSync(appPath+'/project-public-name.txt').toString().trim();
const wlogger = new EventLogger(projectPublicName);

var autoupdater = new AutoUpdater({
    pathToJson: '',
    autoupdate: true,
    checkgit: false,
    jsonhost: 'raw.githubusercontent.com',
    contenthost: 'codeload.github.com',
    progressDebounce: 0,
    devmode: false
});

autoupdater
.on('git-clone', function() { console.log("You have a clone of the repository. Use 'git pull' to be up-to-date"); })
.on('check.up-to-date', function(v) { console.info("You have the latest version: " + v); })
.on('check.out-dated', function(v_old, v) { console.warn("Your version is outdated. " + v_old + " of " + v); })
.on('update.downloaded', function() { console.log("Update downloaded and ready for install"); })
.on('update.not-installed', function() { console.log("The Update was already in your folder! It's read for install"); })
.on('download.start', function(name) { console.log("Starting downloading: " + name); })
.on('download.progress', function(name, perc) { process.stdout.write("Downloading " + perc + "% \033[0G"); })
.on('download.end', function(name) { console.log("Downloaded " + name); })
.on('download.error', function(e) {
    try { wlogger.error(e); } catch(error) {} console.error(e); process.exit();
})
.on('error', function(name, e) {
    try { wlogger.log(e); } catch(error) {}  console.error(name, e); process.exit();
})
.on('update.extracted', function() {
    console.log("Update extracted successfully! Restarting..."); process.exit();
})
.on('end', function() {
    console.log("The app is ready to function");
    var config;
    var config = fs.readFileSync(appPath+"/config.json", "utf8");
    sys.puts(JSON.parse(config));
    fs.readdirSync(credPath).forEach(file => {
        var fileExt = file.split('.').pop();
        if(fileExt == 'key' && file.indexOf('private') != -1) {
            config.device_pk_file = file;
        } else if(fileExt == 'crt') {
            config.device_cert_file = file;
        }
    })
    if(!config.device_id) { throw new Error('- Device Id file not found.'); }
    if(!config.device_pk_file) { throw new Error('- Device Pk file not found.'); }
    if(!config.device_cert_file) { throw new Error('- Device Certificate file not found.'); }

    var globalPublishTopic = 'restpay-'+config.env+'-'+config.software_id+'-pc-publish';
    var devicePublishTopic = config.device_id+'-publish';
    var autoUpdateTopic = 'restpay-'+config.env+'-'+config.software_id+'-pc-update';

    var device = awsIot.device({
       keyPath: credPath+'/'+config.device_pk_file,
      certPath: credPath+'/'+config.device_cert_file,
        caPath: credPath+'/root-CA.pem',
      clientId: config.device_id,
          host: config.endpoint,
          debug: config.debug
    });

    var bodyChunks = [];
    var req = reqData = reqConfig = {};
    var body = publishTopic = publishJson = '';
    var bodyParams = {};

    device.on('connect', function() {
        console.log('Connected to AWS IOT');
        device.subscribe(config.device_id);
        device.subscribe(autoUpdateTopic);
    }).on('message', function(topic, payload) {
        console.log('Message arrived...');
        console.log(topic);
        if(topic == config.device_id) {
            payload = JSON.parse(payload.toString());
            console.log(payload);
            reqData = payload.api_req;
            //Executing local task via LOCAL REST API CALL
            if(config.software_id == reqData.software_id) {
                if(config.software_api_mode == "REST") {
                    reqConfig = {
                        method: reqData.method,
                        hostname: 'localhost',
                        port: reqData.port,
                        path: '/'+reqData.version+reqData.uri+'?'+reqData.header_params,
                        auth: reqData.username+':'+reqData.password
                    };
                    bodyParams = reqData.body_params;
                    if(bodyParams != '') {
                        reqConfig.headers = {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Content-Length': Buffer.byteLength(bodyParams)
                        };
                    }
                    req = http.request(reqConfig, function(res) {
                            bodyChunks = [];
                            res.on('data', function(chunk) {
                                bodyChunks.push(chunk);
                            }).on('end', function() {
                                body = Buffer.concat(bodyChunks);
                                publishJson = JSON.stringify({ 
                                    id_user: String(payload.id_user),
                                    timestamp: String(payload.timestamp),
                                    response: body.toString()
                                });
                                publishTopic = (payload.publish_mode == 1)?globalPublishTopic:devicePublishTopic;
                                console.log('Republishing to topic: '+publishTopic+'...');
                                device.publish(publishTopic, publishJson);
                            });
                        }
                    );
                    req.on('error', function(e) {
                        console.log(e);
                    });
                    if(bodyParams) {
                        req.write(bodyParams);
                    }
                    req.end();
                }
            }
        } else if(topic == autoUpdateTopic) {
            process.exit(); //force app to exit and be restarted by windows service or our custom monitor
        }
    }).on('error', function(error) {
        try { wlogger.log(error); } catch(error) {}
        throw new Error(error);
    });
});
// Start checking
autoupdater.fire('check');