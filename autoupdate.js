const simpleGit = require('simple-git')();
simpleGit
    .addRemote('origin', 'https://github.com/GuilhermeMoura1/RestpayColibriBridge.git')
    .pull('origin', 'master', {'--rebase': 'true'});
/*
simpleGit
    .addRemote('origin', 'https://github.com/GuilhermeMoura1/RestpayColibriBridge.git')
    .exec(() => console.log('Starting pull...'))
    .pull((err, update) => {
        if(update && update.summary.changes) {
           require('child_process').exec('npm restart');
        }
    })
    .exec(() => console.log('pull done.'));
    */