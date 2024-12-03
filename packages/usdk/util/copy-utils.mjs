import recursiveCopy from 'recursive-copy';

export const recursiveCopyAll = async (src, dst, opts) => recursiveCopy(src, dst, {
  dot: true,
  junk: true,
  ...opts,
});