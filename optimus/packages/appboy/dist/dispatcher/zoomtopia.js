"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadZoomRecording = void 0;
const aws_sdk_1 = require("aws-sdk");
const config = require("config");
const gaxios_1 = require("gaxios");
const bucket = config.get('aws.s3.bucket');
const s3 = new aws_sdk_1.S3({ apiVersion: '2006-03-01' });
async function downloadZoomRecording(data, fLogger) {
    const fileName = data.timestamp + '-' + (data.recordingType || 'unknown');
    const fileKey = `zoom-recordings/${data.classId}/${fileName}.${data.fileType}`.toLowerCase();
    try {
        await s3
            .headObject({
            Bucket: bucket,
            Key: fileKey
        })
            .promise();
        fLogger.error('file %s already downloaded', fileKey);
        return;
    }
    catch {
        // file does not exits
    }
    try {
        const response = await gaxios_1.request({
            url: data.downloadUrl,
            responseType: 'stream'
        });
        fLogger.info('upload file %s', fileKey);
        await s3
            .upload({
            Body: response.data,
            Key: fileKey,
            Bucket: bucket
        })
            .promise();
    }
    catch (err) {
        fLogger.error(err, 'file upload failed');
    }
}
exports.downloadZoomRecording = downloadZoomRecording;
