import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const integration = await prisma.integration.upsert({
        where: { id: 'instagram-integration-id' },
        update: {
            token: 'EAAY5Q48HeSIBQIfrm1y8PsElvKyuD7m0f9EQpnCfZC7CklotunZBbeDlPPtDTWOPbUt7g9m89S0GXXJXtXtNa9iuMUi73KWGdfKx9BQgzghEwBdcB1Mfqc66SSvXaZBY5ZBD8iwAlQFlX9ABZBZAeQT7UQ6ug4qokyPDLJiNfZCKSsqlqg1eiHVaR8KRLcU1FLs8OZA6zNu2nspKtvm0zczSU1srBZAcHZCCl5Jw4hxQva0IPZCtGpZAFsE5lDscZCNcZCcRnIjXryAStcTyffPhBVYF95pC1e',
            accountId: '17841478314190915',
        },
        create: {
            id: 'instagram-integration-id',
            name: 'Forma Digital (IG)',
            provider: 'instagram',
            token: 'EAAY5Q48HeSIBQIfrm1y8PsElvKyuD7m0f9EQpnCfZC7CklotunZBbeDlPPtDTWOPbUt7g9m89S0GXXJXtXtNa9iuMUi73KWGdfKx9BQgzghEwBdcB1Mfqc66SSvXaZBY5ZBD8iwAlQFlX9ABZBZAeQT7UQ6ug4qokyPDLJiNfZCKSsqlqg1eiHVaR8KRLcU1FLs8OZA6zNu2nspKtvm0zczSU1srBZAcHZCCl5Jw4hxQva0IPZCtGpZAFsE5lDscZCNcZCcRnIjXryAStcTyffPhBVYF95pC1e',
            accountId: '17841478314190915',
            pictureUrl: 'https://ui-avatars.com/api/?name=Forma+Digital&background=E1306C&color=fff',
        },
    });

    console.log({ integration });

    // Seed Admin User
    // Password: admin123
    const adminHash = '$2b$10$UWT.8.iVQtyygmhoKMFy5eUDkpHvnqCSF7lxpnGxn3VMTg4kmxvVO';

    const user = await prisma.user.upsert({
        where: { email: 'admin@formadigital.com' },
        update: {
            password: adminHash,
        },
        create: {
            email: 'admin@formadigital.com',
            name: 'Admin User',
            password: adminHash,
        },
    });
    console.log({ user });

    // Seed Lucho User
    // Password: 123456
    const luchoHash = '$2b$10$cW.6umaP49vlGkcJFe5VLewt0z7d/nu8GuHFAokjk43p6BSPcLDdu';

    const luchoUser = await prisma.user.upsert({
        where: { email: 'lucho@formadigital.com' },
        update: {
            password: luchoHash,
        },
        create: {
            email: 'lucho@formadigital.com',
            name: 'Lucho',
            password: luchoHash,
        },
    });
    console.log({ luchoUser });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
