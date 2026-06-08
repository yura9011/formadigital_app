import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

    if (instagramToken && instagramAccountId) {
        await prisma.integration.upsert({
            where: { id: 'instagram-integration-id' },
            update: { token: instagramToken, accountId: instagramAccountId },
            create: {
                id: 'instagram-integration-id',
                name: 'Forma Digital (IG)',
                provider: 'instagram',
                token: instagramToken,
                accountId: instagramAccountId,
                pictureUrl: 'https://ui-avatars.com/api/?name=Forma+Digital&background=E1306C&color=fff',
            },
        });
        console.log('Instagram integration seeded from environment');
    } else {
        console.log('Instagram integration skipped: credentials not configured');
    }

    const defaultUserPassword = process.env.DEFAULT_USER_PASSWORD;
    if (defaultUserPassword) {
        const password = await bcrypt.hash(defaultUserPassword, 10);
        const users = [
            { email: 'admin@formadigital.com', name: 'Admin' },
            { email: 'lucas@formadigital.com', name: 'Lucas' },
            { email: 'marcos@formadigital.com', name: 'Marcos' },
        ];

        for (const user of users) {
            await prisma.user.upsert({
                where: { email: user.email },
                update: { name: user.name, password },
                create: { ...user, password },
            });
        }
        console.log('Login users seeded');
    } else {
        console.log('Login users skipped: DEFAULT_USER_PASSWORD not configured');
    }

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
