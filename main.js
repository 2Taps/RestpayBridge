const http = require("https");
const fs = require('fs');
const awsIot = require('aws-iot-device-sdk');
const dir = __dirname;
const credPath = dir+'/credentials';
var deviceId = devicePkFile = deviceCertFile = '';
fs.readdirSync(credPath).forEach(file => {
    var fileExt = file.split('.').pop();
    if(file == 'device-id.txt') {
       try { deviceId = fs.readFileSync(credPath+'/'+file).toString(); } catch(e) {}
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

var device = awsIot.device({
   keyPath: credPath+'/'+devicePkFile,
  certPath: credPath+'/'+deviceCertFile,
    caPath: credPath+'/root-CA.pem',
  clientId: deviceId,
      host: 'a3pfvuzbin0ywl.iot.us-east-1.amazonaws.com',
      debug: false
});

var bodyChunks = [];
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
        console.log(payload.id_user)
        http.get(payload.uri, function(res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            bodyChunks = [];
            res.on('data', function(chunk) {
                bodyChunks.push(chunk);
            }).on('end', function() {
                body = Buffer.concat(bodyChunks);
                console.log('BODY: ' + body);
                publishJson = JSON.stringify({ 
                    id_user: String(payload.id_user),
                    timestamp: String(payload.timestamp),
                    response: '{"data":{"errors":[{"id":"no_user","message":"Sua sess\u00e3o expirou, para sua seguran\u00e7a por favor fa\u00e7a login novamente."}]}}'//body.toString()
                });
                publishTopic = (payload.publish_mode == 1)?globalPublishTopic:devicePublishTopic;
                device.publish(publishTopic, publishJson);
            })
        }).on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    }
}).on('error', function(error) {
    throw new Error(error);
});