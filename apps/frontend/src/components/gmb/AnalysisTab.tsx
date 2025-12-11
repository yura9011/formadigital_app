import React from 'react';
import { Business, Language } from './types';
import { TRANSLATIONS } from './constants';
import { exportToCSV, sortBusinesses } from './utils';

interface AnalysisTabProps {
    data: Business[];
    language: Language;
    isReportMode?: boolean;
}

const AnalysisTab: React.FC<AnalysisTabProps> = ({ data, language, isReportMode = false }) => {
    const t = TRANSLATIONS[language].analysisTab;
    const sortedData = sortBusinesses(data);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 bg-white rounded-lg border border-slate-200 p-10 print:border-none">
                {t.noData}
            </div>
        );
    }

    const containerClass = isReportMode
        ? "bg-white border-t border-slate-200"
        : "flex-1 bg-white border-2 border-neo-border shadow-neo flex flex-col";

    const tableWrapperClass = isReportMode
        ? "overflow-visible"
        : "overflow-x-auto";

    const thClass = isReportMode
        ? "px-2 py-2 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider"
        : "px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-white";

    const tdClass = isReportMode
        ? "px-2 py-2 text-[10px] align-top whitespace-normal break-words"
        : "px-6 py-4 whitespace-nowrap text-sm font-medium text-neo-text border-b-2 border-neo-border";

    return (
        <div className={`flex flex-col h-full ${isReportMode ? '' : 'space-y-4'}`}>
            {!isReportMode && (
                <div className="flex justify-between items-center bg-white p-4 border-2 border-neo-border shadow-neo print:hidden">
                    <div>
                        <p className="text-sm font-bold text-neo-text italic">{t.formulaInfo}</p>
                        <p className="text-xs text-gray-500 font-mono">{t.variables}</p>
                    </div>
                    <button
                        onClick={() => exportToCSV(sortedData)}
                        className="bg-green-600 text-white border-2 border-neo-border px-4 py-2 shadow-neo font-bold uppercase hover:bg-green-700 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                        {t.exportBtn}
                    </button>
                </div>
            )}

            <div className={containerClass}>
                <div className={tableWrapperClass}>
                    <table className="min-w-full divide-y-2 divide-neo-border">
                        <thead className={isReportMode ? "bg-slate-50" : "bg-neo-blue"}>
                            <tr>
                                <th scope="col" className={`${thClass} w-10`}>
                                    {t.headers.rank}
                                </th>
                                <th scope="col" className={`${thClass} w-auto`}>
                                    {t.headers.name}
                                </th>
                                <th scope="col" className={`${thClass} w-12 text-right`}>
                                    {t.headers.rating}
                                </th>
                                <th scope="col" className={`${thClass} w-12 text-right`}>
                                    {t.headers.reviews}
                                </th>
                                <th scope="col" className={`${thClass} w-16 text-right font-black ${isReportMode ? 'text-blue-600' : 'text-neo-yellow'}`}>
                                    {t.headers.wScore}
                                </th>
                                {!isReportMode && (
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-black uppercase text-white tracking-widest print:hidden">
                                        {t.headers.actions}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {sortedData.map((business, idx) => (
                                <tr key={business.id} className={`${business.isClient ? (isReportMode ? "bg-blue-50" : "bg-neo-yellow/20") : "hover:bg-gray-50"} transition-colors`}>
                                    <td className={tdClass}>
                                        #{idx + 1}
                                    </td>
                                    <td className={tdClass}>
                                        <div className="flex flex-col">
                                            <div className={`font-bold ${business.isClient ? 'text-neo-blue underline' : 'text-neo-text'}`}>
                                                {business.name} {business.isClient && <span className="text-[10px] bg-neo-blue text-white px-1.5 py-0.5 ml-2 border border-black uppercase">You</span>}
                                            </div>
                                            <div className="text-gray-500 text-xs mt-1">
                                                {business.address}
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`${tdClass} text-right`}>
                                        {business.rating.toFixed(1)}
                                    </td>
                                    <td className={`${tdClass} text-right`}>
                                        {business.reviewCount}
                                    </td>
                                    <td className={`${tdClass} text-right font-black ${isReportMode ? 'text-blue-600' : 'text-neo-orange'}`}>
                                        {business.weightedScore?.toFixed(2)}
                                    </td>

                                    {!isReportMode && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 print:hidden border-b-2 border-neo-border">
                                            <div className="flex space-x-3">
                                                <a
                                                    href={business.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`text-neo-blue font-bold uppercase hover:underline text-xs flex items-center ${!business.website ? 'opacity-30 pointer-events-none' : ''}`}
                                                >
                                                    {t.visitWeb}
                                                </a>
                                                {business.googleMapsUri && (
                                                    <a
                                                        href={business.googleMapsUri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-green-700 font-bold uppercase hover:underline text-xs flex items-center"
                                                    >
                                                        {t.viewMaps}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalysisTab;
