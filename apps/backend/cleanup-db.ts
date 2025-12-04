
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Deleting mock-integration-id...');
    try {
        await prisma.integration.delete({
            where: { id: 'mock-integration-id' }
        });
        console.log('Deleted mock-integration-id');
    } catch (e) {
        console.log('mock-integration-id not found or already deleted');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
