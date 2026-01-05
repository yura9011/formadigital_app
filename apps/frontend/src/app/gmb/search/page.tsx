'use client';

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Business, Language, AuditResult, SearchParams } from '@/components/gmb/types';
import { TabLoadingSkeleton } from '@/components/neo/TabLoadingSkeleton';
import AgentAnalysisButton from '@/components/gmb/AgentAnalysisButton';
import ApiKeySettings from '@/components/gmb/ApiKeySettings';
import { Harv3stConnectionStatus } from '@/services/harv3st';

// Dynamic imports for heavy components - only load when tab is active
const SearchTab = dynamic(() => import('@/components/gmb/SearchTab'), {
    ssr: false,
    loading: () => <TabLoadingSkeleton label="B├║squeda" />
});

const AnalysisTab = dynamic(() => import('@/components/gmb/AnalysisTab'), {
    ssr: false,
    loading: () => <TabLoadingSkeleton label="An├ílisis" />
});

const AuditTab = dynamic(() => import('@/components/gmb/AuditTab'), {
    ssr: false,
    loading: () => <TabLoadingSkeleton label="Auditor├¡a" />
});

const ReportTab = dynamic(() => import('@/components/gmb/ReportTab'), {
    ssr: false,
    loading: () => <TabLoadingSkeleton label="Reporte" />
});

type TabType = 'search' | 'analysis' | 'audit' | 'report';

const STEPS: { id: TabType; label: string; icon: string }[] = [
    { id: 'search', label: 'Buscar', icon: '­ƒöì' },
    { id: 'analysis', label: 'Analizar', icon: '­ƒôè' },
    { id: 'audit', label: 'Auditar', icon: '­ƒÄ»' },
    { id: 'report', label: 'Reporte', icon: '­ƒôä' }
];

export default function GmbPage() {
    const [activeTab, setActiveTab] = useState<TabType>('search');
    const language: Language = 'es';

    const [searchParams, setSearchParams] = useState<SearchParams>({
        address: 'Av Amadeo Sabattini 2000, C├│rdoba',
        radius: 1.0,
        keywords: 'Kiosco',
        products: ''
    });

    const [businessData, setBusinessData] = useState<Business[]>([]);
    const [client, setClient] = useState<Business | undefined>(undefined);
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

    // Harv3st state
    const [harv3stStatus, setHarv3stStatus] = useState<Harv3stConnectionStatus>('checking');

    // New state for API Keys
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [apiKeys, setApiKeys] = useState<{
        GEMINI_API_KEY?: string;
        OPENROUTER_API_KEY?: string;
        SERPAPI_API_KEY?: string;
    }>({});

    // Memoized tab state - only recalculates when dependencies actually change
    const tabState = useMemo(() => ({
        hasSearchData: businessData.length > 0,
        hasClient: client !== undefined,
        hasAudit: auditResult !== null,
    }), [businessData.length, client, auditResult]);

    const isTabEnabled = useCallback((tab: TabType): boolean => {
        switch (tab) {
            case 'search': return true;
            case 'analysis': return tabState.hasSearchData;
            case 'audit': return tabState.hasSearchData && tabState.hasClient;
            case 'report': return tabState.hasSearchData && tabState.hasClient && tabState.hasAudit;
        }
    }, [tabState]);

    const getTabHint = (tab: TabType): string | null => {
        if (isTabEnabled(tab)) return null;
        switch (tab) {
            case 'analysis': return 'Primero busc├í y seleccion├í negocios';
            case 'audit': return 'Primero seleccion├í un negocio como cliente';
            case 'report': return 'Primero ejecut├í la auditor├¡a';
            default: return null;
        }
    };

    // Handle transfer from Search to Analysis
    const handleTransferToAnalysis = (businesses: Business[]) => {
        if (businesses.length > 0) {
            setBusinessData(businesses);
            setClient(businesses[0]);
            setBusinessData(prev => prev.map((b, i) => ({ ...b, isClient: i === 0 })));
            setActiveTab('analysis');
        }
    };

    const currentStepIndex = STEPS.findIndex(s => s.id === activeTab);

    const handleTabClick = (tab: TabType) => {
        if (isTabEnabled(tab)) {
            setActiveTab(tab);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            <ApiKeySettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={setApiKeys}
                initialKeys={apiKeys}
            />

            {/* Help Instructions Modal */}
            {isHelpOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsHelpOpen(false)}>
                    <div
                        className="bg-white border-4 border-neo-border shadow-neo-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-neo-blue text-white p-4 border-b-4 border-neo-border">
                            <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                                <span className="text-3xl">­ƒôû</span> C├│mo Usar Esta Herramienta
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="border-2 border-neo-border p-4 bg-green-50">
                                <h3 className="font-black text-lg uppercase mb-2">­ƒù║´©Å Paso 1: Buscar Competidores</h3>
                                <p className="text-gray-700">Ingresa tu <strong>direcci├│n</strong>, <strong>radio de b├║squeda</strong> y <strong>palabras clave</strong> (ej: "Kiosco", "Restaurante").</p>
                                <p className="text-gray-600 text-sm mt-2">­ƒÆí Resultado: Ver├ís un mapa con todos los negocios cercanos.</p>
                            </div>

                            <div className="border-2 border-neo-border p-4 bg-blue-50">
                                <h3 className="font-black text-lg uppercase mb-2">­ƒôè Paso 2: Seleccionar Cliente</h3>
                                <p className="text-gray-700">Haz clic en el negocio que quieres analizar como <strong>tu cliente</strong>.</p>
                                <p className="text-gray-600 text-sm mt-2">­ƒÆí Resultado: Se habilitar├í la pesta├▒a de Auditor├¡a.</p>
                            </div>

                            <div className="border-2 border-neo-border p-4 bg-purple-50">
                                <h3 className="font-black text-lg uppercase mb-2">­ƒöì Paso 3: Ejecutar Auditor├¡a IA</h3>
                                <p className="text-gray-700">Presiona "<strong>Ejecutar Auditor├¡a Experta</strong>" y espera ~30 segundos.</p>
                                <p className="text-gray-600 text-sm mt-2">­ƒÆí Resultado: An├ílisis SWOT, Plan de Acci├│n, Score de Oportunidad.</p>
                            </div>

                            <div className="border-2 border-neo-border p-4 bg-yellow-50">
                                <h3 className="font-black text-lg uppercase mb-2">­ƒôä Paso 4: Generar Reporte</h3>
                                <p className="text-gray-700">Ve a la pesta├▒a "Reporte" y descarga el <strong>PDF profesional</strong>.</p>
                                <p className="text-gray-600 text-sm mt-2">­ƒÆí Usa este PDF para presentar a tu cliente potencial.</p>
                            </div>

                            <div className="border-l-4 border-neo-blue pl-4 py-2 bg-gray-50">
                                <p className="font-bold">ÔÜí Pro Tip:</p>
                                <p className="text-gray-600">Configura tus API Keys (­ƒöæ) para activar el an├ílisis con IA real de Gemini.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t-2 border-neo-border bg-gray-100">
                            <button
                                onClick={() => setIsHelpOpen(false)}
                                className="w-full bg-neo-blue text-white py-3 font-black uppercase border-2 border-neo-border shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                            >
                                ┬íEntendido, Comenzar!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="mb-6 flex justify-between items-center border-b-4 border-neo-border pb-4">
                <div className="flex items-center gap-4">
                    {/* ... (existing logo/title) */}
                    <button
                        onClick={() => window.location.href = '/'}
                        className="bg-white border-2 border-neo-border shadow-neo px-4 py-2 font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all"
                    >
                        ÔåÉ Inicio
                    </button>
                    <div className="flex items-center gap-2">
                        {/* ... */}
                        <div className="bg-green-500 text-white p-2 border-2 border-neo-border shadow-neo-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
                            </svg>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic text-neo-text">
                            An├ílisis Local GMB
                        </h1>
                        {/* Help Button with pulse animation */}
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="relative bg-neo-orange text-white p-2 border-2 border-neo-border shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                            title="Ver instrucciones"
                        >
                            <span className="text-xl">ÔØô</span>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-yellow opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-neo-yellow"></span>
                            </span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Leads CRM Button */}
                    <button
                        onClick={() => window.location.href = '/gmb/leads'}
                        className="bg-neo-yellow text-black px-4 py-2 border-2 border-neo-border shadow-neo font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                        title="Ver Leads Guardados"
                    >
                        ­ƒôï Leads
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 bg-gray-200 hover:bg-gray-300 border-2 border-neo-border shadow-neo transition-all rounded"
                        title="Configurar API Keys"
                    >
                        ­ƒöæ
                    </button>

                    {/* Agent Analysis Button */}
                    <AgentAnalysisButton
                        query={searchParams.keywords}
                        location={searchParams.address}
                        apiKeys={apiKeys}
                        onComplete={(result) => {
                            console.log('Ô£à Agent analysis complete:', result);
                            if (result.success && result.clients) {
                                // Map agent results to frontend Business interface
                                const enrichedClients: Business[] = result.clients.map((c: any) => ({
                                    id: c.placeId || Math.random().toString(36).substr(2, 9),
                                    name: c.name,
                                    address: c.address,
                                    rating: c.rating,
                                    reviews: c.reviewCount,
                                    category: c.category,
                                    website: c.website,
                                    phone: c.phone,
                                    latitude: c.latitude,
                                    longitude: c.longitude,
                                    placeId: c.placeId,
                                    isClient: false,
                                    // Add enriched fields
                                    email: c.email,
                                    instagram: c.instagram,
                                    facebook: c.facebook,
                                    tier: c.tier,
                                    score: c.score,
                                    summary: c.summary,
                                    gaps: c.gaps,
                                    enrichedAt: c.enrichedAt
                                }));

                                setBusinessData(enrichedClients);

                                // Auto-select first client if none selected
                                if (enrichedClients.length > 0) {
                                    setClient(enrichedClients[0]);
                                    setBusinessData(prev => prev.map((p, i) => i === 0 ? { ...p, isClient: true } : p));
                                }

                                // Switch to Analysis tab to show results
                                setActiveTab('analysis');
                            }
                        }}
                    />
                </div>
            </header>

            {/* Step Indicator */}
            <div className="mb-6">
                <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                    {STEPS.map((step, index) => {
                        const enabled = isTabEnabled(step.id);
                        const active = activeTab === step.id;
                        const completed = currentStepIndex > index;
                        const hint = getTabHint(step.id);

                        return (
                            <div key={step.id} className="flex items-center">
                                <button
                                    onClick={() => handleTabClick(step.id)}
                                    disabled={!enabled}
                                    title={hint || undefined}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 border-2 border-neo-border font-black uppercase text-sm transition-all
                                        ${active ? 'bg-neo-blue text-white shadow-neo translate-x-[-2px] translate-y-[-2px]' : ''}
                                        ${completed && !active ? 'bg-green-400 text-black' : ''}
                                        ${!enabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60' : 'hover:bg-gray-100 cursor-pointer'}
                                        ${enabled && !active && !completed ? 'bg-white' : ''}
                                    `}
                                >
                                    <span className="text-lg">{completed && !active ? 'Ô£ô' : step.icon}</span>
                                    <span className="hidden md:inline">Paso {index + 1}: {step.label}</span>
                                    <span className="md:hidden">{index + 1}</span>
                                </button>
                                {index < STEPS.length - 1 && (
                                    <div className={`w-8 h-1 mx-1 ${completed ? 'bg-green-400' : 'bg-gray-300'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <main className="flex-1 w-full mx-auto">
                <div className="h-full">
                    {activeTab === 'search' && (
                        <SearchTab
                            language={language}
                            harv3stStatus={harv3stStatus}
                            setHarv3stStatus={setHarv3stStatus}
                            onTransferToAnalysis={handleTransferToAnalysis}
                            searchParams={searchParams}
                            setSearchParams={setSearchParams}
                        />
                    )}
                    {activeTab === 'analysis' && (
                        <AnalysisTab
                            language={language}
                            data={businessData}
                        />
                    )}
                    {activeTab === 'audit' && (
                        <AuditTab
                            language={language}
                            clientData={client}
                            competitors={businessData}
                            auditResult={auditResult}
                            setAuditResult={setAuditResult}
                            userSearchAddress={searchParams.address}
                            userProducts={searchParams.products}
                        />
                    )}
                    {activeTab === 'report' && (
                        <ReportTab
                            language={language}
                            clientData={client}
                            competitors={businessData}
                            auditResult={auditResult}
                            searchParams={searchParams}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

