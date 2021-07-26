import { TokenPayload } from '@cl/types';
import { init } from '@sentry/browser';
import getConfig from 'next/config';
const { publicRuntimeConfig } = getConfig();

const sentryOpts: { dsn: string; enabled: boolean; environment?: string } =
  publicRuntimeConfig.sentry;

if (sentryOpts.enabled) {
  init(sentryOpts);
}

export const segmentOpts: { key: string; enabled: boolean } =
  publicRuntimeConfig.segment;

export const segmentSnippet = `
  !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t,e){var n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src="https://cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a);analytics._loadOptions=e};analytics.SNIPPET_VERSION="4.1.0";
  analytics.load("${segmentOpts.key}");
  }}();
`;

declare global {
  interface Window {
    analytics: any;
  }
}

interface Event {
  action: string;
  properties: Record<string, any>;
}

const enabled = typeof window === 'object' && segmentOpts.enabled;

export function identify(passport: TokenPayload) {
  if (enabled) {
    window.analytics.identify(passport.teacherId, {
      email: passport.email
    });
  }
}

export function logEvent(action: Event['action'], payload: Event['properties']) {
  if (enabled) {
    window.analytics.track(action, payload);
  }
}

export function logPageView(page: string, payload?: Event['properties']) {
  if (enabled) {
    window.analytics.page(page, payload);
  }
}
