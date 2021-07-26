import { WebEvents } from '@cl/types';
import { S3 } from 'aws-sdk';
import * as config from 'config';
import { request } from 'gaxios';
import { Logger } from 'pino';
import * as stream from 'stream';

const bucket = config.get('aws.s3.bucket') as string;
const s3 = new S3({ apiVersion: '2006-03-01' });

export async function downloadZoomRecording(
  data: WebEvents.DownloadRecordingEvent['payload'],
  fLogger: Logger
) {
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
  } catch {
    // file does not exits
  }

  try {
    const response = await request<stream.Readable>({
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
  } catch (err) {
    fLogger.error(err, 'file upload failed');
  }
}
