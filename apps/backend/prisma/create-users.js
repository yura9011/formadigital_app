const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hash = await bcrypt.hash('123456', 10);

    // Create Lucas
    const lucas = await prisma.user.upsert({
        where: { email: 'lucas@formadigital.com' },
        update: {},
        create: {
            email: 'lucas@formadigital.com',
            password: hash,
            name: 'Lucas'
        }
    });
    console.log('Created Lucas:', lucas.id);

    // Create Nahuel
    const nahuel = await prisma.user.upsert({
        where: { email: 'nahuel@formadigital.com' },
        update: {},
        create: {
            email: 'nahuel@formadigital.com',
            password: hash,
            name: 'Nahuel'
        }
    });
    console.log('Created Nahuel:', nahuel.id);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
