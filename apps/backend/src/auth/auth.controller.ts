import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
    constructor(private readonly prisma: PrismaService) { }

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        const { email, password } = body;

        if (!email || !password) {
            throw new UnauthorizedException('Email y contraseña son requeridos');
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
            throw new UnauthorizedException('Usuario no encontrado');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new UnauthorizedException('Contraseña incorrecta');
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
