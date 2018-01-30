var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'2Taps Colibri Bridge',
  description: 'Consulta a api rest local do colibri para o 2Taps app',
  script: __dirname+'/main.js',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
    svc.start();
});

svc.install();

