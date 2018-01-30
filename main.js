const http = require("http");
const fs = require('fs');
const awsIot = require('aws-iot-device-sdk');
const appPath = __dirname;
const credPath = appPath+'/credentials';
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

function execAutoUpdate() {
    require('child_process').execSync(
        "node "+appPath+"/autoupdate.js", 
        function puts(error, stdout, stderr) { 
            console.warn(error);
            console.warn(stdout);
            console.warn(stderr);
            console.warn(stdout.indexOf('RESTART THE APP!'));
            if(stdout.indexOf('RESTART THE APP!') != -1) {
                console.warn('Exiting');
                process.exit();
            }
        }
    );
}
execAutoUpdate();

var device = awsIot.device({
   keyPath: credPath+'/'+devicePkFile,
  certPath: credPath+'/'+deviceCertFile,
    caPath: credPath+'/root-CA.pem',
  clientId: deviceId,
      host: 'a3pfvuzbin0ywl.iot.us-east-1.amazonaws.com',
      debug: false
});
//console.log(deviceId); process.exit();
var bodyChunks = [];
var req = reqData = {};
var body = publishTopic = publishJson = '';
device.on('connect', function() {
    console.log('connected');
    device.subscribe(deviceId);
}).on('message', function(topic, payload) {
    console.log(topic);
    if(topic == deviceId) {
        console.log(payload.toString());
        payload = JSON.parse(payload.toString());
        console.log(payload);
        console.log(payload.id_user);
        reqData = payload.colibri_api_req;
        req = http.request(
            {
                method: reqData.method,
                hostname: 'localhost',
                port: reqData.port,
                path: '/'+reqData.version+reqData.uri+'?api_key='+reqData.apikey,
                auth: reqData.username+':'+reqData.password
            }, function(res) {
                console.log(res);
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                bodyChunks = [];
                res.on('data', function(chunk) {
                    bodyChunks.push(chunk);
                }).on('end', function() {
                    body = Buffer.concat(bodyChunks);
                    body = body.toString();
                    console.log('BODY: ' + body);
                    publishJson = JSON.stringify({ 
                        id_user: String(payload.id_user),
                        timestamp: String(payload.timestamp),
                        response: body
                    });
                    publishTopic = (payload.publish_mode == 1)?globalPublishTopic:devicePublishTopic;
                    device.publish(publishTopic, publishJson);
                });
            }
        );
        req.on('error', function(e) {
            console.log(e);
        });
        req.end();
    } else if(topic == autoUpdateTopic) {
        execAutoUpdate();
    }
}).on('error', function(error) {
    throw new Error(error);
});