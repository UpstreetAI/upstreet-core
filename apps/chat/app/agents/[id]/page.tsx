import { type Metadata } from 'next';
import { notFound } from 'next/navigation'
import { AgentProfile } from '@/components/agents';
// import { createClient } from '@/utils/supabase/server';
import { getUserForJwt, makeAnonymousClient } from '@/utils/supabase/supabase-client';
import { env } from '@/lib/env'
import { AgentNotFound } from '@/components/agents/profile/AgentNotFound';
import { getJWT } from '@/lib/jwt';

import Footer from '@/components/ui/Footer';
import Header from '@/components/ui/Header';

type Params = {
  params: {
    id: string;
  };
};

async function getUser() {
  const jwt = await getJWT();
  const user = await getUserForJwt(jwt);
  return user;
}

async function getAgentData(supabase: any, identifier: string) {
  // First try to find by ID
  let result = await supabase
    .from('assets')
    .select('*, author: accounts ( id, name ), embed: embed_agent ( trusted_urls )')
    .eq('id', identifier)
    .single();

  // If not found by ID, try to find by username
  if (!result.data) {
    result = await supabase
      .from('assets')
      .select('*, author: accounts ( id, name ), embed: embed_agent ( trusted_urls )')
      .eq('name', identifier)
      .single();
  }

  return result;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const supabase = makeAnonymousClient(env);
  const identifier = decodeURIComponent(params.id);

  const result = await getAgentData(supabase, identifier);
  const agentData = result.data as any;

  if (!agentData) {
    return {
      title: 'Agent not found!'
    };
  }

  const meta = {
    title: agentData?.name ?? 'Agent not found!',
    description: agentData?.description ?? '',
    cardImage: agentData?.preview_url ?? '',
    robots: 'follow, index',
    favicon: '/favicon.ico',
    url: `https://upstreet.ai/`
  };

  return {
    title: meta.title,
    description: meta.description,
    referrer: 'origin-when-cross-origin',
    keywords: ['AI', 'SDK', 'Upstreet', 'Agents'],
    authors: [{ name: 'Upstreet', url: 'https://upstreet.ai/' }],
    creator: 'upstreetai',
    publisher: 'upstreetai',
    robots: meta.robots,
    icons: { icon: meta.favicon },
    metadataBase: new URL(meta.url),
    openGraph: {
      url: meta.url,
      title: meta.title,
      description: meta.description,
      type: 'website',
      siteName: `upstreet.ai/${agentData?.author?.name}`
    },
    twitter: {
      card: 'summary_large_image',
      site: '@upstreetai',
      creator: '@upstreetai',
      title: meta.title,
      description: meta.description,
    }
  }
}

export default async function AgentProfilePage({ params }: Params) {
  const supabase = makeAnonymousClient(env);
  const identifier = decodeURIComponent(params.id);

  const result = await getAgentData(supabase, identifier);
  const agentData = result.data as any;

  if (!agentData?.id) {
    return <AgentNotFound />;
  }

  // check if the user is the owner of the agent
  const user = await getUser();
  const isOwner = agentData.author.id === user?.id;

  return (
    <>
      <Header />
      <AgentProfile agent={agentData} isOwner={isOwner} />
    </>
  );
}
