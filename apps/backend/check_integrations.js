
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const integrations = await prisma.integration.findMany();
    console.log(JSON.stringify(integrations, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
