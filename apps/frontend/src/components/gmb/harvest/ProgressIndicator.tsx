'use client';

import React from 'react';
import { Language } from '../types';

interface ProgressIndicatorProps {
  language: Language;
  currentTask: string;
  onCancel: () => void;
}

const TRANSLATIONS = {
  en: { scraping: 'Scraping', cancel: 'Cancel', pleaseWait: 'This may take a few minutes...' },
  es: { scraping: 'Scrapeando', cancel: 'Cancelar', pleaseWait: 'Esto puede tomar unos minutos...' },
};

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ language, currentTask, onCancel }) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="mt-4 p-4 bg-neo-yellow border-2 border-neo-border shadow-neo">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-neo-border border-t-transparent rounded-full animate-spin" />
        <div className="flex-1">
          <p className="font-bold text-neo-text">{t.scraping}: {currentTask}</p>
          <p className="text-sm text-gray-600">{t.pleaseWait}</p>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm bg-white border-2 border-neo-border font-bold hover:bg-gray-100 transition-colors"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
};

export default ProgressIndicator;
