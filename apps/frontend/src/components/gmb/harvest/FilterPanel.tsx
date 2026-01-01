'use client';

import React from 'react';
import { Language } from '../types';
import { HarvestFilters, DEFAULT_HARVEST_FILTERS } from '@/services/harv3st';

interface FilterPanelProps {
  language: Language;
  filters: HarvestFilters;
  setFilters: (filters: HarvestFilters) => void;
  totalCount: number;
  filteredCount: number;
}

const TRANSLATIONS = {
  en: {
    filters: 'Filters', minRating: 'Min Rating', maxRating: 'Max Rating', website: 'Website',
    any: 'Any', hasWebsite: 'Has Website', noWebsite: 'No Website', minReviews: 'Min Reviews',
    category: 'Category', search: 'Search', reset: 'Reset', showing: 'Showing', of: 'of', leads: 'leads',
  },
  es: {
    filters: 'Filtros', minRating: 'Calif. Mín', maxRating: 'Calif. Máx', website: 'Sitio Web',
    any: 'Cualquiera', hasWebsite: 'Con Sitio', noWebsite: 'Sin Sitio', minReviews: 'Reseñas Mín',
    category: 'Categoría', search: 'Buscar', reset: 'Limpiar', showing: 'Mostrando', of: 'de', leads: 'leads',
  },
};

const FilterPanel: React.FC<FilterPanelProps> = ({ language, filters, setFilters, totalCount, filteredCount }) => {
  const t = TRANSLATIONS[language];

  const updateFilter = <K extends keyof HarvestFilters>(key: K, value: HarvestFilters[K]) => {
    setFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => setFilters(DEFAULT_HARVEST_FILTERS);

  return (
    <div className="bg-white border-2 border-neo-border shadow-neo p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black uppercase text-gray-700">{t.filters}</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{t.showing} {filteredCount} {t.of} {totalCount} {t.leads}</span>
          <button onClick={resetFilters} className="text-sm text-neo-blue hover:underline font-bold">{t.reset}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">{t.minRating}</label>
          <input
            type="number"
            value={filters.minRating ?? ''}
            onChange={(e) => updateFilter('minRating', e.target.value ? parseFloat(e.target.value) : null)}
            min={1} max={5} step={0.1} placeholder="1.0"
            className="w-full px-3 py-1.5 border-2 border-neo-border text-sm focus:outline-none focus:ring-1 focus:ring-neo-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">{t.maxRating}</label>
          <input
            type="number"
            value={filters.maxRating ?? ''}
            onChange={(e) => updateFilter('maxRating', e.target.value ? parseFloat(e.target.value) : null)}
            min={1} max={5} step={0.1} placeholder="5.0"
            className="w-full px-3 py-1.5 border-2 border-neo-border text-sm focus:outline-none focus:ring-1 focus:ring-neo-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">{t.website}</label>
          <select
            value={filters.hasWebsite === null ? '' : filters.hasWebsite ? 'yes' : 'no'}
            onChange={(e) => {
              const val = e.target.value;
              updateFilter('hasWebsite', val === '' ? null : val === 'yes');
            }}
            className="w-full px-3 py-1.5 border-2 border-neo-border text-sm focus:outline-none focus:ring-1 focus:ring-neo-blue"
          >
            <option value="">{t.any}</option>
            <option value="yes">{t.hasWebsite}</option>
            <option value="no">{t.noWebsite}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">{t.minReviews}</label>
          <input
            type="number"
            value={filters.minReviews ?? ''}
            onChange={(e) => updateFilter('minReviews', e.target.value ? parseInt(e.target.value) : null)}
            min={0} placeholder="0"
            className="w-full px-3 py-1.5 border-2 border-neo-border text-sm focus:outline-none focus:ring-1 focus:ring-neo-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">{t.category}</label>
          <input
            type="text"
            value={filters.categoryKeyword}
            onChange={(e) => updateFilter('categoryKeyword', e.target.value)}
            placeholder="Restaurant"
            className="w-full px-3 py-1.5 border-2 border-neo-border text-sm focus:outline-none focus:ring-1 focus:ring-neo-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">{t.search}</label>
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            placeholder="Name or address"
            className="w-full px-3 py-1.5 border-2 border-neo-border text-sm focus:outline-none focus:ring-1 focus:ring-neo-blue"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
