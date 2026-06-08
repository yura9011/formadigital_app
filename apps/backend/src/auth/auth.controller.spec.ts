import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthController } from './auth.controller';

const prisma = {
    user: {
        findUnique: jest.fn(),
    },
};

describe('AuthController', () => {
    let controller: AuthController;
    let passwordHash: string;

    beforeAll(async () => {
        passwordHash = await bcrypt.hash('test-password', 4);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AuthController(prisma as any);
    });

    it('normalizes and authenticates an allowed user', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-id',
            email: 'admin@formadigital.com',
            name: 'Admin',
            password: passwordHash,
        });

        const result = await controller.login({
            email: ' Admin@FormaDigital.com ',
            password: 'test-password',
        });

        expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { email: 'admin@formadigital.com' },
        }));
        expect(result.user).toEqual({
            id: 'user-id',
            email: 'admin@formadigital.com',
            name: 'Admin',
        });
    });

    it('rejects users outside the login allowlist', async () => {
        await expect(controller.login({
            email: 'otro@formadigital.com',
            password: 'test-password',
        })).rejects.toBeInstanceOf(UnauthorizedException);

        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects an invalid password without identifying the cause', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-id',
            email: 'lucas@formadigital.com',
            name: 'Lucas',
            password: passwordHash,
        });

        await expect(controller.login({
            email: 'lucas@formadigital.com',
            password: 'wrong-password',
        })).rejects.toThrow('Credenciales inválidas');
    });
});
