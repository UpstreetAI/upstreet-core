import path from 'path';

export const getCurrentDirname = (importMeta = import.meta, _process = process) => {
  if (importMeta.dirname) {
    return importMeta.dirname;
  } else if (importMeta.url) {
    return path.dirname(new URL(importMeta.url).pathname);
  } else { // we default to this, and pray to God it works.
    return _process.cwd()
  }
};