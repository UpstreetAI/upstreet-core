import React from 'react';
import { EmbedChat } from '@/components/chat/embed-chat';
import { makeAnonymousClient } from '@/utils/supabase/supabase-client';
import { env } from '@/lib/env';

type Params = {
  params: {
    id: string;
  };
};

type AgentData = {
  id: string;
  name: string;
};

async function getAgentData(supabase: any, identifier: string) {
  try {
    // Find by ID
    let result = await supabase
      .from('assets')
      .select('*, author: accounts ( id, name ), embed: embed_agent ( trusted_urls )')
      .eq('id', identifier)
      .single();

    // If not found by ID, try username
    if (!result.data) {
      result = await supabase
        .from('assets')
        .select('*, author: accounts ( id, name ), embed: embed_agent ( trusted_urls )')
        .eq('name', identifier)
        .single();
    }

    return result;
  } catch (error) {
    console.error('Error fetching agent data:', error);
    throw error;
  }
}

export default async function EmbedPage({ params }: Params) {
  // try {
    const supabase = makeAnonymousClient(env);
    
    const id = decodeURIComponent(params.id);
    const result = await getAgentData(supabase, id);
    const agentData = result.data as AgentData;

    // console.log(id, agentData);

    return (
      <div className="w-full relative flex h-screen overflow-hidden">
        <EmbedChat agent={agentData} />
      </div>
    );
  // } catch (error) {
  //   console.error('Error in EmbedPage:', error);
  //   return <div>Error loading page</div>;
  // }
}
