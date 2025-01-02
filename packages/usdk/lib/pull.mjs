import { getUserIdForJwt } from '../packages/upstreet-agent/packages/react-agents/util/jwt-utils.mjs';
import { cwd } from '../util/directory-utils.mjs';
import { cleanDir } from './directory-util.mjs';
import { extractZip } from './zip-util.mjs';
import { npmInstall } from './npm-util.mjs';
import { aiProxyHost } from '../packages/upstreet-agent/packages/react-agents/util/endpoints.mjs';
import pc from 'picocolors';
import { makeId } from '../packages/upstreet-agent/packages/react-agents/util/util.mjs';
import path from 'path';
import { mkdirp } from 'mkdirp';

export const pull = async (args, opts) => {
  const agentId = args._[0] ?? '';
  let dstDir = args._[1];
  const force = !!args.force;
  const forceNoConfirm = !!args.forceNoConfirm;
  const noInstall = !!args.noInstall;
  const events = args.events ?? null;
  // opts
  const jwt = opts.jwt;
  if (!jwt) {
    throw new Error('You must be logged in to pull.');
  }

  const userId = jwt && (await getUserIdForJwt(jwt));
  if (userId) {
    if (dstDir) {
      // clean the old directory
      await cleanDir(dstDir, {
        force,
        forceNoConfirm,
      });
    } else {
      // create the destination directory if not present
      const dirname = makeId(8);
      dstDir = path.join(cwd, 'agents', dirname);
      await mkdirp(dstDir);
    }

    // download the source
    console.log(pc.italic('Downloading source...'));
    const u = `https://${aiProxyHost}/agents/${agentId}/source`;
    try {
      const req = await fetch(u, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
      if (req.ok) {
        const zipBuffer = await req.arrayBuffer();
        // console.log('downloaded source', zipBuffer.byteLength);

        // extract the source
        console.log(pc.italic('Extracting zip...'));
        await extractZip(zipBuffer, dstDir);

        events && events.dispatchEvent(new MessageEvent('finalize', {
          data: {
            agentJson,
          },
        }));

        console.log(pc.italic('Installing dependencies...'));
        try {
          if (!noInstall) {
            await npmInstall(dstDir);
          }
        } catch (err) {
          console.warn('npm install failed:', err.stack);
          throw err;
        }
      } else {
        const text = await req.text();
        console.warn('pull request error', text);
        throw new Error(`pull request error: ${text}`);
      }
    } catch (err) {
      console.warn('pull request failed', err);
      throw err;
    }
  } else {
    console.log('not logged in');
  }
};
