var awsIot = require('aws-iot-device-sdk');

//
// Replace the values of '<YourUniqueClientIdentifier>' and '<YourCustomEndpoint>'
// with a unique client identifier and custom host endpoint provided in AWS IoT.
// NOTE: client identifiers must be unique within your AWS account; if a client attempts 
// to connect with a client identifier which is already in use, the existing 
// connection will be terminated.
//

console.log("INIT");
var clientId = 'restpay-prod-colibri-pc-43';
var device = awsIot.device({
   keyPath: __dirname+'/certs/d1373834d3-private.pem.key',
  certPath: __dirname+'/certs/d1373834d3-certificate.pem.crt',
    caPath: __dirname+'/certs/root-CA.crt',
  clientId: clientId,
      host: 'a3pfvuzbin0ywl.iot.us-east-1.amazonaws.com',
      debug: true
});

//
// Device is an instance returned by mqtt.Client(), see mqtt.js for full
// documentation.
//
device
  .on('connect', function() {
    console.log('connect');
    device.subscribe(clientId);
    //device.publish('topic_2', JSON.stringify({ test_data: 1}));
  });

device
  .on('message', function(topic, payload) {
     console.log('message', topic, payload.toString());
  });
  
 //handle some exceptions
  device 
    .on('error', function(error) {
      //certificate issue
      if (error.code === 'EPROTO') {
        throw new Error(error);
      }
    });
