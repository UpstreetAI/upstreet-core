import { version } from '../../lib/version.mjs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('usdk version command', () => {
    it('should return a valid version string', async () => {
        const ver = version();
        expect(typeof ver).toBe('string');
        expect(ver).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should match the package.json version', async () => {
        const ver = version();
        const packageJson = JSON.parse(
            await readFile(resolve(__dirname, '../../package.json'), 'utf8')
        );
        expect(ver).toBe(packageJson.version);
    });
});