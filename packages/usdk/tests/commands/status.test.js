import { jest } from '@jest/globals';

// Mock dependencies before importing the module that uses them
const mockGetUserIdForJwt = jest.fn();
const mockSupabaseStorage = jest.fn();

jest.unstable_mockModule('../../packages/upstreet-agent/packages/react-agents/util/jwt-utils.mjs', () => ({
  getUserIdForJwt: mockGetUserIdForJwt
}));

jest.unstable_mockModule('../../packages/upstreet-agent/packages/react-agents/storage/supabase-storage.mjs', () => ({
  SupabaseStorage: mockSupabaseStorage
}));

// Import after mocking
const { status } = await import('../../lib/status.mjs');

describe('status', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('throws error when no JWT provided', async () => {
        await expect(status({}, {})).rejects.toThrow('not logged in');
    });

    test('returns user and wearing data when user has active asset', async () => {
        const mockJwt = 'mock-jwt';
        const mockUserId = 'user-123';
        const mockUserData = {
            id: mockUserId,
            active_asset: 'asset-123',
        };
        const mockAssetData = {
            id: 'asset-123',
            type: 'npc',
            name: 'Test Avatar',
        };

        mockGetUserIdForJwt.mockResolvedValue(mockUserId);

        const mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
        };

        mockSupabaseStorage.mockImplementation(() => mockSupabase);

        mockSupabase.maybeSingle
            .mockResolvedValueOnce({ error: null, data: mockUserData })
            .mockResolvedValueOnce({ error: null, data: mockAssetData });

        const result = await status({}, { jwt: mockJwt });

        expect(result).toEqual({
            user: mockUserData,
            wearing: mockAssetData,
        });
        expect(mockGetUserIdForJwt).toHaveBeenCalledWith(mockJwt);
        expect(mockSupabaseStorage).toHaveBeenCalledWith({ jwt: mockJwt });
    });

    test('returns only user data when user has no active asset', async () => {
        const mockJwt = 'mock-jwt';
        const mockUserId = 'user-123';
        const mockUserData = {
            id: mockUserId,
            active_asset: null,
        };

        mockGetUserIdForJwt.mockResolvedValue(mockUserId);

        const mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
        };

        mockSupabaseStorage.mockImplementation(() => mockSupabase);
        mockSupabase.maybeSingle.mockResolvedValueOnce({ error: null, data: mockUserData });

        const result = await status({}, { jwt: mockJwt });

        expect(result).toEqual({
            user: mockUserData,
            wearing: null,
        });
    });

    test('throws error when account query fails', async () => {
        const mockJwt = 'mock-jwt';
        const mockUserId = 'user-123';
        const mockError = 'Database error';

        mockGetUserIdForJwt.mockResolvedValue(mockUserId);

        const mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
        };

        mockSupabaseStorage.mockImplementation(() => mockSupabase);
        mockSupabase.maybeSingle.mockResolvedValueOnce({ error: mockError, data: null });

        await expect(status({}, { jwt: mockJwt }))
            .rejects
            .toThrow(`could not get account ${mockUserId}: ${mockError}`);
    });
});