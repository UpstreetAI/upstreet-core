import { source } from '@/lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
  DocsCategory,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { Popup, PopupContent, PopupTrigger } from 'fumadocs-twoslash/ui';
import Socials from '@/components/socials';
import Link from 'next/link';
import {
  type ComponentProps,
  type FC,
  // Fragment,
  // type ReactElement,
  // type ReactNode,
} from 'react';
import defaultComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
// import { AutoTypeTable } from '@/components/type-table';

// function PreviewRenderer({ preview }: { preview: string }): ReactNode {
//   if (preview && preview in Preview) {
//     const Comp = Preview[preview as keyof typeof Preview];
//     return <Comp />;
//   }

//   return null;
// }

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  // const preview = page.data.preview;
  const {
    body: Mdx,
    toc, 
    // lastModified 
  } = await page.data;

  return (
    <DocsPage toc={toc} full={page.data.full}
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
        {/* {preview ? <PreviewRenderer preview={preview} /> : null} */}
        <Mdx
          components={{
            ...defaultComponents,
            Popup,
            PopupContent,
            PopupTrigger,
            Tabs,
            Tab,
            TypeTable,
            // AutoTypeTable,
            Accordion,
            Accordions,
            // Wrapper,
            // blockquote: Callout as unknown as FC<ComponentProps<'blockquote'>>,
            // APIPage: openapi.APIPage,
            // HeadlessOnly:
              // params.slug[0] === 'headless' ? Fragment : () => undefined,
            // UIOnly: params.slug[0] === 'ui' ? Fragment : () => undefined,
          }}
        />
        {page.data.index ? <DocsCategory page={page} from={source} /> : null}
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
