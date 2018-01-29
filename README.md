# RestpayColibriBridge

Dependencies

    nodejs 8.9.4 windows
    npm install aws-iot-device-sdk@2.2.0

Instalation on AWS

    - Activate certificate

Instalation on restaurant Windows PC

    - Download and install nodejs 8.9.4 windows
    - Download https://github.com/GuilhermeMoura1/RestpayColibriBridge/archive/master.zip
    - Extract to C:\2Taps\RestpayColibriBrige
    - Paste private key and certificate obtained from aws iot in C:\2Taps\RestpayColibriBrige\credentials
    - Open NodeJs Command Prompt (C:\Windows\System32\cmd.exe /k "C:\Program Files\nodejs\nodevars.bat)
    - cd C:\2Taps\RestpayColibriBrige
    - npm install aws-iot-device-sdk@2.2.0
    - npm install auto-updater@1.0.0

Auto Updater

    Be careful, the auto updater will stop the app and may lose incoming/processing messages
    Better to release the updates at morning start

iamrole rule engine aws_iot_prod_colibri_pc_tasks_to_dynamodb

