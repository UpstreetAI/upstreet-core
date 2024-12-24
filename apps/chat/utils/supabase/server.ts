import { env } from '@/lib/env'
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types_db';
import { getUserForJwt, makeAnonymousClient } from '@/utils/supabase/supabase-client'

// Define a function to create a Supabase client for server-side operations
// The function takes a cookie store created with next/headers cookies as an argument
/* export const createClient = (jwt?: string|null) => {
  const
    cookieStore = cookies(),
    _jwt = jwt || getJWT();

  return createServerClient<Database>(
    // Pass Supabase URL and anonymous key from the environment to the client
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,

    // Define a cookies object with methods for interacting with the cookie store and pass it to the client
    {
      cookies: {
        // The get method is used to retrieve a cookie by its name
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // The set method is used to set a cookie with a given name, value, and options
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // If the set method is called from a Server Component, an error may occur
            // This can be ignored if there is middleware refreshing user sessions
          }
        },
        // The remove method is used to delete a cookie by its name
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // If the remove method is called from a Server Component, an error may occur
            // This can be ignored if there is middleware refreshing user sessions
          }
        }
      },

      global: {
        headers: {
          ..._jwt ? {
            Authorization: `Bearer ${_jwt}`
          } : {},
        }
      }
    }
  );
}; */

export async function getAgents(query: Record<string, any>, select = '*') {
  const supabaseClient = makeAnonymousClient(env, getJWT());
  let supabaseQuery = supabaseClient
    .from('assets')
    .select(select)
    .eq('type', 'npc')
    .order('created_at', { ascending: false });

  for (const [key, value] of Object.entries(query)) {
    supabaseQuery = supabaseQuery.eq(key, value);
  }

  // supabaseQuery = supabaseQuery
  // .limit(1)
  // .single()

  const { error, data } = await supabaseQuery;
  if (!error) {
    return data as object[];
  } else {
    throw error;
  }
}

export async function getVoices(query: Record<string, any>, select = '*') {
  const supabaseClient = makeAnonymousClient(env, getJWT());
  let supabaseQuery = supabaseClient
    .from('assets')
    .select(select)
    .eq('type', 'voice');

  for (const [key, value] of Object.entries(query)) {
    supabaseQuery = supabaseQuery.eq(key, value);
  }

  const { error, data } = await supabaseQuery;
  if (!error) {
    return data as object[];
  } else {
    throw error;
  }
}

export async function getUserAccount(id: string, select = '*', supabaseClient = makeAnonymousClient(env, getJWT())) {
  const { data } = await supabaseClient
    .from('accounts')
    .select(select)
    .eq( 'id', id )
    .limit(1)
    // .single()

  return data?.[0] as any|null
}

export async function getUserAccountPrivate(id: string, select = '*', supabaseClient = makeAnonymousClient(env, getJWT())) {
  const { data } = await supabaseClient
    .from('accounts_private')
    .select(select)
    .eq( 'id', id )
    .limit(1)
    // .single()
  return data?.[0] as any|null
}

export async function getCredits(id: string, select = '*', supabaseClient = makeAnonymousClient(env, getJWT())) {
  const { data } = await supabaseClient
    .from('credits')
    .select(select)
    .eq( 'agent_id', id )
    .limit(1)
    // .single()
  return (data?.[0] as any|null)?.credits ?? 0;
}

export async function getCreditsUsageHistory(id: string, select = '*', supabaseClient = makeAnonymousClient(env, getJWT())) {
  const { data } = await supabaseClient
    .from('credits_usage')
    .select(select)
    .eq('user_id', id)
    .order('created_at', { ascending: false });
    // .single()
  return data;
}

 

export function getJWT() {
  const cookieStore = cookies();
  return cookieStore.get('auth-jwt')?.value;
}

export async function waitForUser() {
  const jwt = getJWT()
  if (jwt) {
    return await getUserForJwt(jwt)
  } else {
    return null
  }
}
