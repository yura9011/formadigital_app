
import React, { useState, useEffect } from 'react';
import { StoredClient, Language } from './types';
import { TRANSLATIONS } from './constants';
import { fetchLeads } from '../../services/gmb.service';
import * as XLSX from 'xlsx';

interface LeadsTabProps {
    language: Language;
}

import ClientDetails from './ClientDetails';

const LeadsTab: React.FC<LeadsTabProps> = ({ language }) => {
    const t = TRANSLATIONS[language].leadsTab;
    const [leads, setLeads] = useState<StoredClient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<StoredClient | null>(null);

    const loadLeads = async () => {
        setIsLoading(true);
        try {
            const data = await fetchLeads();
            setLeads(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, []);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(leads.map(l => ({
            Name: l.name,
            Type: l.type,
            Category: l.category,
            Address: l.address,
            Phone: l.phone,
            Website: l.website,
            Rating: l.rating,
            ReviewCount: l.reviewCount,
            GoogleMaps: l.googleMapsUri,
            DiscoveredAt: new Date(l.createdAt).toLocaleDateString()
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        XLSX.writeFile(wb, "gmb_leads_export.xlsx");
    };

    const handleClientUpdate = (updatedClient: StoredClient) => {
        setLeads(leads.map(l => l.id === updatedClient.id ? updatedClient : l));
        setSelectedClient(updatedClient); // Update the currently selected client too
    };

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <ClientDetails
                client={selectedClient}
                isOpen={!!selectedClient}
                onClose={() => setSelectedClient(null)}
                onUpdate={handleClientUpdate}
                language={language}
            />

            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={loadLeads}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        {t.refreshBtn}
                    </button>
                    <input
                        type="text"
                        placeholder="Search leads..."
                        className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-3">
                    <div className="text-sm text-slate-500 font-medium">
                        Total: <span className="text-slate-900 font-bold">{leads.length}</span>
                    </div>
                    <button
                        onClick={handleExport}
                        className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center px-3 py-2 border border-green-200 rounded-md hover:bg-green-50 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t.headers.name}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t.headers.type}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t.headers.category}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t.headers.rating}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t.headers.address}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t.headers.date}
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                                <tr
                                    key={lead.id}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedClient(lead)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-900">{lead.name}</div>
                                        {lead.website && (
                                            <a
                                                href={lead.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-500 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Website
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${lead.type === 'CLIENT' ? 'bg-green-100 text-green-800' :
                                                lead.type === 'COMPETITOR' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'}`}>
                                            {t.types[lead.type] || lead.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {lead.category || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-slate-900 mr-1">{lead.rating}</span>
                                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span className="text-xs text-slate-400 ml-1">({lead.reviewCount})</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 truncate max-w-[200px]" title={lead.address}>
                                        {lead.address}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {lead.googleMapsUri && (
                                            <a
                                                href={lead.googleMapsUri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-900"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {t.viewMaps}
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <p className="text-lg font-medium mb-1">No leads found</p>
                                        <p className="text-sm">Try running a search in the Map tab first.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LeadsTab;
