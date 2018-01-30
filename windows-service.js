const fs = require('fs');
const appPath = __dirname;
var Service = require('node-windows').Service;

// Create a new service object
const projectPublicName = fs.readFileSync(appPath+'/project-public-name.txt').toString().trim();
console.log(projectPublicName);
var svc = new Service({
    name: projectPublicName,
    description: 'Consulta a api rest local do colibri para o cloud do app mobile',
    script: appPath+'/main.js',
    wait: 5,
    grow: 0,
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

