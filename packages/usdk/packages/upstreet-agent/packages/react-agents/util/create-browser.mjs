import { chromium } from 'playwright-core';
// import { aiProxyHost, r2EndpointUrl } from './endpoints.mjs';

/* const createSession = async (opts, {
  jwt = '',
}) => {
  if (!jwt) {
    throw new Error('no jwt');
  }

  const res = await fetch(`https://${aiProxyHost}/api/browserbase/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(opts),
  });
  if (res.ok) {
    const j = await res.json();
    const { sessionId, url } = j;
    return { sessionId, url };
  } else {
    const text = await res.text();
    throw new Error(`failed to create session: ${text}`);
  }
}; */
/* const destroySession = async (sessionId, {
  jwt = '',
}) => {
  if (!jwt) {
    throw new Error('no jwt');
  }

  const res = await fetch(`https://${aiProxyHost}/api/browserbase/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (res.ok) {
    // nothing
  } else {
    const text = await res.text();
    throw new Error(`failed to destroy session: ${text}`);
  }
}; */

export const createBrowser = async (opts/*: CreateSessionOptions = {}*/ = {
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
}, {
  jwt = '',
}) => {
  // console.log('browser opts', opts);
  // const sessionResult = await createSession(opts, {
  //   jwt,
  // });
  // const {
  //   sessionId,
  //   url,
  // } = sessionResult;

  const defaultTimeout = 60 * 1000;
  const url = `wss://ai.upstreet.ai/api/browserless/?apiKey=${jwt}`;
  const browser = await chromium.connectOverCDP(
    url,
    {
      timeout: defaultTimeout,
    },
  );
  // const browser = await chromium.connectOverCDP(
  //   url,
  //   {
  //     timeout: defaultTimeout,
  //   },
  // );
  // const _destroySession = async () => {
  //   try {
  //     // await destroySession(sessionId, { jwt });
  //     await browser.close();
  //   } catch (err) {
  //     console.warn('failed to destroy session', sessionId, err);
  //   }
  // };

  // return {
  //   sessionId,
  //   url,
  //   browser,
  //   destroySession: _destroySession,
  // };
  return browser;
};

/* export const testBrowser = async ({
  jwt = '',
}) => {
  if (!jwt) {
    throw new Error('no jwt');
  }

  const browserResult = await createBrowser(undefined, {
    jwt,
  });
  console.log('got browser result', browserResult);
  const {
    sessionId,
    url,
    browser,
    destroySession,
  } = browserResult;
  try {
    console.log('got browser', browser);
    const contexts = browser.contexts();
    console.log('got contexts', contexts);
    const context = contexts[0];
    if (!context) {
      throw new Error('no default browser context');
    }
    // context.setDefaultTimeout(defaultTimeout);
    // context.setDefaultNavigationTimeout(defaultTimeout);
    browser.on('disconnected', () => {
      console.log('browser disconnected!!!', new Error().stack);
    });
    const page = await context.newPage();
    console.log('got page', page);
    // go to gamespot.com
    try {
      await page.goto('https://pokemon.fandom.com/wiki/Liko', {
        waitUntil: 'networkidle',
      });
    } catch (err) {
      console.error('failed to navigate to gamespot.com', err);
    }
    console.log('navigated page');
    // screenshot the page
    const screenshot = await page.screenshot({
      // fullPage: true,
      type: 'jpeg', // 'png',
      quality: 70,
    });
    console.log('got screenshot', screenshot);
    {
      const screenshotBlob = new Blob([screenshot], { type: 'image/jpeg' });
      console.log('got screenshot blob', screenshotBlob);

      // const jwt = await getJWT();
      const guid = crypto.randomUUID();
      const keyPath = ['assets', guid, 'screenshot.jpg'].join('/');
      const u = `${r2EndpointUrl}/${keyPath}`;
      const res = await fetch(u, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
        body: screenshotBlob,
      });
      if (res.ok) {
        const j = await res.json();
        return j;
      } else {
        const text = await res.text();
        throw new Error(`could not upload avatar file: ${text}`);
      }
    }
    await page.close();
    console.log('page closed');
    await browser.close();
    console.log('browser closed');
  } finally {
    destroySession();
    await console.log('session destroyed');
  }
}; */