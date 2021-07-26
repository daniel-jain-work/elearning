import * as dataUrls from 'data-urls';
import { extension } from 'mime-types';
import { nanoid } from 'nanoid';
import * as path from 'path';
import { URL } from 'url';
import { s3, s3Config } from './aws';

interface File {
  body: string;
  mimeType: {
    type: string;
    subtype: string;
  };
}

function getFileKey(filePath: string, fileName: string, extention: string) {
  return (
    path.join(s3Config.folder, filePath, fileName.replace(/\s+/g, '')) +
    '.' +
    extention
  );
}

async function uploadFile(folder: string, name: string, file: File) {
  const fileName = getFileKey(folder, name, file.mimeType.subtype);

  await s3
    .putObject({
      Key: fileName,
      Body: file.body,
      ContentEncoding: 'base64',
      ContentType: file.mimeType.toString(),
      Bucket: s3Config.bucket,
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000, immutable'
    })
    .promise();

  return {
    fileName,
    resultURL: new URL(fileName, s3Config.baseUrl).toString()
  };
}

export async function uploadClassroomFile(name: string, content: string) {
  const file = dataUrls(content) as File;
  if (!file.mimeType) {
    throw new TypeError('Unsupported FileType');
  }

  return uploadFile('classroom', name, file);
}

export async function uploadAvatar(name: string, content: string) {
  const file = dataUrls(content) as File;
  if (!file.mimeType || file.mimeType.type !== 'image') {
    throw new TypeError('Unsupported FileType');
  }

  return uploadFile('avatar', name, file);
}

export async function getUploadURL(filePath: string, mineType: string) {
  const extention = extension(mineType);
  if (!extention) {
    throw new TypeError('Unsupported file type');
  }

  const fileName = getFileKey(filePath, nanoid(8), extention);
  const uploadURL = s3.getSignedUrl('putObject', {
    ContentType: mineType,
    Key: fileName,
    Bucket: s3Config.bucket,
    Expires: 60,
    ACL: 'public-read',
    CacheControl: 'public, max-age=31536000, immutable'
  });

  return {
    fileName,
    uploadURL,
    resultURL: new URL(fileName, s3Config.baseUrl).toString()
  };
}
