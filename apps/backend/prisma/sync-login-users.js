const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const plainPassword = process.env.LOGIN_USER_PASSWORD;
    if (!plainPassword) {
        throw new Error('LOGIN_USER_PASSWORD is required');
    }

    const password = await bcrypt.hash(plainPassword, 10);
    const legacyLucas = await prisma.user.findUnique({
        where: { email: 'lucho@formadigital.com' },
    });
    const currentLucas = await prisma.user.findUnique({
        where: { email: 'lucas@formadigital.com' },
    });

    if (legacyLucas && !currentLucas) {
        await prisma.user.update({
            where: { email: legacyLucas.email },
            data: { email: 'lucas@formadigital.com', name: 'Lucas', password },
        });
    }

    for (const user of [
        { email: 'admin@formadigital.com', name: 'Admin' },
        { email: 'lucas@formadigital.com', name: 'Lucas' },
        { email: 'marcos@formadigital.com', name: 'Marcos' },
    ]) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: { name: user.name, password },
            create: { ...user, password },
        });
    }

    console.log('Login users synchronized');
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
