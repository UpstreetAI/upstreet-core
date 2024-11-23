// app/components/community-examples.tsx
import { fetchDiscordThreadsWithMessages } from '../lib/discord';
import AuthorCard from './author-card';
import Link from 'next/link';

// This tells Next.js to generate the page at build time
export const revalidate = 3600; // Revalidate every hour

const CommunityExamples = async () => {
  // Fetch threads during build time
const threads = await fetchDiscordThreadsWithMessages(process.env.DOCS_DISCORD_CHANNEL_ID!);

  const examples = threads.map((thread) => {
    const firstMessage = thread.messages[thread.messages.length - 1]
    return {
        id: thread.name,
        url: firstMessage.url,
        title: thread.name,
        description: firstMessage.content,
        authorName: `${firstMessage.author.global_name} (@${firstMessage.author.username})`,
        authorSubtitle: "Community Member",
        src: firstMessage.author.avatar,
        thumbnailSrc: '/images/example-thumbnails/empty.png'
    }
  })

  return (
    <div className='flex flex-row gap-3 flex-wrap'>
      {examples.map((example) => {
        return (
          <Link 
            href={example.url} 
            key={example.id} 
            target='_blank'
            className='no-underline hover:scale-105 transition-transform'
          >
            <AuthorCard
              {...example}
            />
          </Link>
        );
      })}
    </div>
  );
};

export default CommunityExamples;