@echo off
SET rootPath="C:\2Taps"
SET appPath="%rootPath%\RestpayBridge"

cd /d "%appPath%"
npm install aws-iot-device-sdk@2.2.0 && ^
npm install auto-updater@1.0.0 && ^
npm install -g node-windows@0.1.14 && ^
npm link node-windows && ^
node windows-service-install.js