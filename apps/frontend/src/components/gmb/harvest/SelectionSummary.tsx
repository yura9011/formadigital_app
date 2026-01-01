'use client';

import React from 'react';
import { Language } from '../types';

interface SelectionSummaryProps {
  language: Language;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

const TRANSLATIONS = {
  en: { selected: 'selected', selectAll: 'Select All', clearSelection: 'Clear Selection', of: 'of' },
  es: { selected: 'seleccionados', selectAll: 'Seleccionar Todo', clearSelection: 'Limpiar Selección', of: 'de' },
};

const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  language, selectedCount, totalCount, onSelectAll, onClearSelection,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="flex items-center justify-between bg-gray-50 border-2 border-neo-border px-4 py-2">
      <span className="text-sm font-bold text-gray-600">
        {selectedCount} {t.of} {totalCount} {t.selected}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          disabled={selectedCount === totalCount || totalCount === 0}
          className="text-sm text-neo-blue hover:underline font-bold disabled:text-gray-400"
        >
          {t.selectAll}
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={onClearSelection}
          disabled={selectedCount === 0}
          className="text-sm text-neo-blue hover:underline font-bold disabled:text-gray-400"
        >
          {t.clearSelection}
        </button>
      </div>
    </div>
  );
};

export default SelectionSummary;
