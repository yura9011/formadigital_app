'use client';

import React, { useState, useEffect } from 'react';

interface GscProperty { siteUrl: string; permissionLevel: string; }
interface DailyData { date: string; clicks: number; impressions: number; ctr: number; position: number; }
interface AnalyticsSummary { totalClicks: number; totalImpressions: number; averageCtr: number; averagePosition: number; }
interface SearchAnalytics { summary: AnalyticsSummary; queries: any[]; pages: any[]; dailyData: DailyData[]; }

import { API_URL as API_BASE } from '@/config/api';

export default function GscTab() {
  const [properties, setProperties] = useState<GscProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '28' | '90'>('28');
  const [activeView, setActiveView] = useState<'queries' | 'pages'>('queries');

  useEffect(() => { fetchProperties(); }, []);
  useEffect(() => { if (selectedProperty) fetchAnalytics(selectedProperty); }, [selectedProperty, dateRange]);

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_BASE}/gsc/properties`);
      const data = await res.json();
      setProperties(data);
      if (data.length > 0) setSelectedProperty(data[0].siteUrl);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchAnalytics = async (siteUrl: string) => {
    const end = new Date();
    const start = new Date(end.getTime() - parseInt(dateRange) * 86400000);
    const res = await fetch(`${API_BASE}/gsc/analytics?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`);
    setAnalytics(await res.json());
  };

  const fmt = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  const pct = (n: number) => (n * 100).toFixed(1) + '%';

  if (loading) return <div className="p-8 text-center font-bold">Loading Search Console data...</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b-4 border-black flex-wrap gap-4">
        <h2 className="text-2xl font-black uppercase">📊 Search Console Analytics</h2>
        <div className="flex gap-4 items-center">
          <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}
            className="px-4 py-2 border-2 border-black font-bold bg-white">
            {properties.map(p => <option key={p.siteUrl} value={p.siteUrl}>{p.siteUrl.replace('sc-domain:', '')}</option>)}
          </select>
          <div className="flex">
            {(['7', '28', '90'] as const).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={`px-3 py-2 border-2 border-black font-bold text-sm ${dateRange === r ? 'bg-neo-blue text-white' : 'bg-white'} ${r !== '7' ? '-ml-0.5' : ''}`}>
                {r}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 border-2 border-black shadow-neo p-4 border-l-4 border-l-blue-500">
            <div className="text-3xl mb-1">👆</div>
            <div className="text-3xl font-black">{fmt(analytics.summary.totalClicks)}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Clicks</div>
          </div>
          <div className="bg-purple-100 border-2 border-black shadow-neo p-4 border-l-4 border-l-purple-500">
            <div className="text-3xl mb-1">👁️</div>
            <div className="text-3xl font-black">{fmt(analytics.summary.totalImpressions)}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Impressions</div>
          </div>
          <div className="bg-green-100 border-2 border-black shadow-neo p-4 border-l-4 border-l-green-500">
            <div className="text-3xl mb-1">📈</div>
            <div className="text-3xl font-black">{pct(analytics.summary.averageCtr)}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Avg CTR</div>
          </div>
          <div className="bg-yellow-100 border-2 border-black shadow-neo p-4 border-l-4 border-l-yellow-500">
            <div className="text-3xl mb-1">📍</div>
            <div className="text-3xl font-black">{analytics.summary.averagePosition.toFixed(1)}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Avg Position</div>
          </div>
        </div>
      )}

      {/* Mini Chart */}
      {analytics && analytics.dailyData.length > 0 && (
        <div className="bg-white border-2 border-black shadow-neo p-4 mb-6">
          <div className="text-sm font-bold uppercase mb-3">Clicks Over Time</div>
          <div className="flex items-end gap-1 h-20">
            {analytics.dailyData.slice(-14).map((day, i) => {
              const max = Math.max(...analytics.dailyData.map(d => d.clicks));
              const h = max > 0 ? (day.clicks / max) * 100 : 0;
              return <div key={i} className="flex-1 bg-neo-blue border border-black" style={{ height: `${h}%`, minHeight: '4px' }} title={`${day.date}: ${day.clicks}`} />;
            })}
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        {(['queries', 'pages'] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`px-6 py-2 border-2 border-black font-bold uppercase ${activeView === v ? 'bg-neo-blue text-white shadow-neo' : 'bg-white'}`}>
            Top {v}
          </button>
        ))}
      </div>

      {/* Data Table */}
      {analytics && (
        <div className="bg-white border-2 border-black shadow-neo overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="p-3 text-left font-black uppercase">{activeView === 'queries' ? 'Query' : 'Page'}</th>
                <th className="p-3 text-right font-black uppercase">Clicks</th>
                <th className="p-3 text-right font-black uppercase">Impr.</th>
                <th className="p-3 text-right font-black uppercase">CTR</th>
                <th className="p-3 text-right font-black uppercase">Pos.</th>
              </tr>
            </thead>
            <tbody>
              {(activeView === 'queries' ? analytics.queries : analytics.pages).map((item: any, i: number) => (
                <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 font-medium truncate max-w-xs">{activeView === 'queries' ? item.query : item.page.split('/').pop() || '/'}</td>
                  <td className="p-3 text-right font-bold">{fmt(item.clicks)}</td>
                  <td className="p-3 text-right">{fmt(item.impressions)}</td>
                  <td className="p-3 text-right">{pct(item.ctr)}</td>
                  <td className="p-3 text-right">{item.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
