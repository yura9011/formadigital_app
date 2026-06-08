import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
    constructor(private readonly prisma: PrismaService) { }

    @Post('login')
    async login(@Body() body: { username?: string; email?: string; password: string }) {
        const username = (body.username || body.email)?.trim().toLowerCase();
        const password = body.password;

        if (!username || !password) {
            throw new UnauthorizedException('Usuario y contraseña son requeridos');
        }

        const loginUsers: Record<string, string> = {
            admin: 'admin@formadigital.com',
            lucas: 'lucas@formadigital.com',
            marcos: 'marcos@formadigital.com',
        };
        const email = loginUsers[username];
        if (!email) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                password: true
            }
        });

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        };
    }
}
