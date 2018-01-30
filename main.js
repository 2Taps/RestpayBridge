const { exec } = require('child_process');
exec('node '+__dirname+'/autoupdate.js', (err, stdout, stderr) => {
    if (err) { return; } else {
        console.log(stdout.toString());
        if(stdout.toString().indexOf('RESTART THE APP!') != -1) {
            process.exit();
        } else {
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
                console.log('connected');
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
                    process.exit();
                }
            }).on('error', function(error) {
                throw new Error(error);
            });
        }
    }
});