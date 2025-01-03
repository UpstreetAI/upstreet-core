import { jest } from '@jest/globals';

// Mock all dependencies before importing modules
const mockGetUserIdForJwt = jest.fn();
const mockCleanDir = jest.fn();
const mockExtractZip = jest.fn();
const mockNpmInstall = jest.fn();
const mockFetch = jest.fn();

jest.unstable_mockModule('../../packages/upstreet-agent/packages/react-agents/util/jwt-utils.mjs', () => ({
    getUserIdForJwt: mockGetUserIdForJwt
}));

jest.unstable_mockModule('../../lib/directory-util.mjs', () => ({
    cleanDir: mockCleanDir
}));

jest.unstable_mockModule('../../lib/zip-util.mjs', () => ({
    extractZip: mockExtractZip
}));

jest.unstable_mockModule('../../lib/npm-util.mjs', () => ({
    npmInstall: mockNpmInstall
}));

// Import modules after mocking
const { pull } = await import('../../lib/pull.mjs');
const { aiProxyHost } = await import('../../packages/upstreet-agent/packages/react-agents/util/endpoints.mjs');

describe('pull command', () => {
    // Setup and teardown
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        global.fetch = mockFetch;
        global.console.log = jest.fn();
        global.console.warn = jest.fn();
    });

    test('should throw error if not logged in', async () => {
        const args = { _: ['agentId'] };
        const opts = { jwt: null };

        await expect(pull(args, opts)).rejects.toThrow('You must be logged in to pull.');
    });

    test('should handle successful pull with existing directory', async () => {
        // Mock setup
        mockGetUserIdForJwt.mockResolvedValue('testUserId');
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });

        const args = {
            _: ['agentId', '/test/dir'],
            force: true,
            forceNoConfirm: true,
        };
        const opts = { jwt: 'testJwt' };

        await pull(args, opts);

        // Verify calls
        expect(mockCleanDir).toHaveBeenCalledWith('/test/dir', {
            force: true,
            forceNoConfirm: true,
        });
        expect(mockExtractZip).toHaveBeenCalled();
        expect(mockNpmInstall).toHaveBeenCalledWith('/test/dir');
        expect(mockFetch).toHaveBeenCalledWith(
            `https://${aiProxyHost}/agents/agentId/source`,
            {
                headers: {
                    Authorization: 'Bearer testJwt',
                },
            }
        );
    });

    test('should skip npm install when noInstall flag is true', async () => {
        // Mock setup
        mockGetUserIdForJwt.mockResolvedValue('testUserId');
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });

        const args = {
            _: ['agentId', '/test/dir'],
            noInstall: true,
        };
        const opts = { jwt: 'testJwt' };

        await pull(args, opts);

        expect(mockNpmInstall).not.toHaveBeenCalled();
    });

    test('should handle failed fetch request', async () => {
        // Mock setup
        mockGetUserIdForJwt.mockResolvedValue('testUserId');
        mockFetch.mockResolvedValue({
            ok: false,
            text: () => Promise.resolve('Error message'),
        });
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

        const args = { _: ['agentId', '/test/dir'] };
        const opts = { jwt: 'testJwt' };

        await pull(args, opts);

        expect(console.warn).toHaveBeenCalledWith('pull request error', 'Error message');
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
    });

    test('should handle events dispatch', async () => {
        // Mock setup
        mockGetUserIdForJwt.mockResolvedValue('testUserId');
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });

        const mockDispatchEvent = jest.fn();
        const args = {
            _: ['agentId', '/test/dir'],
            events: {
                dispatchEvent: mockDispatchEvent,
            },
        };
        const opts = { jwt: 'testJwt' };

        await pull(args, opts);

        expect(mockDispatchEvent).toHaveBeenCalledWith(
            expect.any(MessageEvent)
        );
    });
});