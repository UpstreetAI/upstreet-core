import { login } from '../../lib/login.mjs';
import { jest } from '@jest/globals';

describe('login', () => {

    it('should successfully login when valid code parameter is provided', async () => {
        const mockLoginData = {
            id: 'test-id',
            jwt: 'test-jwt'
        };
        const encodedData = Buffer.from(JSON.stringify(mockLoginData)).toString('base64');

        const result = await login({ code: encodedData });

        expect(result).toEqual({
            id: 'test-id',
            jwt: 'test-jwt'
        });
    });

    it('should reject when invalid base64 code is provided', async () => {
        const invalidCode = 'invalid-base64-!@#$';
        
        await expect(async () => {
            await login({ code: invalidCode });
        }).rejects.toThrow(SyntaxError);
    });
});
