var http = require("https");
var awsIot = require('aws-iot-device-sdk');
var dir = __dirname;

var clientId = 'restpay-prod-colibri-pc-43';
var publishTopic = 'restpay-prod-colibri-pc-publish';

var device = awsIot.device({
   keyPath: dir+'/certs/d1373834d3-private.pem.key',
  certPath: dir+'/certs/d1373834d3-certificate.pem.crt',
    caPath: dir+'/certs/root-CA.pem',
  clientId: clientId,
      host: 'a3pfvuzbin0ywl.iot.us-east-1.amazonaws.com',
      debug: true
});

device.on('connect', function() {
    console.log('connected');
    device.subscribe(clientId);
}).on('message', function(topic, payload) {
    console.log(topic);
    if(topic == clientId) {
        console.log(payload.toString());
        payload = JSON.parse(payload.toString());
        console.log(payload);
        console.log(payload.id_user)
        http.get(payload.uri, function(res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            var bodyChunks = [];
            res.on('data', function(chunk) {
                bodyChunks.push(chunk);
            }).on('end', function() {
                var body = Buffer.concat(bodyChunks);
                console.log('BODY: ' + body);
                device.publish(publishTopic, JSON.stringify({ 
                    id_user: String(payload.id_user),
                    timestamp: String(payload.timestamp),
                    response: '{"data":{"errors":[{"id":"no_user","message":"Sua sess\u00e3o expirou, para sua seguran\u00e7a por favor fa\u00e7a login novamente."}]}}'//body.toString()
                }));
            })
        }).on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    }
}).on('error', function(error) {
    throw new Error(error);
});