import memfs from 'memfs';
export default memfs.promises;
export const access = memfs.promises.access;
export const appendFile = memfs.promises.appendFile;
export const chmod = memfs.promises.chmod;
export const chown = memfs.promises.chown;
export const copyFile = memfs.promises.copyFile;
export const cp = memfs.promises.cp;
export const lchmod = memfs.promises.lchmod;
export const lchown = memfs.promises.lchown;
export const lutimes = memfs.promises.lutimes;
export const link = memfs.promises.link;
export const lstat = memfs.promises.lstat;
export const mkdir = memfs.promises.mkdir;
export const mkdtemp = memfs.promises.mkdtemp;
export const open = memfs.promises.open;
export const opendir = memfs.promises.opendir;
export const readdir = memfs.promises.readdir;
export const readFile = memfs.promises.readFile;
export const readlink = memfs.promises.readlink;
export const realpath = memfs.promises.realpath;
export const rename = memfs.promises.rename;
export const rmdir = memfs.promises.rmdir;
export const rm = memfs.promises.rm;
export const stat = memfs.promises.stat;
export const statfs = memfs.promises.statfs;
export const symlink = memfs.promises.symlink;
export const truncate = memfs.promises.truncate;
export const unlink = memfs.promises.unlink;
export const utimes = memfs.promises.utimes;
export const watch = memfs.promises.watch;
export const writeFile = memfs.promises.writeFile;