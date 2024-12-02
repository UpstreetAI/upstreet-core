import Logo from '@/components/logo';
import { RootToggle } from 'fumadocs-ui/layouts/docs.client';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import pkgJson from 'usdk/package.json';
import Image from 'next/image';

/**
 * Shared layout configurations
 *
 * you can configure layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions = {
  nav: {
    title: <Logo className='h-10' />,
    children: <div className='flex w-full justify-end items-end'>
      <RootToggle
        defaultValue={0}
        options={[
          {
            title: `v${pkgJson.version}`,
            description: 'Latest',
            url: '/',
          }
          // {
          //   title: 'Folder 2',
          //   description: 'Pages in folder 2',
          //   url: '/path/to/page-tree-2',
          // },
        ]}
      />
    </div>
  },
  sidebar: {
    banner: (
      <RootToggle
        defaultValue={0}
        defaultChecked={true}
        options={[
          {
            title: 'USDK',
            description: 'Upstreet Agents SDK',
            url: '/',
            icon: <Image alt="product logo" src="/images/general/USDK_Logo.png" width={30} height={30} className="rounded-md" />,
          },
          {
            title: 'Scillia',
            description: 'Your personal assistant Agent',
            url: '/',
            icon: <Image alt="product logo" src="/images/general/Scillia_Logo.png" width={30} height={30} className="rounded-md" />,
          },
          {
            title: 'Platform',
            description: 'The Upstreet Platform',
            url: '/platform/',
            icon: <Image alt="product logo" src="/images/general/Platform_Logo.png" width={30} height={30} className="rounded-md" />,
          },
        ]}
      />
    ),
  }
  // links: [
  //   {
  //     text: 'Documentation',
  //     url: '/docs',
  //     active: 'nested-url',
  //   },
  // ],
};
