import path from 'path';
import fs from 'fs';
// import toml from '@iarna/toml';
import { cwd } from '../util/directory-utils.mjs';
import { isGuid } from '../packages/upstreet-agent/packages/react-agents/util/guid-util.mjs';

const getGuidFromPath = async (p) => {
  const makeEnoent = () => new Error('not an agent directory: ' + p);

  const agentJsonPath = path.join(p, 'agent.json');
  try {
    const agentJsonString = await fs.promises.readFile(agentJsonPath, 'utf8');
    const agentJson = agentJsonString && JSON.parse(agentJsonString);
    const id = agentJson?.id;
    if (id) {
      return id;
    } else {
      throw makeEnoent();
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw makeEnoent();
    } else {
      throw err;
    }
  }
};
export const parseAgentSpecs = async (agentRefSpecs = []) => {
  if (!Array.isArray(agentRefSpecs)) {
    throw new Error('expected agent ref specs to be an array; got ' + JSON.stringify(agentRefSpecs));
  }
  if (!agentRefSpecs.every((agentRefSpec) => typeof agentRefSpec === 'string')) {
    throw new Error('expected agent ref specs to be strings; got ' + JSON.stringify(agentRefSpecs));
  }

  if (agentRefSpecs.length === 0) {
    // if no agent refs are provided, use the current directory
    const directory = cwd;
    const guid = await getGuidFromPath(directory);
    return [
      {
        ref: directory,
        guid,
        directory,
        portIndex: 0,
      },
    ];
  } else {
    // treat each agent ref as a guid or directory
    const agentSpecsPromises = agentRefSpecs.map(async (agentRefSpec, index) => {
      if (isGuid(agentRefSpec)) {
        // if it's a cloud agent
        return {
          ref: agentRefSpec,
          guid: agentRefSpec,
          directory: null,
          portIndex: index,
        };
      } else {
        // if it's a directory agent
        const directory = agentRefSpec;
        const guid = await getGuidFromPath(directory);
        return {
          ref: directory,
          guid,
          directory,
          portIndex: index,
        };
      }
    });
    return await Promise.all(agentSpecsPromises);
  }
};