import { CssBaseline, ThemeProvider } from '@material-ui/core';
import { captureException, withScope } from '@sentry/browser';
import { AuthedNextPage, getPassport, setPassport } from 'cl-next-app';
import App, { AppContext } from 'next/app';
import Head from 'next/head';
import React from 'react';
import { Provider as AlertProvider } from 'react-alert';
import { identify } from '../client/analytics';
import AlertTemplate from '../client/components/alert-template';
import ApolloWrapper from '../client/components/apollo-wrapper';
import theme from '../client/theme';

// external css
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import '@fullcalendar/core/main.css';
import '@fullcalendar/timegrid/main.css';
import '@fullcalendar/daygrid/main.css';
import '../overrides.css';

export default class AppRoot extends App<AuthedNextPage> {
  static async getInitialProps({ ctx, Component }: AppContext) {
    const me = getPassport(ctx);
    const pageProps = Component.getInitialProps
      ? await Component.getInitialProps(ctx)
      : ctx.query;

    return { pageProps, me };
  }

  componentDidCatch(err: Error, errorInfo: React.ErrorInfo) {
    if (this.props.me) {
      withScope(scope => {
        scope.addBreadcrumb({ message: 'Teacher Portal Error' });
        scope.setUser(this.props.me);
        captureException(err);
      });
    }

    super.componentDidCatch(err, errorInfo);
  }

  componentDidMount() {
    if (this.props.me) {
      setPassport(this.props.me);
      identify(this.props.me);
    }

    // Remove the server-side injected CSS.
    const jssStyles = document.getElementById('jss-server-side');
    if (jssStyles && jssStyles.parentNode) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  render() {
    const { Component, pageProps, me } = this.props;

    return (
      <>
        <Head>
          <title>Teaching Portal</title>
        </Head>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AlertProvider
            template={AlertTemplate}
            position="bottom center"
            containerStyle={{ zIndex: 9999 }}
            timeout={8000}
          >
            <ApolloWrapper>
              <Component {...pageProps} me={me} />
            </ApolloWrapper>
          </AlertProvider>
        </ThemeProvider>
      </>
    );
  }
}
