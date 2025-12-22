const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Updating user lucho...');

    // Check if lucho exists
    const lucho = await prisma.user.findUnique({
        where: { email: 'lucho' }
    });

    if (lucho) {
        // Update to email format
        await prisma.user.update({
            where: { email: 'lucho' },
            data: {
                email: 'lucho@formadigital.com',
                name: 'Lucho'
            }
        });
        console.log('User lucho updated to lucho@formadigital.com');
    } else {
        // Create if not exists
        const hashedPassword = await bcrypt.hash('123456', 10);
        await prisma.user.create({
            data: {
                email: 'lucho@formadigital.com',
                name: 'Lucho',
                password: hashedPassword
            }
        });
        console.log('User lucho@formadigital.com created');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
