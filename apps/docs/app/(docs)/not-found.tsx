import RelevantPages from '@/components/relevant-pages'
import Link from 'next/link'
 
export default async function NotFound() {

  return (
    <div className="w-full h-full pt-40 flex flex-col justify-center items-center min-w-0 max-w-[var(--fd-page-width)] md:transition-[max-width] gap-2">
      <h2 className='text-4xl'>Not Found</h2>
      <p>Could not find the requested resource.</p>
      <Link href="/"><button>Return Home</button></Link>

      <RelevantPages />
    </div>
  )
}