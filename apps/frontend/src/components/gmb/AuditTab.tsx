
import React, { useState, useEffect } from 'react';
import { Business, Language, AuditResult } from './types';
import { TRANSLATIONS } from './constants';
import { performAudit } from '../../services/gmb.service';

interface AuditTabProps {
    language: Language;
    clientData: Business | undefined;
    competitors: Business[];
    auditResult: AuditResult | null;
    setAuditResult: (res: AuditResult | null) => void;
    userSearchAddress: string;
    userProducts?: string;
    isReportMode?: boolean;
}

const AuditTab: React.FC<AuditTabProps> = ({ language, clientData, competitors, auditResult, setAuditResult, userSearchAddress, userProducts = "", isReportMode = false }) => {
    const t = TRANSLATIONS[language].auditTab;
    const [url, setUrl] = useState('');
    const [products, setProducts] = useState(userProducts);
    const [zoneContext, setZoneContext] = useState('');
    const [isAuditing, setIsAuditing] = useState(false);
    const [credits, setCredits] = useState<{ used: number, total: number, remaining: number } | null>(null);

    // --- Feature 2: Review Queue ---
    const [candidateQueue, setCandidateQueue] = useState<{ name: string, url: string }[]>([]);

    // Derived: in queue?
    const isInQueue = candidateQueue.some(c => c.url === url || c.name === clientData?.name);

    useEffect(() => {
        // Fetch credits
        const fetchCredits = async () => {
            // ... existing fetch ...
            try {
                const res = await fetch('http://2.24.89.243:3000/gmb/credits');
                if (res.ok) setCredits(await res.json());
            } catch (e) { console.error("Error fetching credits", e); }
        };
        fetchCredits();
    }, [isAuditing]);

    // ... useEffects for url updates ...
    useEffect(() => {
        if (clientData && !url) {
            if (clientData.googleMapsUri) setUrl(clientData.googleMapsUri);
            else if (clientData.website) setUrl(clientData.website);
            else setUrl(`${clientData.name}, ${clientData.address}`);
        }
    }, [clientData]);

    useEffect(() => {
        setProducts(userProducts);
    }, [userProducts]);

    const addToQueue = () => {
        if (!url) return;
        const name = clientData?.name || url;
        setCandidateQueue(prev => [...prev, { name, url }]);
        // Toast or specific UI feedback handled in render
    };

    const runBatchAudit = async () => {
        // Strategy: Process queue sequentially or select specific one?
        // For simplistic MVP: Only process the CURRENT input if queue is empty, 
        // OR process the Queue items one by one? 
        // User Request says "Review Queue" then "Process Batch".
        // Let's implement: "Audit Current" (Legacy) OR "Process Queue"

        if (candidateQueue.length > 0) {
            // Batch Mode (Mockup logic for now, or loop calls)
            setIsAuditing(true);
            // We only support SINGLE result display for now. 
            // Ideally we'd have a "Results List".
            // Compromise: We audit the LAST item or clean logic?
            // Let's stick to Single Audit for "Sniper Mode" but use Queue as a "Shortlist".
            // User clicks item in queue -> fills input -> clicks "Audit This".
            // This fulfills the "Review before spend" goal.
            // OR: "Audit All" -> runs loop -> consumes X credits.

            // Simplest "Safe" Implementation: Queue is just a "Saved List". 
            // User selects from list to load into Input. Then audits manually.
        } else {
            // Legacy Single Audit
            handleAudit();
        }
    };

    const handleAudit = async () => {
        setIsAuditing(true);
        try {
            const auditRes = await performAudit(url, clientData, competitors, language, userSearchAddress, products, zoneContext);
            setAuditResult(auditRes);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAuditing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pass': case 'ok': return 'bg-green-100 text-green-800 border-green-200';
            case 'fail': case 'missing': return 'bg-red-100 text-red-800 border-red-200';
            case 'warning': case 'fix': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        if (status === 'ok' || status === 'pass') return '✓';
        if (status === 'missing' || status === 'fail') return '✕';
        return '!';
    };

    const getVolumeBadge = (vol: string) => {
        if (vol === 'High') return 'bg-green-100 text-green-800';
        if (vol === 'Medium') return 'bg-blue-100 text-blue-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="flex flex-col space-y-8 pb-10">
            {!isReportMode && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 print:hidden">
                    {clientData && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start">
                            <div>
                                <p className="text-sm font-bold text-blue-900">Auditing Selected Client:</p>
                                <p className="text-sm text-blue-800">{clientData.name}</p>
                                <p className="text-xs text-blue-600">{clientData.address}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Products/Services</label>
                            <input
                                type="text"
                                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 p-2 border"
                                placeholder="e.g. Specialty Coffee, Vegan Food"
                                value={products}
                                onChange={(e) => setProducts(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Zone Context (Optional)</label>
                            <input
                                type="text"
                                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 p-2 border"
                                placeholder="e.g. University District, Tourist Trap"
                                value={zoneContext}
                                onChange={(e) => setZoneContext(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span className="text-xl">⚠️</span>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-amber-700">
                                        <span className="font-bold">Premium Audit Cost:</span> This action uses <span className="font-black">1 Credit</span> via SerpApi to fetch real Google data (reviews, ratings). Results are cached for 30 days.
                                    </p>
                                </div>
                            </div>
                            {credits ? (
                                <div className="flex-1 w-full md:w-auto mt-2 md:mt-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">API Battery</span>
                                        <span className={`text-[10px] font-bold ${credits.remaining < 50 ? 'text-red-600' : 'text-slate-600'}`}>
                                            {credits.used}/{credits.total} ({credits.remaining} Left)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2.5 rounded-sm border border-slate-300 relative overflow-hidden">
                                        {/* Flashy Progress Bar */}
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out ${credits.remaining < 25 ? 'bg-red-500' :
                                                credits.remaining < 100 ? 'bg-yellow-400' :
                                                    'bg-green-500'
                                                }`}
                                            style={{ width: `${(credits.used / credits.total) * 100}%` }}
                                        >
                                            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-20 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 animate-pulse mt-2 md:mt-0">Calculating fuel...</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            className="flex-1 border-slate-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 p-3 border"
                            placeholder={t.enterUrl}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />

                        {/* Review Queue Actions */}
                        <div className="flex gap-2">
                            {!isInQueue && (
                                <button
                                    onClick={addToQueue}
                                    className="px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-md hover:bg-slate-50 transition-colors"
                                    title="Add to Review List (No Cost)"
                                >
                                    + Add to List
                                </button>
                            )}

                            <button
                                onClick={handleAudit} // Legacy single audit for now, or runBatchAudit if list selected
                                disabled={isAuditing}
                                className={`md:w-64 text-white p-3 rounded-md shadow-sm font-medium transition-colors ${isAuditing ? 'bg-purple-400 cursor-wait' : 'bg-purple-600 hover:bg-purple-700'}`}
                            >
                                {isAuditing ? (
                                    <span className="flex items-center justify-center space-x-2">
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="animate-pulse">Running Deep Audit...</span>
                                    </span>
                                ) : t.analyzeBtn}
                            </button>
                        </div>
                    </div>

                    {/* Queue Display */}
                    {candidateQueue.length > 0 && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Review Queue ({candidateQueue.length})</h4>
                            <div className="space-y-2">
                                {candidateQueue.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                                        <span className="text-sm font-medium truncate w-1/2">{c.name}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setUrl(c.url); }}
                                                className="text-xs text-blue-600 font-bold hover:underline"
                                            >
                                                Load
                                            </button>
                                            <button
                                                onClick={() => setCandidateQueue(prev => prev.filter((_, idx) => idx !== i))}
                                                className="text-xs text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {
                !auditResult && !isAuditing && (
                    <div className="text-center text-slate-500 mt-10 p-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        {clientData ? "Ready to analyze selected client. Click button to start." : t.noData}
                    </div>
                )
            }

            {
                isAuditing && !auditResult && (
                    <div className="animate-pulse space-y-4">
                        <div className="h-40 bg-slate-200 rounded"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-60 bg-slate-200 rounded"></div>
                            <div className="h-60 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                )
            }

            {
                auditResult && (
                    <div className="space-y-8">
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-slate-800 mb-2">{t.sections.plan}</h2>
                                <p className="text-sm text-slate-600 leading-relaxed italic border-l-4 border-purple-500 pl-4">
                                    "{auditResult.executiveSummary}"
                                </p>
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 p-4 rounded-lg border border-slate-100 min-w-[150px]">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Audit Score</span>
                                <div className="relative flex items-center justify-center">
                                    <span className="text-2xl font-bold text-slate-800">{auditResult.completenessScore}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">
                                    {t.sections.fundamentals}
                                </div>
                                <table className="min-w-full divide-y divide-slate-100">
                                    <tbody className="divide-y divide-slate-100">
                                        {auditResult.basicChecklist.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.item}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${getStatusColor(item.status)}`}>
                                                        <span className="mr-1">{getStatusIcon(item.status)}</span>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 italic">{item.note}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>



                        {auditResult.swotAnalysis && (
                            <div className="break-inside-avoid page-break-before-always mb-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3 uppercase tracking-wide">
                                    SWOT Analysis
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 p-4 rounded border border-green-100">
                                        <h4 className="font-bold text-green-900 mb-2 border-b border-green-200 pb-1">Strengths</h4>
                                        <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                                            {auditResult.swotAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded border border-red-100">
                                        <h4 className="font-bold text-red-900 mb-2 border-b border-red-200 pb-1">Weaknesses</h4>
                                        <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                                            {auditResult.swotAnalysis.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded border border-blue-100">
                                        <h4 className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1">Opportunities</h4>
                                        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                                            {auditResult.swotAnalysis.opportunities.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded border border-orange-100">
                                        <h4 className="font-bold text-orange-900 mb-2 border-b border-orange-200 pb-1">Threats</h4>
                                        <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                                            {auditResult.swotAnalysis.threats.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {auditResult.gapAnalysis && (
                            <div className="break-inside-avoid mb-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-purple-600 pl-3 uppercase tracking-wide">
                                    Competitive Gap Analysis
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                                        <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Review Gap</span>
                                        <p className="text-sm font-semibold text-slate-800">{auditResult.gapAnalysis.reviewGap}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                                        <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Rating Gap</span>
                                        <p className="text-sm font-semibold text-slate-800">{auditResult.gapAnalysis.ratingGap}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                                        <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Content Gap</span>
                                        <p className="text-sm font-semibold text-slate-800">{auditResult.gapAnalysis.contentGap}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {auditResult.seoInsights && (
                            <div className="break-inside-avoid page-break-before-always mb-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-indigo-500 pl-3 uppercase tracking-wide">
                                    {t.sections.seoKeywords}
                                </h3>

                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Keyword</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Est. Volume</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Difficulty</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Intent</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {auditResult.seoInsights.topLocalKeywords.map((k, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{k.keyword}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getVolumeBadge(k.volumeEstimate)}`}>
                                                            {k.volumeEstimate}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{k.competition}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-500 italic">{k.userIntent}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {auditResult.seoInsights.hyperLocalTips && (
                                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                        <h4 className="font-bold text-indigo-900 mb-2 text-sm uppercase">Hyper-Local Tips</h4>
                                        <ul className="list-disc list-inside text-sm text-indigo-800 space-y-1">
                                            {auditResult.seoInsights.hyperLocalTips.map((tip, i) => <li key={i}>{tip}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {auditResult.phasedActionPlan && (
                            <div className="break-inside-avoid page-break-before-always">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-emerald-500 pl-3 uppercase tracking-wide">
                                    Strategic Action Plan
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-white border-l-4 border-emerald-400 p-4 shadow-sm rounded-r">
                                        <h4 className="font-bold text-slate-800 mb-2 flex items-center">
                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded mr-2 uppercase">Immediate</span>
                                            Week 1: Quick Wins
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                            {auditResult.phasedActionPlan.immediate.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-white border-l-4 border-emerald-600 p-4 shadow-sm rounded-r">
                                        <h4 className="font-bold text-slate-800 mb-2 flex items-center">
                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded mr-2 uppercase">Short Term</span>
                                            Month 1: Reputation & Content
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                            {auditResult.phasedActionPlan.shortTerm.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-white border-l-4 border-emerald-900 p-4 shadow-sm rounded-r">
                                        <h4 className="font-bold text-slate-800 mb-2 flex items-center">
                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded mr-2 uppercase">Long Term</span>
                                            Quarter 1: Authority
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                            {auditResult.phasedActionPlan.longTerm.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default AuditTab;
