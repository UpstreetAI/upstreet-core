import React from 'react';
import { redirect } from 'next/navigation';
import { routes } from '@/routes';
import { getUserAccount, getUserAccountPrivate, getCredits, getAgents, getVoices, waitForUser, getCreditsUsageHistory } from '@/utils/supabase/server';
import { Tabs } from './tabs';
import { LoginRedirect } from '@/components/login-redirect';

export interface AccountProps {
  params: {
    id: string
  }
}

export async function AccountForm({
  id,
}: {
  id: string
}) {
  let user: any = null
  let userPrivate: any = null
  let credits = 0
  let creditsUsageHistory: any = null;
  let userIsCurrentUser = false

  const currentUser = await waitForUser();
  if (!currentUser) {
    // return redirect( routes.home )
    return null;
  }

  // Fetch agents with the linked credits_usage table data
  const agentsPromise = getAgents(id || currentUser.id, `*, credits_usage ( * )`);
  const voicesPromise = getVoices(id || currentUser.id);

  // Display user for given ID if provided, else get current user.
  if (id) {
    user = await getUserAccount(id, 'name,id,playerSpec,preview_url,images')

    // Redirect if a user isn't found, otherwise check if it's the
    // logged-in user.
    if (!user) return redirect(routes.home)
    userIsCurrentUser = user?.id === currentUser.id
  } else {
    user = currentUser
    userIsCurrentUser = true
  }
  // load private data
  if (userIsCurrentUser) {
    [userPrivate, credits, creditsUsageHistory] = await Promise.all([
      getUserAccountPrivate(user.id, 'stripe_connect_account_id,stripe_subscription_id,plan'),
      getCredits(user.id),
      getCreditsUsageHistory(user.id)
    ]);
  }

  const agents = await agentsPromise;
  const voices = await voicesPromise;

  return (
    <Tabs
      user={user}
      creditsUsageHistory={creditsUsageHistory}
      userPrivate={userPrivate}
      agents={agents}
      voices={voices}
      userIsCurrentUser={userIsCurrentUser}
    />
  );
}

export async function Account({ params: { id } }: AccountProps) {
  return (
    <>
      <LoginRedirect />
      <AccountForm id={id} />
    </>
  );
}
