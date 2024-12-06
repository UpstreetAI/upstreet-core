'use client'
import { cn } from '../lib/utils'
import Image from 'next/image'

export default function AuthorCard({
  title,
  description,
  src,
  thumbnailSrc,
  authorName,
  authorSubtitle,
  variant = 'community'
}: {
  title: string
  description: string
  src?: string
  thumbnailSrc: string
  authorName: string
  authorSubtitle: string
  variant?: 'official' | 'community'
}) {
  return (
    <div className="md:max-w-xs w-full flex flex-grow group/card">
      <div
        className={cn(
          'w-full cursor-pointer overflow-hidden relative card h-96 rounded-md shadow-xl mx-auto backgroundImage flex flex-col justify-between p-4',
          `bg-cover`
        )}
        style={{
          backgroundImage: `url(${thumbnailSrc})`
        }}
      >
        {/* Dark overlay for initial background */}
        <div className="absolute inset-0 bg-fd-card-foreground dark:bg-fd-background opacity-60 z-0"></div>

        <div className="absolute w-full h-full top-0 left-0 transition duration-300 group-hover/card:bg-black opacity-60"></div>
        <div className="flex flex-row items-center gap-x-4 z-10">
          <Image
            height="100"
            width="100"
            alt={authorName + ' Avatar'}
            src={src ?? '/images/general/default_profile_picture.webp'}
            className="h-10 w-10 rounded-full border-2 object-cover"
          />
          <div className="flex flex-col justify-center">
            <span className="font-normal text-base text-gray-50 relative z-10">
              {authorName}
            </span>
            <span className="text-sm text-gray-400">{authorSubtitle}</span>
          </div>
        </div>
        <div className="text content">
          <h1 className="font-bold text-xl md:text-2xl text-gray-50 relative z-10">
            {title}
          </h1>
          <p
            className={cn(
              'font-normal text-sm text-gray-50 relative z-10 my-4',
              variant === 'official' ? 'line-clamp-2' : 'line-clamp-4'
            )}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
