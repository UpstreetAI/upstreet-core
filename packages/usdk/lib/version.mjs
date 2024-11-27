import { execSync } from 'child_process';
import pc from 'picocolors';
import packageJson from '../package.json' with { type: 'json' };
import { makeAnonymousClient } from '../packages/upstreet-agent/packages/react-agents/util/supabase-client.mjs';

// Get the current version
export const version = () => packageJson.version;
// Get the latest version
export function getLatestVersion() {
  try {
    const latestVersion = execSync(`npm show ${packageJson.name} version`).toString().trim();
    return latestVersion;
  } catch (error) {
   // console.log(pc.red('Error checking version. '), error.message);
    console.log(pc.red('Error checking latest usdk version on the registry.'));
  }
}

export const isLatestSDKVersion = () => {
  const ver = version();
  const latestVersion = getLatestVersion();
  return latestVersion === ver;
};


export async function warnIfAgentsUseNewerSDKVersion(agentSpecs, opts) {
  const ver = version();
  
  // get agent versions in parallel
  const agentVersionResults = await Promise.all(
    agentSpecs.map(agentSpec => 
      getAgentVersion(agentSpec, opts.jwt)
        .then(version => ({guid: agentSpec.guid, version}))
    )
  );
  
  // check versions and warn about mismatches
  for (const {guid, version} of agentVersionResults) {
    if (version && version > ver) {
      console.warn(pc.yellow(
        `Warning: Agent ${guid} was created with SDK version ${version}, but you're currently using SDK version ${ver}. ` +
        `This version mismatch may cause unexpected behavior. Please update your USDK to the latest version using 'npm install usdk -g'.`
      ));      
    }
  }
}


const getAgentVersionFromGuid = async (guid, jwt) => {
  const supabase = makeAnonymousClient(jwt);
  const { data, error } = await supabase
    .from('assets')
    .select('version')
    .eq('id', guid);
  return data?.[0]?.version;
};

const getAgentVersionFromPath = async (p) => {
  const makeEnoent = () => new Error('not an agent directory: ' + p);

  const wranglerTomlPath = path.join(p, 'wrangler.toml');
  try {
    const wranglerTomString = await fs.promises.readFile(wranglerTomlPath, 'utf8');
    const wranglerToml = toml.parse(wranglerTomString);
    const agentJsonString = wranglerToml.vars.AGENT_JSON;
    const agentJson = agentJsonString && JSON.parse(agentJsonString);
    const version = agentJson?.version;
    if (version) {
      return version;
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

export const getAgentVersion = async (args, jwt) => {
  if (args.directory) {
    return await getAgentVersionFromPath(args.directory, jwt);
  } else {
    return await getAgentVersionFromGuid(args.guid, jwt);
  }
};
