
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { TRANSLATIONS } from '@/components/gmb/constants';
import { Business, Language, AuditResult, SearchParams } from '@/components/gmb/types';
import AnalysisTab from '@/components/gmb/AnalysisTab';
import AuditTab from '@/components/gmb/AuditTab';
import ReportTab from '@/components/gmb/ReportTab';
import LeadsTab from '@/components/gmb/LeadsTab';

// Dynamic import for MapTab to disable SSR
const MapTab = dynamic(() => import('@/components/gmb/MapTab'), {
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center bg-slate-100">Loading Map...</div>
});

export default function GmbPage() {
    const [activeTab, setActiveTab] = useState<'map' | 'analysis' | 'audit' | 'report' | 'leads'>('map');
    const [language, setLanguage] = useState<Language>('en');

    const [searchParams, setSearchParams] = useState<SearchParams>({
        address: 'Av Amadeo Sabattini 2000, Córdoba',
        radius: 1.0,
        keywords: 'Kiosco',
        products: ''
    });

    const [businessData, setBusinessData] = useState<Business[]>([]);
    const [client, setClient] = useState<Business | undefined>(undefined);
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

    const t = TRANSLATIONS[language];

    const handleSearchComplete = (results: Business[]) => {
        if (results.length === 0) {
            setBusinessData([]);
            setClient(undefined);
            setAuditResult(null);
            return;
        }

        const foundClient = results.find(b => b.isClient) || results[0];
        const formattedResults = results.map(b => ({
            ...b,
            isClient: b.id === foundClient.id
        }));

        setBusinessData(formattedResults);
        setClient(foundClient);
        setAuditResult(null);
    };

    const handleSetClient = (selectedBusiness: Business | undefined) => {
        if (!selectedBusiness) {
            setClient(undefined);
            return;
        }
        setClient(selectedBusiness);
        setBusinessData(prevData => prevData.map(b => ({
            ...b,
            isClient: b.id === selectedBusiness.id
        })));
    };

    return (
        <div className="min-h-screen flex flex-col bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            <header className="mb-8 flex justify-between items-center border-b-4 border-neo-border pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="bg-white border-2 border-neo-border shadow-neo px-4 py-2 font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="bg-neo-blue text-white p-2 border-2 border-neo-border shadow-neo-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
                            </svg>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-neo-text">
                            {t.title}
                        </h1>
                    </div>
                </div>

                <button
                    onClick={() => setLanguage(prev => prev === 'en' ? 'es' : 'en')}
                    className="bg-neo-yellow text-black border-2 border-neo-border px-4 py-2 font-bold uppercase shadow-neo hover:brightness-110 transition-all text-xs md:text-sm"
                >
                    {language === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
                </button>
            </header>

            <div className="mb-6 overflow-x-auto pb-2">
                <nav className="flex space-x-2" aria-label="Tabs">
                    {(['map', 'analysis', 'audit', 'report', 'leads'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                px-6 py-2 border-2 border-neo-border font-black uppercase text-sm transition-all whitespace-nowrap
                                ${activeTab === tab
                                    ? 'bg-neo-blue text-white shadow-neo translate-x-[-2px] translate-y-[-2px]'
                                    : 'bg-white text-neo-text hover:bg-gray-100'
                                }
                            `}
                        >
                            {t.tabs[tab]}
                        </button>
                    ))}
                </nav>
            </div>

            <main className="flex-1 w-full mx-auto">
                <div className="h-full">
                    {activeTab === 'map' && (
                        <MapTab
                            language={language}
                            onSearchComplete={handleSearchComplete}
                            currentData={businessData}
                            onSetClient={handleSetClient}
                            onSwitchToAudit={() => setActiveTab('audit')}
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
                    {activeTab === 'leads' && (
                        <LeadsTab
                            language={language}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
