const AutoUpdater = require('auto-updater');
const http = require("http");
const fs = require('fs');
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
   
    var deviceId = devicePkFile = deviceCertFile = '';
    fs.readdirSync(credPath).forEach(file => {
        var fileExt = file.split('.').pop();
        if(file == 'device-id.txt') {
           try { deviceId = fs.readFileSync(credPath+'/'+file).toString().trim(); } catch(e) {}
        } else if(fileExt == 'key' && file.indexOf('private') != -1) {
            devicePkFile = file;
        } else if(fileExt == 'crt') {
            deviceCertFile = file;
        }
    })
    if(!deviceId) { throw new Error('- Device Id file not found.'); }
    if(!devicePkFile) { throw new Error('- Device Pk file not found.'); }
    if(!deviceCertFile) { throw new Error('- Device Certificate file not found.'); }

    var globalPublishTopic = 'restpay-prod-colibri-pc-publish';
    var devicePublishTopic = deviceId+'-publish';
    var autoUpdateTopic = 'restpay-prod-colibri-pc-update';

    var device = awsIot.device({
       keyPath: credPath+'/'+devicePkFile,
      certPath: credPath+'/'+deviceCertFile,
        caPath: credPath+'/root-CA.pem',
      clientId: deviceId,
          host: 'a3pfvuzbin0ywl.iot.us-east-1.amazonaws.com',
          debug: false
    });

    var bodyChunks = [];
    var req = reqData = {};
    var body = publishTopic = publishJson = '';

    device.on('connect', function() {
        console.log('Connected to AWS IOT');
        device.subscribe(deviceId);
        device.subscribe(autoUpdateTopic);
    }).on('message', function(topic, payload) {
        console.log('Message arrived...');
        console.log(topic);
        if(topic == deviceId) {
            payload = JSON.parse(payload.toString());
            console.log(payload);
            reqData = payload.colibri_api_req;
            req = http.request(
                {
                    method: reqData.method,
                    hostname: 'localhost',
                    port: reqData.port,
                    path: '/'+reqData.version+reqData.uri+'?'+reqData.params,
                    auth: reqData.username+':'+reqData.password
                }, function(res) {
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
            req.end();
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