"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileUploadUrl = void 0;
const s3_utils_1 = require("../../lib/s3-utils");
async function getFileUploadUrl(root, args, ctx) {
    ctx.internalOnly();
    return s3_utils_1.getUploadURL(args.filepath, args.mime);
}
exports.getFileUploadUrl = getFileUploadUrl;
