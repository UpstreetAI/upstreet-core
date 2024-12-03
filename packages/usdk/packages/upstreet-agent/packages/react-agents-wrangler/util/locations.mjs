import { createRequire } from 'module';

//

const require = createRequire(import.meta.url);

//

export const wranglerBinPath = require.resolve('wrangler/bin/wrangler.js');