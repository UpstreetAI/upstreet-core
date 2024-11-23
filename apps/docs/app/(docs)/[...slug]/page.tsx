import { source } from '@/lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import Socials from '@/components/socials';
import Link from 'next/link';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  console.log("page", page);

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}
      footer={{
        enabled: page.url === '/docs' ? false : true,
      }}
      editOnGithub={{
        owner: 'UpstreetAI',
        path: `apps/docs/content/docs/${page.file.path}`,
        repo: 'upstreet-core',
      }}
      breadcrumb={{
        enabled: true,
        full: true,
        includeSeparator: true,        
      }}
      tableOfContent={{
        style: 'clerk',
        footer: <div className='flex flex-col justify-start items-start gap-2 mt-4'>
          <span className='text-sm opacity-40'>Facing an issue? <Link className='underline' target="_blank" href="https://discord.gg/XwQ3NqnMhK">Add a ticket</Link>.</span>
          <Socials />
        </div>,
      }}
      tableOfContentPopover={{
        style: 'clerk'
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params = source.generateParams()
  return params.filter(param => param.slug?.length);
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  
  const title = `${page?.data?.title} - Upstreet Documentation`;
  const description = page.data.description;

  const ogImage = {
    type: "image/png",
    width: 1200,
    height: 630,
    url: `/opengraph/${params.slug?.join("/") ?? ''}`,
  }

  return {
    title,
    description,
    openGraph: {
      images: [
        ogImage
      ],
    },
    twitter: {
      card: "summary_large_image", 
      images: [
        ogImage
      ],
    }
  };
}
