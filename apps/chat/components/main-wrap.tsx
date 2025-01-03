'use client'

import { Loading } from '@/components/loading'
import { useGlobalState } from '@/contexts/GlobalContext'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { cn } from '@/lib/utils'
import React from 'react'

interface MainProps {
  children: React.ReactNode
}

export function MainWrap({ children }: MainProps) {
  const { isFetchingUser } = useSupabase();
  const [globalState] = useGlobalState();

  return globalState.mode && (
    <main className={cn(
      "flex flex-col min-h-screen flex-1",
      globalState.mode.name !== 'desktop' && "bg-[url('/images/backgrounds/main-background.jpg')] bg-center bg-cover"
    )}>
      {isFetchingUser ? (
        <Loading />
      ) : (
        React.Children.map(children, child =>
          React.isValidElement(child) ? React.cloneElement(child, { ...child.props }) : child
        )
      )}
    </main>
  );
}
