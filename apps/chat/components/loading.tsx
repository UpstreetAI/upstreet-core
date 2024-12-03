import React from 'react'
import { IconSpinner } from '@/components/ui/icons'
import { cn } from '@/lib/utils'


export function Loading({mode}: {mode: string}) {
  return (
    <div className={cn("flex flex-1 justify-center items-center h-full w-full fixed top-0 left-0 z-100", mode === 'web' ? 'bg-[url("/images/backgrounds/main-background.jpg")] bg-center bg-cover' : '')}>
      <IconSpinner className="h-[50px] w-[50px]"/>
    </div>
  )
}
