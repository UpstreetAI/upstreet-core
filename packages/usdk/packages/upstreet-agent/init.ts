Error.stackTraceLimit = 300;
globalThis.__filename = 'node.js';
globalThis.__dirname = '/';
(globalThis.process as any).version = '20.0.0';
if (typeof import.meta.url === 'undefined') {
  import.meta.url = `file://localhost/${globalThis.__filename}`;
}