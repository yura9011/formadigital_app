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

    // Seed Default Message Templates for Prospecting
    console.log('Seeding default message templates...');

    const defaultTemplates = [
        {
            id: 'default-instagram-sin-sitio',
            name: 'Instagram - Sin Sitio Web',
            channel: 'instagram',
            scenario: 'sin_sitio',
            content: `Hola! 👋 Vi que {nombre_negocio} tiene excelentes reseñas pero noté que no tienen página web.

En {mi_empresa} ayudamos a negocios como el tuyo a tener presencia digital profesional.

¿Te interesaría saber más?`,
            isDefault: true,
        },
        {
            id: 'default-instagram-general',
            name: 'Instagram - General',
            channel: 'instagram',
            scenario: 'general',
            content: `Hola! 👋 Soy {mi_nombre} de {mi_empresa}.

Vi {nombre_negocio} en Google Maps y me pareció muy interesante. {oportunidad}

¿Te gustaría que conversemos sobre cómo podemos ayudarte a crecer online?`,
            isDefault: true,
        },
        {
            id: 'default-whatsapp-sin-sitio',
            name: 'WhatsApp - Sin Sitio Web',
            channel: 'whatsapp',
            scenario: 'sin_sitio',
            content: `Hola! Soy {mi_nombre} de {mi_empresa}.

Vi {nombre_negocio} en Google Maps y noté que no tienen página web. Hoy en día es fundamental para que los clientes te encuentren.

¿Te interesaría saber cómo podemos ayudarte?`,
            isDefault: true,
        },
        {
            id: 'default-whatsapp-general',
            name: 'WhatsApp - General',
            channel: 'whatsapp',
            scenario: 'general',
            content: `Hola! Soy {mi_nombre} de {mi_empresa}.

Vi {nombre_negocio} en Google Maps y me pareció interesante. {oportunidad}

¿Tendrías unos minutos para conversar sobre cómo podríamos ayudarte a mejorar tu presencia digital?`,
            isDefault: true,
        },
        {
            id: 'default-email-sin-sitio',
            name: 'Email - Sin Sitio Web',
            channel: 'email',
            scenario: 'sin_sitio',
            content: `Asunto: Oportunidad digital para {nombre_negocio}

Hola,

Mi nombre es {mi_nombre} de {mi_empresa}. Encontré {nombre_negocio} en Google Maps y noté que actualmente no cuentan con un sitio web.

En la era digital, tener presencia online es fundamental para que los clientes te encuentren y confíen en tu negocio.

Me encantaría conversar sobre cómo podemos ayudarles a dar ese paso.

¿Tendrían disponibilidad para una llamada breve esta semana?

Saludos,
{mi_nombre}
{mi_empresa}`,
            isDefault: true,
        },
        {
            id: 'default-email-rating-bajo',
            name: 'Email - Rating Bajo',
            channel: 'email',
            scenario: 'rating_bajo',
            content: `Asunto: Mejora tu reputación online - {nombre_negocio}

Hola,

Mi nombre es {mi_nombre} de {mi_empresa}. Encontré {nombre_negocio} mientras investigaba negocios en la zona.

Noté que tienen algunas reseñas que podrían estar afectando la percepción de nuevos clientes. La buena noticia es que hay estrategias efectivas para mejorar la reputación online.

¿Te interesaría saber cómo podemos ayudarte a gestionar mejor tus reseñas y atraer más clientes satisfechos?

Saludos,
{mi_nombre}
{mi_empresa}`,
            isDefault: true,
        },
        {
            id: 'default-email-general',
            name: 'Email - General',
            channel: 'email',
            scenario: 'general',
            content: `Asunto: Oportunidad para {nombre_negocio}

Hola,

Mi nombre es {mi_nombre} de {mi_empresa}. Encontré {nombre_negocio} mientras investigaba negocios en la zona y noté algunas oportunidades de mejora en su presencia digital.

{oportunidad}

Me encantaría conversar sobre cómo podríamos ayudarles a mejorar su visibilidad online y atraer más clientes.

¿Tendrían disponibilidad para una llamada breve esta semana?

Saludos,
{mi_nombre}
{mi_empresa}`,
            isDefault: true,
        },
    ];

    for (const template of defaultTemplates) {
        await prisma.messageTemplate.upsert({
            where: { id: template.id },
            update: {
                name: template.name,
                channel: template.channel,
                scenario: template.scenario,
                content: template.content,
                isDefault: template.isDefault,
            },
            create: {
                id: template.id,
                name: template.name,
                channel: template.channel,
                scenario: template.scenario,
                content: template.content,
                isDefault: template.isDefault,
                userId: null, // Global template
            },
        });
        console.log(`Created/Updated template: ${template.name}`);
    }

    console.log('Default templates seeded successfully!');
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
