import { jest } from '@jest/globals';

// We need to mock before importing the module that uses it
const mockGetLoginJwt = jest.fn();
jest.unstable_mockModule('../../util/login-util.mjs', () => ({
  getLoginJwt: mockGetLoginJwt
}));

// Import after mocking
const { logout } = await import('../../lib/login.mjs');

describe('logout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when jwt exists', async () => {
        mockGetLoginJwt.mockResolvedValue('mock-jwt-token');
        
        const result = await logout({});
        
        expect(result).toBe(true);
        expect(mockGetLoginJwt).toHaveBeenCalledTimes(1);
    });

    it('should return false when jwt is empty', async () => {
        mockGetLoginJwt.mockResolvedValue('');

        const result = await logout({});

        expect(result).toBe(false);
        expect(mockGetLoginJwt).toHaveBeenCalledTimes(1);
    });

    it('should return false when jwt is null', async () => {
        mockGetLoginJwt.mockResolvedValue(null);

        const result = await logout({});

        expect(result).toBe(false);
        expect(mockGetLoginJwt).toHaveBeenCalledTimes(1);
    });

    it('should return false when jwt is undefined', async () => {
        const result = await logout({});

        expect(result).toBe(false);
        expect(mockGetLoginJwt).toHaveBeenCalledTimes(1);
    });

    it('should handle rejected jwt promise', async () => {
        mockGetLoginJwt.mockRejectedValue(new Error('Failed to get JWT'));

        await expect(logout({})).rejects.toThrow('Failed to get JWT');
        expect(mockGetLoginJwt).toHaveBeenCalledTimes(1);
    });
});