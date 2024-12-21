import path from 'path';
import * as esbuild from 'esbuild-wasm';
import { globalImports } from 'react-agents/util/worker-global-imports.mjs'

const ensureEsbuild = (() => {
  let esBuildPromise = null;
  return () => {
    if (!esBuildPromise) {
      esBuildPromise = (async () => {
        try {
          const u = new URL('esbuild-wasm/esbuild.wasm', import.meta.url);
          let opts = {};
          if (typeof window !== 'undefined') {
            opts = {
              ...opts,
              worker: true,
              wasmURL: u.href,
            };
          }
          await esbuild.initialize(opts);
        } catch (err) {
          console.warn('failed to initialize esbuild', err);
        }
      })();
    }
    return esBuildPromise;
  };
})();

//

export const buildAgentSrc = async (opts = {}) => {
  let {
    files = [],
  } = opts;

  await ensureEsbuild();

  const fileMap = await (async () => {
    const result = new Map();
    await Promise.all(files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const p = path.join('/', file.name);
      result.set(p, uint8Array);
    }));
    return result;
  })();
  const filesNamespace = 'files';
  const globalImportMap = new Map(Array.from(Object.entries(globalImports)));
  const globalNamespace = 'globals';

  const result = await esbuild.build({
    stdin: {
      contents: `export { default } from './agent.tsx';`,
      resolveDir: '/', // Optional: helps with resolving imports
      sourcefile: 'entry.ts', // Optional: helps with error messages
      loader: 'tsx', // Set the appropriate loader based on the source type
    },
    bundle: true,
    write: false,
    // outdir: 'dist',
    format: 'esm',
    plugins: [
      {
        name: 'globals-plugin',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            const p = args.path;
            const globalName = globalImportMap.get(p);
            // console.log('got resolve', {args, p, globalName});
            if (globalName) {
              return { path: p, namespace: globalNamespace };
            }
            return null; // Continue with the default resolution
          });
          build.onLoad({ filter: /.*/, namespace: globalNamespace }, (args) => {
            const p = args.path;
            const globalName = globalImportMap.get(p);
            // console.log('got load', {args, p, globalName});
            if (globalName) {
              return {
                // globalImports is initialized by the worker wrapper
                contents: `module.exports = globalImports[${JSON.stringify(globalName)}];`,
                loader: 'js',
              };
            }
            return null; // Continue with the default loading
          });
        },
      },
      {
        name: 'files-plugin',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            const p = path.resolve(path.dirname(args.importer), args.path);
            // console.log('got resolve', {args, p, found: fileMap.has(p)});
            if (fileMap.has(p)) {
              return { path: p, namespace: filesNamespace };
            }
            return null; // Continue with the default resolution
          });
          build.onLoad({ filter: /.*/, namespace: filesNamespace }, (args) => {
            const p = args.path;
            const contents = fileMap.get(p);
            if (contents) {
              const ext = path.extname(p).slice(1);
              const loader = (() => {
                if (/^(?:tsx?|jsx?)$/.test(ext)) {
                  return 'tsx';
                } else if (/^json$/.test(ext)) {
                  return 'json';
                } else if (/^txt$/.test(ext)) {
                  return 'text';
                } else {
                  return 'tsx';
                }
              })();
              // console.log('got load', { p, args, ext, loader, });
              return {
                contents,
                loader,
              };
            } else {
              console.warn('no contents for', p, Array.from(fileMap.keys()));
            }
            return null; // Continue with the default loading
          });
        },
      },
    ],
  });
  const {
    errors = [],
    outputFiles = [],
  } = result;
  if (errors.length === 0) {
    if (outputFiles.length > 0) {
      const outputFile = outputFiles[0];
      // console.log('got output file', outputFile);
      const { contents } = outputFile;
      const textDecoder = new TextDecoder();
      const text = textDecoder.decode(contents);
      // console.log('got contents');
      // console.log(text);
      return text;
    } else {
      console.warn('no output files');
      throw new Error('Failed to build: no output files');
    }
  } else {
    console.warn('build errors: ', errors);
    throw new Error('Failed to build: ' + JSON.stringify(errors));
  }
};