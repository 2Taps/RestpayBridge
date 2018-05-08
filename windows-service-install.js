const fs = require('fs');
const path = require('path');
const appPath = __dirname;
var Service = require('node-windows').Service;

// Create a new service object
const projectPublicName = fs.readFileSync(path.join(appPath, 'project-public-name.txt')).toString().trim();
console.log(projectPublicName);
var svc = new Service({
    name: projectPublicName,
    description: 'Consulta a api local software do restaurante para o cloud do app mobile',
    script: path.join(appPath, 'main.js'),
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

