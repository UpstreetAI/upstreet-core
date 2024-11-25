import { createMDX } from 'fumadocs-mdx/next';
import fs from 'fs-extra';
import path from 'path';

const wasmSourceDir = path.join(process.cwd()); // Folder containing your .wasm files
const wasmTargetDir = path.join(process.cwd(), '.next/server/chunks'); // Target folder

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        port: '',
        pathname: '/**/*',
      },
    ],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      const targetFolder = path.resolve(wasmTargetDir);
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.beforeCompile.tapAsync('CopyWasmFilesPlugin', async (_, callback) => {
            try {
              // Ensure the target directory exists
              await fs.ensureDir(targetFolder);

              // Read files in the source directory and filter for .wasm files
              const files = await fs.readdir(wasmSourceDir);
              const wasmFiles = files.filter(file => file.endsWith('.wasm'));

              // Copy each .wasm file individually
              for (const file of wasmFiles) {
                const sourcePath = path.join(wasmSourceDir, file);
                const targetPath = path.join(targetFolder, file);
                await fs.copyFile(sourcePath, targetPath);
              }

              console.log('Copied .wasm files to', targetFolder);
              callback();
            } catch (error) {
              console.error('Failed to copy .wasm files:', error);
              callback(error);
            }
          });
        },
      });
    }

    // Ignore these modules in the build
    // This issue arose because "speaker" module is optional, and doesn't install in Vercel environment
    config.resolve.alias['../packages/upstreet-agent/packages/react-agents/devices/audio-output.mjs'] = false;

    return config;
  },
};

export default withMDX(config);
