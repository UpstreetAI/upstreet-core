import { getUserIdForJwt } from '../packages/upstreet-agent/packages/react-agents/util/jwt-utils.mjs';
import { SupabaseStorage } from '../packages/upstreet-agent/packages/react-agents/storage/supabase-storage.mjs';

export const status = async (args, {
  jwt,
}) => {
  if (jwt) {
    const userId = await getUserIdForJwt(jwt);

    let result = {
      user: null,
      wearing: null,
    };

    const supabase = new SupabaseStorage({ jwt });
    // get user
    const { error, data } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error) {
      result.user = data;

      // get wearing
      const { active_asset } = data;
      if (active_asset) {
        // print the currently worn character
        const assetResult = await supabase
          .from('assets')
          .select('*')
          .eq('id', active_asset)
          .eq('type', 'npc')
          .maybeSingle();
        const { error, data } = assetResult;
        if (!error) {
          if (data) {
            result.wearing = data;
          } else {
            console.warn('failed to fetch worn avatar', active_asset);
          }
        } else {
          console.log(`could not get asset ${userId}: ${error}`);
        }
      // } else {
      //   console.log('not wearing an avatar');
      }

      return result;
    } else {
      throw new Error(`could not get account ${userId}: ${error}`);
    }
  } else {
    throw new Error('not logged in');
  }
};