@echo off
SET rootPath="C:\2Taps"
SET appPath="%rootPath%\RestpayColibriBridge"

cd /d "%appPath%"
npm install ^
    aws-iot-device-sdk@2.2.0 ^ 
    simple-git@1.89.0 ^
&& ^
npm install -g node-windows@0.1.14 && ^
npm link node-windows