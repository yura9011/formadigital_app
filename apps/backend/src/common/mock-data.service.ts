import { Injectable } from '@nestjs/common';

/**
 * Mock data service for development without real Google API access
 * Provides realistic sample data for GBP locations, reviews, and GSC analytics
 */
@Injectable()
export class MockDataService {

    /**
     * Mock GBP Locations
     */
    getMockLocations() {
        return [
            {
                id: 'loc-1',
                accountId: 'account-mock-001',
                locationId: 'ChIJ1234567890',
                name: 'Forma Digital - Headquarters',
                address: 'Av. Corrientes 1234, CABA, Buenos Aires',
                phone: '+54 11 4567-8901',
                rating: 4.7,
                reviewCount: 128,
                categories: ['Agencia de Marketing Digital', 'Consultoría SEO'],
                websiteUrl: 'https://formadigital.com',
                state: 'VERIFIED',
            },
            {
                id: 'loc-2',
                accountId: 'account-mock-001',
                locationId: 'ChIJ0987654321',
                name: 'Forma Digital - Zona Norte',
                address: 'Av. del Libertador 5678, Vicente López, Buenos Aires',
                phone: '+54 11 4321-0987',
                rating: 4.5,
                reviewCount: 45,
                categories: ['Agencia de Marketing Digital'],
                websiteUrl: 'https://formadigital.com',
                state: 'VERIFIED',
            },
            {
                id: 'loc-3',
                accountId: 'account-mock-002',
                locationId: 'ChIJ5555555555',
                name: 'Cliente Demo - Cafetería Luna',
                address: 'Calle Florida 234, CABA, Buenos Aires',
                phone: '+54 11 5555-1234',
                rating: 4.2,
                reviewCount: 312,
                categories: ['Cafetería', 'Restaurante'],
                websiteUrl: 'https://cafelunademo.com',
                state: 'VERIFIED',
            },
        ];
    }

    /**
     * Mock GBP Reviews with varied ratings and response statuses
     */
    getMockReviews(locationId?: string) {
        const allReviews = [
            {
                reviewId: 'rev-001',
                locationId: 'ChIJ1234567890',
                reviewer: {
                    displayName: 'María González',
                    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Maria+Gonzalez&background=random',
                },
                starRating: 5,
                comment: 'Excelente servicio! Me ayudaron a posicionar mi negocio en Google y ahora recibo muchos más clientes. El equipo es muy profesional y siempre están disponibles para responder consultas.',
                createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                updateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                reviewReply: {
                    comment: 'Muchas gracias María! Es un placer trabajar contigo. 🙌',
                    updateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                },
            },
            {
                reviewId: 'rev-002',
                locationId: 'ChIJ1234567890',
                reviewer: {
                    displayName: 'Carlos Rodríguez',
                    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=random',
                },
                starRating: 4,
                comment: 'Muy buen trabajo en general. La comunicación podría ser un poco más frecuente pero los resultados hablan por sí solos.',
                createTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                updateTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                reviewReply: null, // Not replied yet
            },
            {
                reviewId: 'rev-003',
                locationId: 'ChIJ1234567890',
                reviewer: {
                    displayName: 'Ana Martínez',
                    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Ana+Martinez&background=random',
                },
                starRating: 5,
                comment: 'Los mejores en SEO local. Llevamos 6 meses trabajando juntos y mi visibilidad aumentó un 300%! Super recomendados.',
                createTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                updateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                reviewReply: {
                    comment: 'Ana, gracias por confiar en nosotros! Seguimos trabajando para superar esos números 📈',
                    updateTime: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
                },
            },
            {
                reviewId: 'rev-004',
                locationId: 'ChIJ1234567890',
                reviewer: {
                    displayName: 'Roberto Sánchez',
                    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Roberto+Sanchez&background=random',
                },
                starRating: 2,
                comment: 'Los resultados tardaron más de lo prometido. Esperaba ver mejoras en 2 meses y recién a los 4 meses empezó a funcionar.',
                createTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                updateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                reviewReply: null, // Needs urgent response
            },
            {
                reviewId: 'rev-005',
                locationId: 'ChIJ1234567890',
                reviewer: {
                    displayName: 'Laura Fernández',
                    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Laura+Fernandez&background=random',
                },
                starRating: 5,
                comment: 'Increíble atención al cliente! Resolvieron todas mis dudas y el proceso fue muy transparente.',
                createTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                updateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                reviewReply: null,
            },
            {
                reviewId: 'rev-006',
                locationId: 'ChIJ5555555555',
                reviewer: {
                    displayName: 'Diego López',
                    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Diego+Lopez&background=random',
                },
                starRating: 4,
                comment: 'El café está buenísimo y la atención es excelente. Un lugar muy acogedor para trabajar.',
                createTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                updateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                reviewReply: null,
            },
            {
                reviewId: 'rev-007',
                locationId: 'ChIJ5555555555',
                reviewer: {
                    displayName: 'Sofía Ruiz',
                    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Sofia+Ruiz&background=random',
                },
                starRating: 1,
                comment: 'Pedí un café con leche y me trajeron un cortado. Cuando lo reclamé, el mozo fue muy grosero.',
                createTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
                updateTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                reviewReply: null, // URGENT!
            },
        ];

        if (locationId) {
            return allReviews.filter(r => r.locationId === locationId);
        }
        return allReviews;
    }

    /**
     * Mock GSC Properties
     */
    getMockGscProperties() {
        return [
            {
                siteUrl: 'sc-domain:formadigital.com',
                permissionLevel: 'siteOwner',
            },
            {
                siteUrl: 'https://formadigital.com/',
                permissionLevel: 'siteOwner',
            },
            {
                siteUrl: 'sc-domain:cafelunademo.com',
                permissionLevel: 'siteFullUser',
            },
        ];
    }

    /**
     * Mock GSC Search Analytics
     */
    getMockSearchAnalytics(siteUrl: string, days: number = 28) {
        const queries = [
            { query: 'agencia seo buenos aires', clicks: 245, impressions: 3420, ctr: 0.0716, position: 3.2 },
            { query: 'marketing digital argentina', clicks: 189, impressions: 4890, ctr: 0.0387, position: 5.1 },
            { query: 'posicionamiento google', clicks: 156, impressions: 2340, ctr: 0.0667, position: 4.7 },
            { query: 'seo local', clicks: 134, impressions: 1890, ctr: 0.0709, position: 2.8 },
            { query: 'google my business optimizacion', clicks: 98, impressions: 1234, ctr: 0.0794, position: 2.1 },
            { query: 'consultoria seo', clicks: 87, impressions: 2100, ctr: 0.0414, position: 6.3 },
            { query: 'como aparecer en google maps', clicks: 76, impressions: 890, ctr: 0.0854, position: 1.9 },
            { query: 'agencia marketing caba', clicks: 65, impressions: 1560, ctr: 0.0417, position: 4.2 },
        ];

        const pages = [
            { page: `${siteUrl.replace('sc-domain:', 'https://')}/servicios/seo-local`, clicks: 312, impressions: 4500, ctr: 0.0693, position: 3.1 },
            { page: `${siteUrl.replace('sc-domain:', 'https://')}/`, clicks: 289, impressions: 5200, ctr: 0.0556, position: 4.8 },
            { page: `${siteUrl.replace('sc-domain:', 'https://')}/blog/guia-google-business`, clicks: 198, impressions: 2800, ctr: 0.0707, position: 2.4 },
            { page: `${siteUrl.replace('sc-domain:', 'https://')}/contacto`, clicks: 145, impressions: 1200, ctr: 0.1208, position: 1.2 },
        ];

        // Generate daily data for the chart
        const dailyData = [];
        for (let i = days; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const baseClicks = Math.floor(Math.random() * 50) + 30;
            const baseImpressions = baseClicks * (Math.floor(Math.random() * 15) + 10);
            dailyData.push({
                date: date.toISOString().split('T')[0],
                clicks: baseClicks,
                impressions: baseImpressions,
                ctr: baseClicks / baseImpressions,
                position: Math.random() * 5 + 2,
            });
        }

        return {
            summary: {
                totalClicks: queries.reduce((acc, q) => acc + q.clicks, 0),
                totalImpressions: queries.reduce((acc, q) => acc + q.impressions, 0),
                averageCtr: 0.058,
                averagePosition: 3.9,
            },
            queries,
            pages,
            dailyData,
        };
    }

    /**
     * Generate AI response suggestion for a review
     */
    generateReviewResponseSuggestion(review: any): string {
        const positive = review.starRating >= 4;
        const neutral = review.starRating === 3;

        if (positive) {
            return `¡Muchas gracias por tus palabras, ${review.reviewer.displayName.split(' ')[0]}! 🙌 Nos alegra saber que tu experiencia fue positiva. ¡Esperamos verte pronto!`;
        } else if (neutral) {
            return `Gracias por tu feedback, ${review.reviewer.displayName.split(' ')[0]}. Valoramos tu opinión y trabajamos constantemente para mejorar. ¿Hay algo específico en lo que podamos ayudarte?`;
        } else {
            return `Lamentamos mucho tu experiencia, ${review.reviewer.displayName.split(' ')[0]}. Esto no refleja el servicio que queremos brindar. Por favor, contáctanos directamente para resolver esta situación. Tu satisfacción es nuestra prioridad.`;
        }
    }
}
