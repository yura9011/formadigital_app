'use client';

import React, { useState } from 'react';
import { Language } from '../types';

interface SearchFormProps {
  language: Language;
  onSearch: (query: string) => void;
  disabled: boolean;
  placeholder: string;
}

const TRANSLATIONS = {
  en: { startHarvest: 'Start Harvest', searching: 'Searching...' },
  es: { startHarvest: 'Iniciar Cosecha', searching: 'Buscando...' },
};

const SearchForm: React.FC<SearchFormProps> = ({ language, onSearch, disabled, placeholder }) => {
  const [query, setQuery] = useState('');
  const t = TRANSLATIONS[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-3 border-2 border-neo-border shadow-neo font-medium focus:outline-none focus:ring-2 focus:ring-neo-blue disabled:bg-gray-100 disabled:text-gray-400"
      />
      <button
        type="submit"
        disabled={disabled || !query.trim()}
        className="px-6 py-3 bg-neo-blue text-white font-black uppercase border-2 border-neo-border shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? t.searching : t.startHarvest}
      </button>
    </form>
  );
};

export default SearchForm;
