'use client';

import React, { useState } from 'react';
import { Language } from '../types';
import { HarvestedLead, SortField, SortDirection, isNoWebsite } from '@/services/harv3st';

interface LeadDataGridProps {
  language: Language;
  leads: HarvestedLead[];
  selectedIds: Set<string>;
  onSelectLead: (placeId: string, selected: boolean) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const TRANSLATIONS = {
  en: {
    name: 'Name', rating: 'Rating', reviews: 'Reviews', website: 'Website', phone: 'Phone',
    opportunityScore: 'Opportunity', address: 'Address', category: 'Category', photos: 'Photos',
    hours: 'Hours', noWebsite: 'No website',
  },
  es: {
    name: 'Nombre', rating: 'Calif.', reviews: 'Reseñas', website: 'Sitio Web', phone: 'Teléfono',
    opportunityScore: 'Oportunidad', address: 'Dirección', category: 'Categoría', photos: 'Fotos',
    hours: 'Horarios', noWebsite: 'Sin sitio',
  },
};

const LeadDataGrid: React.FC<LeadDataGridProps> = ({
  language, leads, selectedIds, onSelectLead, sortField, sortDirection, onSort,
}) => {
  const t = TRANSLATIONS[language];
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <th
      onClick={() => onSort(field)}
      className="px-3 py-2 text-left text-xs font-black uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && <span className="text-neo-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </th>
  );

  const isHighOpportunity = (score: number | undefined) => (score ?? 0) >= 50;

  return (
    <div className="bg-white border-2 border-neo-border shadow-neo overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y-2 divide-gray-200">
          <thead className="bg-gray-100 border-b-2 border-neo-border">
            <tr>
              <th className="px-3 py-2 w-10"><span className="sr-only">Select</span></th>
              <SortHeader field="name" label={t.name} />
              <SortHeader field="rating" label={t.rating} />
              <SortHeader field="reviewCount" label={t.reviews} />
              <th className="px-3 py-2 text-left text-xs font-black uppercase text-gray-500">{t.website}</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase text-gray-500">{t.phone}</th>
              <SortHeader field="score" label={t.opportunityScore} />
              <th className="px-3 py-2 w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <React.Fragment key={lead.placeId}>
                <tr className={`hover:bg-gray-50 transition-colors ${isHighOpportunity(lead.score) ? 'bg-neo-yellow/30' : ''} ${selectedIds.has(lead.placeId) ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.placeId)}
                      onChange={(e) => onSelectLead(lead.placeId, e.target.checked)}
                      className="w-4 h-4 text-neo-blue border-2 border-neo-border focus:ring-neo-blue"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-bold text-neo-text truncate max-w-xs">{lead.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{lead.categories}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-bold text-gray-700">{lead.averageRating?.toFixed(1) ?? '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm font-bold text-gray-700">{lead.reviewCount ?? 0}</td>
                  <td className="px-3 py-2">
                    {isNoWebsite(lead.website) ? (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 border border-red-300 font-bold">{t.noWebsite}</span>
                    ) : (
                      <a href={lead.website!} target="_blank" rel="noopener noreferrer" className="text-xs text-neo-blue hover:underline truncate block max-w-[150px]">
                        {new URL(lead.website!).hostname}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">{lead.phones || '-'}</td>
                  <td className="px-3 py-2">
                    <div className={`inline-flex items-center px-2 py-0.5 border text-xs font-black ${isHighOpportunity(lead.score) ? 'bg-neo-orange text-white border-neo-border' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                      {lead.score ?? 0}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setExpandedLead(expandedLead === lead.placeId ? null : lead.placeId)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {expandedLead === lead.placeId && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-gray-500 font-bold">{t.address}:</span><p className="text-gray-700">{lead.fullAddress || '-'}</p></div>
                        <div><span className="text-gray-500 font-bold">{t.photos}:</span><p className="text-gray-700">{lead.photoCount ?? 0}</p></div>
                        <div><span className="text-gray-500 font-bold">{t.category}:</span><p className="text-gray-700">{lead.categories || '-'}</p></div>
                        <div><span className="text-gray-500 font-bold">Place ID:</span><p className="text-gray-700 text-xs font-mono">{lead.placeId}</p></div>
                      </div>
                      {lead.hours && lead.hours.length > 0 && (
                        <div className="mt-3">
                          <span className="text-gray-500 text-sm font-bold">{t.hours}:</span>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                            {lead.hours.map((h, i) => (
                              <div key={i} className="text-xs text-gray-600"><span className="font-bold">{h.day}:</span> {h.hours}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadDataGrid;
