const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('123456', 10);

    const email = 'lucho@formadigital.com';

    // Upsert Lucho
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name: 'Lucho',
            password: hashedPassword
        },
        create: {
            email,
            name: 'Lucho',
            password: hashedPassword
        }
    });

    console.log('User upserted:', user);

    // Clean up old 'lucho' non-email user if exists
    try {
        await prisma.user.delete({
            where: { email: 'lucho' }
        });
        console.log('Old "lucho" user deleted');
    } catch (e) {
        // Ignore if not found
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
