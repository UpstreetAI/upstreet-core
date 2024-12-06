'use client'
import { cn } from '../lib/utils'

function Card({
  title,
  description,
  src: bgSrc,
  gifSrc
}: {
  title?: string
  description?: string
  src: string
  gifSrc?: string
}) {
  return (
    <div className="max-w-xs w-full">
      <div
        className={cn(
          'group w-full cursor-pointer overflow-hidden relative card h-96 rounded-md shadow-xl mx-auto flex flex-col justify-end p-4 border border-transparent dark:border-neutral-800',
          "hover:after:content-[''] hover:after:absolute hover:after:inset-0 hover:after:bg-fd-card-foreground dark:hover:after:bg-fd-background hover:after:opacity-50",
          'transition-all duration-500',
          'bg-opacity-50'
        )}
        style={{
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: 'cover'
        }}
        onMouseEnter={e => {
          if (gifSrc) {
            ;(e.currentTarget as HTMLElement).style.backgroundImage =
              `url(${gifSrc})`
          }
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLElement).style.backgroundImage =
            `url(${bgSrc})`
        }}
      >
        <div className="absolute inset-0 bg-fd-card-foreground dark:bg-fd-background opacity-60 z-0"></div>

        <div className="text relative z-[1]">
          <h1 className="font-bold text-xl md:text-3xl text-gray-50 relative">
            {' '}
            {title}{' '}
          </h1>
          <p className="font-normal text-base text-gray-50 relative my-4">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Card
