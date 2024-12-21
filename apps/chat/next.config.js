/** @type {import('next').NextConfig} */

const path = require('path');
const webpack = require('webpack');

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

    // fix react resolution in sdk subpackage
    const usdkPath = path.resolve(__dirname, '../../packages/usdk');
    const upstreetAgentPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent');
    const reactAgentsPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent/packages/react-agents');
    const reactAgentsClientPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent/packages/react-agents-client');
    const reactAgentsBrowserPath = path.resolve(__dirname, '../../packages/usdk/packages/upstreet-agent/packages/react-agents-browser');
    const replacePlugin = (scopePath, moduleRegexp) => {
      return new webpack.NormalModuleReplacementPlugin(moduleRegexp, (resource) => {
        if (resource.context.includes(scopePath)) {
          const p = require.resolve(resource.request, {
            paths: [scopePath],
          });
          resource.request = p;
        }
      });
    };
    config.plugins.push(
      replacePlugin(reactAgentsPath, /^react/),
      replacePlugin(reactAgentsClientPath, /^react/),
      replacePlugin(reactAgentsBrowserPath, /^react/),
      replacePlugin(upstreetAgentPath, /^react/),
      replacePlugin(usdkPath, /^react/),
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
