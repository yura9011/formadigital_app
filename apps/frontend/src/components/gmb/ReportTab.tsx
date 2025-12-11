
import React, { useState } from 'react';
import { Business, Language, AuditResult, SearchParams } from './types';
import { TRANSLATIONS } from './constants';
import AnalysisTab from './AnalysisTab';
import MapTab from './MapTab';
import AuditTab from './AuditTab';

interface ReportTabProps {
    language: Language;
    clientData: Business | undefined;
    competitors: Business[];
    auditResult: AuditResult | null;
    searchParams: SearchParams;
}

const ReportTab: React.FC<ReportTabProps> = ({ language, clientData, competitors, auditResult, searchParams }) => {
    const t = TRANSLATIONS[language].reportTab;
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = () => {
        setIsGenerating(true);
        const element = document.getElementById('report-content');

        // Use html2pdf if available (loaded via CDN)
        if (typeof (window as any).html2pdf === 'function' && element) {
            const opt = {
                margin: 0,
                filename: `Audit_${clientData?.name}_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            (window as any).html2pdf().set(opt).from(element).save().then(() => {
                setIsGenerating(false);
            }).catch((err: any) => {
                console.error("PDF generation error:", err);
                setIsGenerating(false);
            });
        } else {
            console.warn("html2pdf not found, using print fallback");
            window.print();
            setIsGenerating(false);
        }
    };

    if (competitors.length === 0 && !auditResult) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-500 bg-white rounded-lg border border-slate-200">
                {t.noData}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20">

            <div className="mb-8 flex justify-between items-center print:hidden bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{t.title}</h2>
                    <p className="text-sm text-slate-500">{clientData ? clientData.name : 'Market Analysis'}</p>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 text-white px-4 py-2 rounded shadow transition-colors font-medium ${isGenerating ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isGenerating ? 'Generating PDF...' : 'Download PDF'}
                </button>
            </div>

            <div id="report-content" className="bg-white shadow-lg p-10 print:shadow-none print:p-0">

                <div className="border-b-2 border-slate-900 pb-6 mb-8">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.title}</h1>
                            <h2 className="text-xl text-blue-600 font-medium">{clientData?.name || "Local Market Analysis"}</h2>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                            <p>{t.generatedOn}</p>
                            <p className="font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider">Search Location</span>
                            <span className="font-semibold text-slate-800">{searchParams.address}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider">Keywords</span>
                            <span className="font-semibold text-slate-800">{searchParams.keywords}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-10 break-inside-avoid">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3 uppercase tracking-wide">
                        {t.rankingSection}
                    </h3>

                    {/* Map in Report Mode */}
                    <div className="mb-6 h-[400px] border border-slate-200 rounded overflow-hidden">
                        <MapTab
                            language={language}
                            onSearchComplete={() => { }}
                            currentData={competitors}
                            onSetClient={() => { }}
                            onSwitchToAudit={() => { }}
                            searchParams={searchParams}
                            setSearchParams={() => { }}
                            isReportMode={true}
                        />
                    </div>

                    <AnalysisTab language={language} data={competitors} isReportMode={true} />
                </div>

                {auditResult && (
                    <div className="break-inside-avoid page-break-before-always">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3 uppercase tracking-wide">
                            {t.auditSection}
                        </h3>
                        <div className="audit-print-view">
                            <AuditTab
                                language={language}
                                clientData={clientData}
                                competitors={competitors}
                                auditResult={auditResult}
                                setAuditResult={() => { }}
                                userSearchAddress={searchParams.address}
                                userProducts={searchParams.products}
                                isReportMode={true}
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ReportTab;
