import path from 'path';

export const getCurrentDirname = (importMeta = import.meta, _process = process) => {
  if (importMeta.dirname) {
    return importMeta.dirname;
  } else if (importMeta.url) {
    return path.dirname(new URL(importMeta.url).pathname);
  } else if (_process) { // In some environments, importMeta is not defined. So we revert to process.
    return _process.cwd() 
  } else { // We default to this, and pray to God it works.
    console.info("[getCurrentDirname] Defaulting to '.'.")
    return "."
  }
};