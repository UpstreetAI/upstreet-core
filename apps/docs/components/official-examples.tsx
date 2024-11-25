"use server";

import AuthorCard from './author-card';
import { source } from '@/lib/source';
import matter from 'gray-matter';
import { promises as fs } from 'fs';
import Link from 'next/link';
import _ from 'lodash';

// Define the frontmatter type
interface Frontmatter {
  title: string;
  description: string;
  full: boolean;
  authorName?: string;
}

// Helper function to parse MDX content
const parseMdxContent = (mdxContent: string) => {
  const { data, content } = matter(mdxContent);
  return {
    frontmatter: data as Frontmatter,
    content
  };
};

const OfficialExamples = async () => {

    // @ts-expect-error
    const examples = source?.pageTree?.children?.find((p) => p.name === "Examples of Agents")?.children

    const hydratedExamples = await Promise.all(examples.map(async (example: any) => {
        
        const slug = example.url.split("/").filter(Boolean);

        const page = source.getPage(slug);

        let parsedMdxContent;

        if (page?.file?.path) {
            const file = await fs.readFile(process.cwd() + '/content/docs/' + page.file.path, 'utf8');
            parsedMdxContent = parseMdxContent(file)
        }

        if (parsedMdxContent?.frontmatter?.description) {
            parsedMdxContent.frontmatter.description = _.upperFirst(parsedMdxContent.frontmatter.description.replaceAll("This section describes how to ", ""))
        }

        return {
            ...example,
            page,
            parsedMdxContent
        }
    }))

    return (
        <div className='flex flex-row gap-3 flex-wrap'>
        {hydratedExamples.map((example: any) => {
            const frontmatter = example.parsedMdxContent?.frontmatter || {};
            return (
                <Link href={example.url} key={example.url} className='no-underline md:max-w-xs w-full group/card'>
                    <AuthorCard
                        variant="official"
                        {...frontmatter}
                        authorSubtitle='Official Upstreet Team'
                    />
                </Link>
            )
        })}
        </div>
    )
}

export default OfficialExamples;