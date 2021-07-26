import { template } from 'lodash';
import { Logger } from 'pino';
import { sendSESEmail } from '../lib/aws';
import { MrNewsman } from '../lib/mailer';
import { getQueueArticles, syncNews } from './sync-news';

const reportTpl = template(`
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

export async function updateTechnews(logger: Logger, range = 15) {
  const added = await syncNews(range, logger);
  const queued = await getQueueArticles();

  if (added.length > 0) {
    await sendSESEmail(
      { ToAddresses: [MrNewsman] },
      {
        Simple: {
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
        }
      }
    );
  }

  if (queued.length === 0) {
    await sendSESEmail(
      { ToAddresses: [MrNewsman] },
      {
        Simple: {
          Subject: {
            Data: 'You have no articles left in the publish queue <EOM>'
          },
          Body: {
            Text: {
              Data: ''
            }
          }
        }
      }
    );
  }
}
