import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
    constructor(private readonly prisma: PrismaService) { }

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        const email = body.email?.trim().toLowerCase();
        const password = body.password;

        if (!email || !password) {
            throw new UnauthorizedException('Email y contraseña son requeridos');
        }

        const allowedEmails = new Set([
            'admin@formadigital.com',
            'lucas@formadigital.com',
            'marcos@formadigital.com',
        ]);
        if (!allowedEmails.has(email)) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Find user by email
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

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Return user data (without password)
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
