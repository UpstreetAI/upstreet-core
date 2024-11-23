'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import _ from 'lodash'

const Spinner = () => {
  return (
    <div role="status">
      <svg
        aria-hidden="true"
        className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

const RelevantPages = () => {
  const fetchSearchQuery = async (query: string) => {
    const response = await fetch('/api/search?query=' + query)

    return await response.json()
  }

  const fetchMultipleQueries = async (queries: string[]) => {
    const responses = await Promise.all(
      queries.map(query => fetchSearchQuery(query))
    )
    return responses
  }

  const constructSearchResponse = async (pathname: string) => {
    // phase 1: use just the raw pathname
    const response = await fetchSearchQuery(pathname)
    console.log('phase 1 results', response)

    if (response.length) return response

    // phase 2: use just the last path segment
    const split2 = pathname.split('/')
    const lastPathSegment = split2[split2.length - 1]
    const response2 = await fetchSearchQuery(lastPathSegment)
    console.log('phase 2 results', response2)

    if (response2.length) return response2

    // phase 3: use just the raw pathname
    const response3 = await fetchMultipleQueries(lastPathSegment.split(/-|_/))
    console.log('phase 3 results', response3)

    if (response3.length) return response3.flat(1)

    return []
  }

  const pathname = usePathname()

  const [isLoading, setIsLoading] = useState(true)
  const [similarResults, setSimilarResults] = useState([])

  // const finalResults = (similarResults?.filter((similarResult: any) => similarResult.type === "page").filter(Boolean) || []);

  // Step 1: Filter out falsy values, but do not filter by type
  const filteredResults = similarResults?.filter(Boolean) || []

  // Step 2: Count frequency of each result based on url + content
  const frequencyMap = new Map()
  filteredResults.forEach((result: any) => {
    const key = result.url // Combine URL and content to form a unique key
    frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1)
  })

  // Step 3: Sort results by frequency, then by type (page > text > heading), and finally by the URL/content combination for consistency
  const sortedResults = [...filteredResults].sort((a: any, b: any) => {
    const keyA = a.url
    const keyB = b.url
    const freqA = frequencyMap.get(keyA)
    const freqB = frequencyMap.get(keyB)

    // Sort by frequency first (highest frequency first)
    if (freqB !== freqA) {
      return freqB - freqA // Sort by frequency, most frequent first
    }

    // If frequencies are the same, prioritize "page" > "text" > "heading"
    const typePriority:any = { page: 3, text: 2, heading: 1 }
    return typePriority[b.type] - typePriority[a.type] // Sort by type priority
  })

  // Step 4: Ensure uniqueness by keeping only the first occurrence of each unique url + content combination
  const uniqueResults = sortedResults.filter(
    (value: any, index: number, self: any[]) => {
      const key = value.url
      return index === self.findIndex((result: any) => result.url === key)
    }
  )

  const finalResults =
    uniqueResults
      ?.filter((similarResult: any) => similarResult.type === 'page')
      .filter(Boolean) || []

  console.log(finalResults)

  useEffect(() => {
    if (pathname) {
      setIsLoading(true)
      constructSearchResponse(pathname)
        .then(response => {
          console.log('final response:', response)
          setSimilarResults(response)
        })
        .catch(err => {
          console.error(err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [pathname])

  if (isLoading) {
    return <Spinner />
  }

  if (finalResults.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 bg-fd-secondary-foreground rounded-md text-fd-secondary px-4 py-2 mt-2">
      You might want to see...
      <br />
      <div className="flex flex-col">
        {finalResults.map((similarResult: any) => {
          return (
            <Link href={similarResult.url}>
              <pre className="hover:bg-slate-200 transition-all line-clamp-1 max-w-sm">
                {similarResult.content}
              </pre>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default RelevantPages
