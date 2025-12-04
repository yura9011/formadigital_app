
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const integrations = await prisma.integration.findMany();
    console.log('--- INTEGRATIONS ---');
    integrations.forEach(int => {
        console.log(`ID: ${int.id}`);
        console.log(`Name: ${int.name}`);
        console.log(`Provider: ${int.provider}`);
        console.log(`AccountID: ${int.accountId}`);
        console.log('--------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
