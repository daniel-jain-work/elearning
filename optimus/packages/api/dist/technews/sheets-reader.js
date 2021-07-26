"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetRows = void 0;
const config = require("config");
const googleapis_1 = require("googleapis");
const crypto = require("crypto");
const { cert: { client_email, private_key }, spreadsheetId } = config.get('technews');
const sheetsAPI = googleapis_1.google.sheets({
    version: 'v4',
    auth: new googleapis_1.google.auth.JWT(client_email, undefined, private_key, [
        'https://www.googleapis.com/auth/spreadsheets'
    ])
});
async function getSheetRows(limit) {
    var _a;
    const sheetMetadata = await sheetsAPI.spreadsheets.get({
        spreadsheetId
    });
    const { title, gridProperties } = (_a = sheetMetadata === null || sheetMetadata === void 0 ? void 0 : sheetMetadata.data) === null || _a === void 0 ? void 0 : _a.sheets[0].properties;
    const topLeft = `C${gridProperties.rowCount - limit}`;
    const bottomRight = `G${gridProperties.rowCount}`;
    const sheetContent = await sheetsAPI.spreadsheets.values.get({
        spreadsheetId,
        range: `${title}!${topLeft}:${bottomRight}`
    });
    const result = new Map();
    for (const row of sheetContent.data.values) {
        // url | rating | comments | grades | areas
        if (/^(http|https):/.test(row[0])) {
            const url = row[0].trim();
            const id = crypto.createHash('md5').update(url).digest('hex');
            result.set(id, {
                url,
                comments: row[2],
                grades: normalizeArray(row[3]),
                areas: normalizeArray(row[4])
            });
        }
    }
    return result;
}
exports.getSheetRows = getSheetRows;
function normalizeArray(texts = '') {
    const items = [];
    texts.split(',').map(text => {
        const item = text.replace(/\s*-\s*/, ' - ').trim();
        if (item) {
            items.push(item.toLowerCase());
        }
    });
    return items;
}
