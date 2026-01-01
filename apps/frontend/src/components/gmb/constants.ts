
import { Language } from './types';

export const TRANSLATIONS = {
    en: {
        title: "GMB Competitor Intel",
        tabs: {
            search: "Smart Search",
            analysis: "Analysis & Ranking",
            audit: "Client Audit",
            report: "PDF Report",
            leads: "Leads Database",
            reviews: "Reviews",
            gsc: "Search Console",
            agency: "Agency"
        },
        leadsTab: {
            refreshBtn: "Refresh Data",
            headers: {
                name: "Business Name",
                type: "Type",
                category: "Category",
                address: "Address",
                rating: "Rating",
                date: "Discovered"
            },
            types: {
                CLIENT: "Client",
                LEAD: "Lead",
                COMPETITOR: "Competitor"
            },
            noData: "No leads found in the database yet.",
            viewMaps: "Maps"
        },
        mapTab: {
            clientAddress: "Client Address",
            radius: "Search Radius (km)",
            keywords: "Main Category / Keyword",
            products: "Products & Services (Crucial for SEO)",
            searchBtn: "Search Competitors",
            searching: "Analyzing Local Market...",
            resultsFound: "competitors found within",
            legendClient: "Client",
            legendCompetitor: "Competitor",
            placeholderAddress: "e.g., 123 Main St, New York, NY",
            placeholderKeywords: "e.g., Kiosk, Drugstore",
            placeholderProducts: "e.g., Alcohol, Hot Dogs, Coffee, Snacks, Photocopies",
            popup: {
                auditBtn: "Set as Client & Audit",
                closeBtn: "Close",
                rating: "Rating",
                reviews: "Reviews",
                score: "Weighted Score",
                viewMaps: "View on Google Maps"
            },
            noResults: "No competitors found in the selected radius.",
            errorSearch: "Error searching competitors. Check your connection.",
            found: "Found",
            competitors: "competitors"
        },
        analysisTab: {
            exportBtn: "Export to CSV",
            headers: {
                rank: "Rank",
                name: "Business Name",
                rating: "Rating (R)",
                reviews: "Reviews (v)",
                wScore: "Weighted Score",
                actions: "Details",
            },
            formulaInfo: "Weighted Score = ((v · R) + (m · C)) / (v + m)",
            variables: "m=150, C=3.9",
            noData: "No data available. Please perform a search in the Map tab first.",
            visitWeb: "Website",
            viewMaps: "Maps"
        },
        auditTab: {
            enterUrl: "Enter Client Google Maps URL (Optional)",
            analyzeBtn: "Run Full Expert Audit",
            analyzing: "Performing Deep Analysis...",
            sections: {
                compliance: "Name Policy Compliance",
                fundamentals: "Phase 1: Fundamental Health Check",
                seoKeywords: "Phase 2: Hyper-Local SEO & Keywords",
                content: "Content Strategy",
                seo: "Strategy",
                plan: "Executive Summary & Action Plan",
            },
            noData: "Please ensure competitor data is loaded for a comparative audit, or enter a client URL.",
        },
        reportTab: {
            title: "Competitive Intelligence Report",
            printBtn: "Print / Save as PDF",
            generatedOn: "Generated on",
            mapSection: "Market Geography",
            rankingSection: "Competitor Ranking",
            auditSection: "Client Audit & Strategy",
            noData: "No report data available. Please run a Search and an Audit first."
        }
    },
    es: {
        title: "Intel Competitiva GMB",
        tabs: {
            search: "Búsqueda Inteligente",
            analysis: "Análisis y Clasificación",
            audit: "Auditoría Cliente",
            report: "Reporte PDF",
            leads: "Base de Datos (Leads)",
            reviews: "Reseñas",
            gsc: "Search Console",
            agency: "Agencia"
        },
        leadsTab: {
            refreshBtn: "Actualizar Datos",
            headers: {
                name: "Nombre del Negocio",
                type: "Tipo",
                category: "Categoría",
                address: "Dirección",
                rating: "Calif.",
                date: "Descubierto"
            },
            types: {
                CLIENT: "Cliente",
                LEAD: "Lead",
                COMPETITOR: "Competidor"
            },
            noData: "No se encontraron leads en la base de datos aún.",
            viewMaps: "Maps"
        },
        mapTab: {
            clientAddress: "Dirección del Cliente",
            radius: "Radio de Búsqueda (km)",
            keywords: "Categoría Principal / Palabra Clave",
            products: "Productos y Servicios (Clave para SEO)",
            searchBtn: "Buscar Competidores",
            searching: "Analizando Mercado Local...",
            resultsFound: "competidores encontrados en",
            legendClient: "Cliente",
            legendCompetitor: "Competidor",
            placeholderAddress: "ej. Av. Reforma 222, CDMX",
            placeholderKeywords: "ej. Kiosco, Maxikiosco",
            placeholderProducts: "ej. Bebidas, Panchos, Carga Sube, Café, Golosinas",
            popup: {
                auditBtn: "Auditar como Cliente",
                closeBtn: "Cerrar",
                rating: "Calif.",
                reviews: "Reseñas",
                score: "Puntaje",
                viewMaps: "Ver en Google Maps"
            },
            noResults: "No se encontraron competidores en el radio seleccionado.",
            errorSearch: "Error al buscar competidores. Verifique la conexión.",
            found: "Encontrados",
            competitors: "competidores"
        },
        analysisTab: {
            exportBtn: "Exportar a CSV",
            headers: {
                rank: "Rango",
                name: "Nombre del Negocio",
                rating: "Calif. (R)",
                reviews: "Reseñas (v)",
                wScore: "Puntaje Ponderado",
                actions: "Detalles",
            },
            formulaInfo: "Puntaje Ponderado = ((v · R) + (m · C)) / (v + m)",
            variables: "m=150, C=3.9",
            noData: "No hay datos. Por favor realice una búsqueda en la pestaña Mapa primero.",
            visitWeb: "Sitio Web",
            viewMaps: "Maps"
        },
        auditTab: {
            enterUrl: "Ingresar URL de Google Maps del Cliente (Opcional)",
            analyzeBtn: "Ejecutar Auditoría Experta",
            analyzing: "Realizando Análisis Profundo...",
            sections: {
                compliance: "Cumplimiento de Políticas (Nombre)",
                fundamentals: "Fase 1: Chequeo Fundamental",
                seoKeywords: "Fase 2: SEO Hiper-Local y Palabras Clave",
                content: "Estrategia de Contenido",
                seo: "Estrategia",
                plan: "Resumen Ejecutivo y Plan de Acción",
            },
            noData: "Asegúrese de cargar datos de competidores para una auditoría comparativa o ingrese una URL.",
        },
        reportTab: {
            title: "Reporte de Inteligencia Competitiva",
            printBtn: "Imprimir / Guardar PDF",
            generatedOn: "Generado el",
            mapSection: "Geografía de Mercado",
            rankingSection: "Ranking de Competidores",
            auditSection: "Auditoría de Cliente y Estrategia",
            noData: "No hay datos para el reporte. Por favor ejecute una Búsqueda y una Auditoría primero."
        }
    },
};
