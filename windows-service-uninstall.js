const fs = require('fs');
const appPath = __dirname;
var Service = require('node-windows').Service;

// Create a new service object
const projectPublicName = fs.readFileSync(appPath+'/project-public-name.txt').toString().trim();
console.log(projectPublicName);
var svc = new Service({
    name: projectPublicName,
    script: appPath+'/main.js',
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall',function(){
  console.log('Uninstall complete.');
  console.log('The service exists: ',svc.exists);
});

// Uninstall the service.
svc.uninstall();