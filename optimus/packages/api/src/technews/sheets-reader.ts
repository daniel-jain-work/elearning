import * as config from 'config';
import { google } from 'googleapis';
import * as crypto from 'crypto';

const {
  cert: { client_email, private_key },
  spreadsheetId
} = config.get('technews') as {
  spreadsheetId: string;
  cert: {
    client_email: string;
    private_key: string;
  };
};

const sheetsAPI = google.sheets({
  version: 'v4',
  auth: new google.auth.JWT(client_email, undefined, private_key, [
    'https://www.googleapis.com/auth/spreadsheets'
  ])
});

export interface RowData {
  url: string;
  comments: string;
  grades: string[];
  areas: string[];
}

export async function getSheetRows(limit: number): Promise<Map<string, RowData>> {
  const sheetMetadata = await sheetsAPI.spreadsheets.get({
    spreadsheetId
  });

  const { title, gridProperties } = sheetMetadata?.data?.sheets[0].properties;
  const topLeft = `C${gridProperties.rowCount - limit}`;
  const bottomRight = `G${gridProperties.rowCount}`;

  const sheetContent = await sheetsAPI.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!${topLeft}:${bottomRight}`
  });

  const result = new Map<string, RowData>();

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

function normalizeArray(texts = ''): string[] {
  const items = [];
  texts.split(',').map(text => {
    const item = text.replace(/\s*-\s*/, ' - ').trim();
    if (item) {
      items.push(item.toLowerCase());
    }
  });

  return items;
}
