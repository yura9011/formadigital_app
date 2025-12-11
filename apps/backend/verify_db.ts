import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const total = await prisma.client.count();
    const leads = await prisma.client.count({ where: { type: 'LEAD' } });
    const clients = await prisma.client.count({ where: { type: 'CLIENT' } });
    const competitors = await prisma.client.count({ where: { type: 'COMPETITOR' } });

    console.log('--- Database Persistence Verification ---');
    console.log(`Total Records: ${total}`);
    console.log(`Leads: ${leads}`);
    console.log(`Clients: ${clients}`);
    console.log(`Competitors: ${competitors}`);

    const sample = await prisma.client.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
    console.log('--- Latest 3 Entries ---');
    console.log(JSON.stringify(sample, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
