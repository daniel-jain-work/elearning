"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTechnews = void 0;
const lodash_1 = require("lodash");
const mailer_1 = require("../lib/mailer");
const sync_news_1 = require("./sync-news");
const reportTpl = lodash_1.template(`
<p>Newsman just added <%= added.length %> articles for you to review.</p>
<ul>
  <% added.forEach(article => { %>
  <li><h4><%= article.title %></h4><%= article.url %></li>
  <% }) %>
</ul>
<p>Articles left in the publish queue.</p>
<ul>
  <% queued.forEach(article => { %>
  <li><h4><%= article.title %></h4><%= article.url %></li>
  <% }) %>
</ul>
`);
async function updateTechnews(logger, range = 15) {
    const added = await sync_news_1.syncNews(range, logger);
    const queued = await sync_news_1.getQueueArticles();
    if (added.length > 0) {
        await mailer_1.sendEmail({ ToAddresses: [mailer_1.MrNewsman] }, {
            Subject: {
                Data: `Just fetched ${added.length} new articles`
            },
            Body: {
                Html: {
                    Data: reportTpl({
                        added,
                        queued
                    })
                }
            }
        });
    }
    if (queued.length === 0) {
        await mailer_1.sendEmail({ ToAddresses: [mailer_1.MrNewsman] }, {
            Subject: {
                Data: 'You have no articles left in the publish queue <EOM>'
            },
            Body: {
                Text: {
                    Data: ''
                }
            }
        });
    }
}
exports.updateTechnews = updateTechnews;
