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
    - In C:\2Taps\RestpayColibriBrige\credentials
        - Create a file called device-id.txt and paste restpay-prod-colibri-pc-{$id_seller}  <= VARIABLE
        - Paste private key and certificate obtained from aws iot
    - Open Windows Cmd as Administrator
    - run C:\2Taps\RestpayColibriBrige\scripts\install

Auto Updater

    CAREFULL: 
        The auto updater will stop the app and may lose incoming/processing messages
        Better to release the updates at morning start

    IMPORTANT: 
        When you are ready to deploy the update
        You must update package.json with new version otherwise the auto updater will do nothing

iamrole rule engine aws_iot_prod_colibri_pc_tasks_to_dynamodb

