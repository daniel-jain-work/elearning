import { Graphql } from '@cl/types';
import { GraphqlContext } from '../../graphql-handler';
import { getUploadURL } from '../../lib/s3-utils';
import { createQRCode } from '../../lib/weixin';

export async function getFileUploadUrl(_, args: Graphql.GetFileUploadUrlArgs) {
  return getUploadURL(args.filepath, args.mime);
}

export async function generateQRCode(
  _,
  args: Graphql.GenerateQRCodeArgs,
  ctx: GraphqlContext
) {
  return createQRCode(args, ctx.logger.child({ mutation: 'generateQRCode' }));
}
