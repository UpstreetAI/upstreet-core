/** @type {import('next').NextConfig} */

const path = require('path');
const webpack = require('webpack');
const { builtinModules } = require('module');

module.exports = {
  // experimental: {
  //   externalDir: true,
  // },
  transpilePackages: [
    'react-agents',
    'react-agents-browser',
    'react-agents-builder',
    'react-agents-client',
    'ecctrl',
    'ucom',
    '@elizaos/core',
    '@elizaos/client-farcaster',
    '@elizaos/client-github',
    '@elizaos/client-lens',
    '@elizaos/client-slack',
    '@elizaos/client-telegram',
    '@elizaos/client-twitter',
    '@elizaos/plugin-0g',
    '@elizaos/plugin-3d-generation',
    '@elizaos/plugin-abstract',
    '@elizaos/plugin-aptos',
    '@elizaos/plugin-avalanche',
    '@elizaos/plugin-bootstrap',
    '@elizaos/plugin-coinbase',
    '@elizaos/plugin-conflux',
    '@elizaos/plugin-cronoszkevm',
    '@elizaos/plugin-echochambers',
    '@elizaos/plugin-evm',
    '@elizaos/plugin-ferepro',
    '@elizaos/plugin-flow',
    '@elizaos/plugin-fuel',
    '@elizaos/plugin-gitbook',
    '@elizaos/plugin-goat',
    '@elizaos/plugin-icp',
    '@elizaos/plugin-image-generation',
    '@elizaos/plugin-intiface',
    '@elizaos/plugin-multiversx',
    '@elizaos/plugin-near',
    '@elizaos/plugin-nft-generation',
    '@elizaos/plugin-node',
    '@elizaos/plugin-solana',
    '@elizaos/plugin-starknet',
    '@elizaos/plugin-story',
    '@elizaos/plugin-sui',
    '@elizaos/plugin-tee',
    '@elizaos/plugin-ton',
    '@elizaos/plugin-trustdb',
    '@elizaos/plugin-twitter',
    '@elizaos/plugin-video-generation',
    '@elizaos/plugin-web-search',
    '@elizaos/plugin-whatsapp',
    '@elizaos/plugin-zksync-era',
  ],
  async redirects() {
    return [
      {
        source: '/usdk-discord',
        destination: 'https://discord.gg/TfKW36rMj7',
        permanent: false,
      },
      {
        source: '/agentika-hackathon',
        destination: 'https://forms.gle/YZgQqW6dXLYCjDwCA',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '**'
      },
      {
        protocol: 'https',
        hostname: '*.upstreet.ai',
        port: '',
        pathname: '**'
      },
      {
        protocol: 'https',
        hostname: '*.discordapp.com',
        port: '',
        pathname: '**'
      },
    ]
  },
  webpack: (config, options) => {
    // noParse
    // config.module.noParse = /typescript\/lib\/typescript\.js$/;

    // config.module.rules.push({
    //   test: /\.(ts|tsx|js|jsx)$/,
    //   include: [
    //     /\/ucom/,
    //     /\/react-agents.*/,
    //   ],
    //   use: [
    //     {
    //       loader: 'babel-loader',
    //       options: {
    //         presets: ['next/babel'],
    //       },
    //     },
    //   ],
    // });

    /* // Add transpilation of local packages
    config.module.rules.push({
      test: /\.(tsx|ts|js|jsx)$/,
      include: [
        /\/(ucom)/,
        // path.resolve(__dirname, '../../packages/ucom'),
        // Add other local packages that need transpilation here
      ],
      use: [options.defaultLoaders.babel],
    }); */

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:(.*)$/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );

    // fix react resolution in sdk subpackage
    const usdkPath = path.resolve(__dirname, '../../packages/usdk');
    const upstreetAgentPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent');
    const reactAgentsPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent/packages/react-agents');
    const reactAgentsClientPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent/packages/react-agents-client');
    const reactAgentsBrowserPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent/packages/react-agents-browser');
    const replacePlugin = (scopePath, moduleRegexp, importPath) => {
      return new webpack.NormalModuleReplacementPlugin(moduleRegexp, (resource) => {
        if (
          (typeof scopePath == 'string' && resource.context.includes(scopePath)) ||
          (scopePath instanceof RegExp && scopePath.test(resource.context))
        ) {
          if (builtinModules.includes(resource.request)) {
            resource.request = path.join(importPath, 'node_modules', resource.request);
          }
          const p = require.resolve(resource.request, {
            paths: [importPath],
          });
          resource.request = p;
        }
      });
    };
    const modulesRegex = /^react|^fs$|^child_process$/;
    config.plugins.push(
      replacePlugin(reactAgentsPath, modulesRegex, upstreetAgentPath),
      replacePlugin(reactAgentsClientPath, modulesRegex, upstreetAgentPath),
      replacePlugin(reactAgentsBrowserPath, modulesRegex, upstreetAgentPath),
      replacePlugin(upstreetAgentPath, modulesRegex, upstreetAgentPath),
      replacePlugin(usdkPath, modulesRegex, upstreetAgentPath),
      replacePlugin(/\/path-scurry\/|\/0g-ts-sdk\//, modulesRegex, upstreetAgentPath),
    );

    // config.experiments = {
    //   ...config.experiments,
    //   asyncWebAssembly: true, // or syncWebAssembly, but async is preferred
    //   // syncWebAssembly: true, // or syncWebAssembly, but async is preferred
    // };

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    config.module.rules.push({
      test: /\.cdc$/,
      type: 'asset/source'
    });

    return config;
  },
  async headers() {
    return [
      {
        source: "/embed/:id",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *;",
          },
        ],
      },
    ];
  },
}
