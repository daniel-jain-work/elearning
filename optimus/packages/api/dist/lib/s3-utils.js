"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadURL = exports.uploadAvatar = exports.uploadClassroomFile = void 0;
const aws_sdk_1 = require("aws-sdk");
const config = require("config");
const dataUrls = require("data-urls");
const mime_types_1 = require("mime-types");
const nanoid_1 = require("nanoid");
const path = require("path");
const url_1 = require("url");
const bucket = config.get('s3.bucket');
const baseUrl = config.get('s3.baseUrl');
const baseFolder = config.get('s3.folder');
const s3 = new aws_sdk_1.S3({
    apiVersion: '2006-03-01',
    region: config.get('s3.region')
});
function getFileKey(filePath, fileName, extention) {
    return (path.join(baseFolder, filePath, fileName.replace(/\s+/g, '')) + '.' + extention);
}
async function uploadFile(folder, name, file) {
    const fileName = getFileKey(folder, name, file.mimeType.subtype);
    await s3
        .putObject({
        Key: fileName,
        Body: file.body,
        ContentEncoding: 'base64',
        ContentType: file.mimeType.toString(),
        Bucket: bucket,
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable'
    })
        .promise();
    return {
        fileName,
        resultURL: new url_1.URL(fileName, baseUrl).toString()
    };
}
async function uploadClassroomFile(name, content) {
    const file = dataUrls(content);
    if (!file.mimeType) {
        throw new TypeError('Unsupported FileType');
    }
    return uploadFile('classroom', name, file);
}
exports.uploadClassroomFile = uploadClassroomFile;
async function uploadAvatar(name, content) {
    const file = dataUrls(content);
    if (!file.mimeType || file.mimeType.type !== 'image') {
        throw new TypeError('Unsupported FileType');
    }
    return uploadFile('avatar', name, file);
}
exports.uploadAvatar = uploadAvatar;
async function getUploadURL(filePath, mineType) {
    const extention = mime_types_1.extension(mineType);
    if (!extention) {
        throw new TypeError('Unsupported file type');
    }
    const fileName = getFileKey(filePath, nanoid_1.nanoid(8), extention);
    const uploadURL = s3.getSignedUrl('putObject', {
        ContentType: mineType,
        Key: fileName,
        Bucket: bucket,
        Expires: 60,
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable'
    });
    return {
        fileName,
        uploadURL,
        resultURL: new url_1.URL(fileName, baseUrl).toString()
    };
}
exports.getUploadURL = getUploadURL;
