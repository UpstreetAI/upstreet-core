import { createAgentGuid } from '../packages/upstreet-agent/packages/react-agents/util/guid-util.mjs';
import { getUserForJwt, getAgentToken } from '../packages/upstreet-agent/packages/react-agents/util/jwt-utils.mjs';
import { generateMnemonic } from './ethereum-utils.mjs';

export const getAgentAuthSpec = async (jwt) => {
  const [
    {
      guid,
      agentToken,
    },
    userPrivate,
  ] = await Promise.all([
    (async () => {
      const guid = await createAgentGuid({
        jwt,
      });
      const agentToken = await getAgentToken(jwt, guid);
      return {
        guid,
        agentToken,
      };
    })(),
    getUserForJwt(jwt, {
      private: true,
    }),
  ]);
  const mnemonic = generateMnemonic();
  return {
    guid,
    agentToken,
    userPrivate,
    mnemonic,
  };
};