const AutoUpdater = require('auto-updater');
const http = require("http");
const https = require("https");
const fs = require('fs');
const path = require('path');
const awsIot = require('aws-iot-device-sdk');
const appPath = __dirname;
const credPath = path.join(appPath, 'credentials');
const EventLogger = require('node-windows').EventLogger;
const projectPublicName = fs.readFileSync(path.join(appPath, 'project-public-name.txt')).toString().trim();
const wlogger = new EventLogger(projectPublicName);

function logError(errorTitle, error, throwError) {
    var errorString;
    if(typeof error !== 'undefined' && error !== false && typeof error === 'object') {
        errorString = '- '+errorTitle+' :: '+error.message+' :: '+error.stack;
    } else {
        errorString = '- '+errorTitle;
    }
    try { console.log(errorString); } catch(error) {}
    try { wlogger.log(errorString); } catch(error) {}
    if(throwError === true) {
        throw new Error(errorString);
    }
}

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
    logError('Error on download version', e); process.exit();
})
.on('error', function(name, e) {
    logError('Error on auto update', e); process.exit();
})
.on('update.extracted', function() {
    logError('Error on auto update'); process.exit();
})
.on('end', function() {
    try {
        console.log("The app is ready to function");
        var config;
        var config = JSON.parse(fs.readFileSync(path.join(appPath, "config.json"), "utf8"));
        fs.readdirSync(credPath).forEach(file => {
            var fileExt = file.split('.').pop();
            if(fileExt == 'key' && file.indexOf('private') != -1) {
                config.device_pk_file = file;
            } else if(fileExt == 'crt') {
                config.device_cert_file = file;
            }
        })
        if(!config.device_id) { logError('Device Id file not found.', false, true); }
        if(!config.device_pk_file) { logError('Device Pk file not found.', false, true); }
        if(!config.device_cert_file) { logError('Device Certificate file not found.', false, true); }

        var globalPublishTopic = 'restpay_'+config.env+'_pc_publish';
        var devicePublishTopic = config.device_id+'_publish';
        var autoUpdateTopic = 'restpay_'+config.env+'_pc_update';

        var device = awsIot.device({
           keyPath: path.join(credPath, config.device_pk_file),
          certPath: path.join(credPath, config.device_cert_file),
            caPath: path.join(credPath, 'root-CA.pem'),
          clientId: config.device_id,
              host: config.endpoint,
             debug: config.debug
        });

        var bodyChunks = [];
        var req = reqConfig = {};
        var httpModule;
        var body = publishTopic = publishJson = '';
        var bodyParams = {};

        device.on('connect', function() {
            console.log('Connected to AWS IOT');
            device.subscribe(config.device_id);
            device.subscribe(autoUpdateTopic);
        }).on('message', function(topic, payload) {
            try {
                console.log('Message arrived...');
                console.log(topic);
                if(topic == config.device_id) {
                    payload = JSON.parse(payload.toString());
                    console.log(payload);
                    //Executing local task via LOCAL REST API CALL
                    if(config.software_id == payload.software_id) {
                        if(config.software_api_mode == "REST") {
                            try {
                                bodyParams = payload.req_body_params;
                                if(bodyParams != '') {
                                    payload.req_config['headers']['Content-Length'] = Buffer.byteLength(bodyParams);
                                }
                                httpModule = (payload.req_protocol == 'http')?http:https;
                                req = httpModule.request(payload.req_config, function(res) {
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
                                });
                                req.on('error', function(error) {
                                    logError('Error on REST Request execution', error);
                                });
                                if(bodyParams) {
                                    req.write(bodyParams);
                                }
                                req.end();
                            } catch(error) {
                                logError('Error on REST Request exec', error);
                            }
                        }
                    }
                } else if(topic == autoUpdateTopic) {
                    process.exit(); //force app to exit and be restarted by windows service or our custom monitor
                }
            } catch(error) {
                logError('Error on IOT Message Process', error);
            }
        }).on('error', function(error) {
            logError('Error on IOT Message Receive', error);
        });
    } catch(error) {
        logError('Error on autoupdater end (main code)', error);
    }
});
// Start checking
try {
    autoupdater.fire('check');
} catch(error) {
    logError('Error on autoupdater fire', error);
}