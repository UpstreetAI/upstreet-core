import { chromium } from 'playwright-core-lite';

export const createBrowser = async (url, /*opts = {
  proxies: false,
  browserSettings: {
    viewport: {
      width: 1280,
      height: 720,
    },
    blockAds: false,
    solveCaptchas: false,
    recordSession: false,
    logSession: false,
  },
},*/ {
  jwt = '',
}) => {
  if (!url) {
    url = `wss://ai.upstreet.ai/api/browserless/?apiKey=${jwt}`;
  }
  // url = 'ws://localhost:3323';
  const defaultTimeout = 60 * 1000;
  console.log('connecting 1');
  const browser = await chromium.connectOverCDP(
    url,
    {
      timeout: defaultTimeout,
    },
  );
  console.log('connecting 2', browser);
  return browser;
};
