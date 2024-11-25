import {
  defineConfig,
  defineDocs,
  // defineCollections,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
// import remarkMath from 'remark-math';
import { z } from 'zod';
// import { TOCItem } from 'fumadocs-core/toc';

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema.extend({
      preview: z.string().optional(),
      index: z.boolean().default(false),
      /**
       * API routes only
       */
      method: z.string().optional(),
      /**
       * Examples only
       */
      authorName: z.string().optional(),
      src: z.string().optional(),
      thumbnailSrc: z.string().optional(),
      // toc: z.array(z.object({
      //   title: z.custom<React.JSX.Element>(
      //     e => (e as any)?.$$typeof === Symbol.for("react.element"),
      //     "value must be a React Element"
      //   ),
      //   url: z.string(),
      //   depth: z.number()
      // })
      // ).optional(),
    }),
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
});

export default defineConfig({
  lastModifiedTime: 'git',
  mdxOptions: {
    // rehypeCodeOptions: {
    //   // inline: 'tailing-curly-colon',
    //   // themes: {
    //   //   light: 'catppuccin-latte',
    //   //   dark: 'catppuccin-mocha',
    //   // },
    //   transformers: [
    //     ...(rehypeCodeDefaultOptions.transformers ?? []),
    //     // transformerTwoslash(),
    //     {
    //       name: 'transformers:remove-notation-escape',
    //       code(hast) {
    //         for (const line of hast.children) {
    //           if (line.type !== 'element') continue;

    //           const lastSpan = line.children.findLast(
    //             (v) => v.type === 'element',
    //           );

    //           const head = lastSpan?.children[0];
    //           if (head?.type !== 'text') return;

    //           head.value = head.value.replace(/\[\\!code/g, '[!code');
    //         }
    //       },
    //     },
    //   ],
    // },
    // remarkPlugins: [
      // remarkMermaid,
      // remarkMath,
      // [remarkInstall, { persist: { id: 'package-manager' } }],
      // [remarkDocGen, { generators: [fileGenerator()] }],
    // ],
    // rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});