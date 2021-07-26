import { ServerStyleSheets } from '@material-ui/core';
import Document, { DocumentContext, Head, Main, NextScript } from 'next/document';
import React from 'react';
import { segmentSnippet } from '../client/analytics';
import theme from '../client/theme';

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    // Resolution order
    //
    // On the server:
    // 1. app.getInitialProps
    // 2. page.getInitialProps
    // 3. document.getInitialProps
    // 4. app.render
    // 5. page.render
    // 6. document.render
    //
    // On the server with error:
    // 1. document.getInitialProps
    // 2. app.render
    // 3. page.render
    // 4. document.render
    //
    // On the client
    // 1. app.getInitialProps
    // 2. page.getInitialProps
    // 3. app.render
    // 4. page.render

    const sheets = new ServerStyleSheets();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: App => props => sheets.collect(<App {...props} />)
      });

    const initialProps = await Document.getInitialProps(ctx);
    return {
      ...initialProps,
      // Styles fragment is rendered after the app and page rendering finish.
      styles: (
        <React.Fragment>
          {initialProps.styles}
          {sheets.getStyleElement()}
        </React.Fragment>
      )
    };
  }

  render() {
    return (
      <html>
        <Head>
          <link
            rel="shortcut icon"
            href="https://cdn.create-learn.us/icons/favicon.ico"
            type="image/x-icon"
          />
          <link
            rel="apple-touch-icon"
            href="https://cdn.create-learn.us/icons/icon-192x192.png"
            sizes="192x192"
          />
          <meta name="theme-color" content={theme.palette.primary.main} />
          <script dangerouslySetInnerHTML={{ __html: segmentSnippet }} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}
