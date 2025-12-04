'use client';

import { useState, useEffect } from 'react';
import { NeoCard } from '../../components/neo/NeoCard';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoLineChart } from '../../components/neo/NeoLineChart';

interface AccountInfo {
    name: string;
    username: string;
    profile_picture_url: string;
    followers_count: number;
}

interface Insight {
    name: string;
    period: string;
    values: { value: number; end_time: string }[];
    title: string;
    description: string;
}

export default function AnalyticsPage() {
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [analytics, setAnalytics] = useState<{ account: AccountInfo; insights: Insight[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState('7');
    // State for date range filter

    useEffect(() => {
        fetch('http://localhost:3000/integrations')
            .then(res => res.json())
            .then(data => {
                setIntegrations(data);
                if (data.length > 0) setSelectedId(data[0].id);
            });
    }, []);

    useEffect(() => {
        if (!selectedId) return;
        setLoading(true);

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - parseInt(period));

        const since = start.toISOString();
        const until = end.toISOString();

        fetch(`http://localhost:3000/integrations/${selectedId}/analytics?since=${since}&until=${until}`)
            .then(res => res.json())
            .then(data => setAnalytics(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [selectedId, period]);

    if (!selectedId) return <div className="p-8 text-white">Cargando integraciones...</div>;

    return (
        <div className="min-h-screen bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            <header className="mb-12 flex justify-between items-center border-b-4 border-neo-border pb-6">
                <div className="flex items-center gap-4">
                    <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                        ← Volver
                    </NeoButton>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                        Analíticas
                    </h1>
                </div>
                <div className="flex gap-4">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white text-black border-2 border-neo-border p-3 font-bold shadow-neo focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
                    >
                        <option value="7">Últimos 7 días</option>
                        <option value="28">Últimos 28 días</option>
                        <option value="90">Últimos 90 días</option>
                    </select>
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="bg-white text-black border-2 border-neo-border p-3 font-bold shadow-neo focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
                    >
                        {integrations.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            {loading && (
                <div className="flex justify-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue rounded-full"></div>
                </div>
            )}

            {analytics && !loading && analytics.account ? (
                <div className="space-y-12">
                    {/* Account Overview */}
                    <NeoCard className="flex flex-col md:flex-row items-center gap-8 bg-white text-center md:text-left">
                        <div className="relative">
                            <img
                                src={analytics.account.profile_picture_url || 'https://via.placeholder.com/150'}
                                alt={analytics.account.name || 'User'}
                                className="w-32 h-32 rounded-full border-4 border-neo-border"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-neo-blue text-white text-xs font-bold px-2 py-1 border-2 border-neo-border shadow-neo-sm">
                                PRO
                            </div>
                        </div>

                        <div className="flex-1">
                            <h2 className="text-4xl font-black uppercase mb-1">{analytics.account.name}</h2>
                            <p className="text-xl font-bold text-gray-500 mb-6">@{analytics.account.username}</p>

                            {/* Token Status */}
                            {(analytics as any).tokenExpiration && (
                                <div className={`mb-6 inline-block px-4 py-2 border-2 font-bold text-sm ${new Date((analytics as any).tokenExpiration).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
                                    ? 'bg-neo-orange text-white border-neo-border'
                                    : 'bg-green-100 text-green-800 border-green-800'
                                    }`}>
                                    {new Date((analytics as any).tokenExpiration).getTime() < Date.now()
                                        ? '⚠️ TOKEN EXPIRADO'
                                        : `✅ Token válido hasta: ${new Date((analytics as any).tokenExpiration).toLocaleDateString()}`
                                    }
                                </div>
                            )}

                            <div className="flex justify-center md:justify-start gap-12">
                                <div className="text-center">
                                    <p className="text-5xl font-black text-neo-blue">{analytics.account.followers_count.toLocaleString()}</p>
                                    <p className="font-bold uppercase tracking-widest text-sm mt-1">Seguidores</p>
                                </div>
                            </div>
                        </div>
                    </NeoCard>

                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {analytics.insights.map((insight, idx) => (
                            <NeoCard key={insight.name} title={insight.title} className={`bg-white text-black ${idx % 2 === 0 ? 'bg-neo-yellow/10' : 'bg-neo-pink/10'}`}>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-6xl font-black mb-2 text-black">
                                            {insight.values?.[0]?.value?.toLocaleString() || '0'}
                                        </p>
                                        <p className="font-bold text-gray-600 uppercase text-sm">periodo: {insight.period}</p>
                                    </div>
                                    <div className="text-6xl opacity-20 grayscale hover:grayscale-0 transition-all duration-300">
                                        {insight.name === 'reach' ? '📡' :
                                            insight.name === 'profile_views' ? '👀' :
                                                insight.name === 'impressions' ? '📊' :
                                                    insight.name === 'website_clicks' ? '🔗' : '📈'}
                                    </div>
                                </div>
                                <p className="mt-4 text-sm font-medium border-t-2 border-neo-border/20 pt-4 text-gray-800">
                                    {insight.description}
                                </p>
                                {/* Chart for 7+ days */}
                                {period !== '1' && insight.values && insight.values.length > 1 && (
                                    <div className="mt-4 pt-4 border-t-2 border-neo-border/10">
                                        <NeoLineChart 
                                            data={insight.values.map(v => ({ ...v, name: v.end_time }))} 
                                            dataKey="value" 
                                            color={idx % 2 === 0 ? '#E1306C' : '#000'} // Pink or Black
                                            height={60}
                                        />
                                    </div>
                                )}
                            </NeoCard>
                        ))}
                    </div>
                </div>
            ) : (
                !loading && selectedId && (
                    <div className="bg-neo-orange text-white p-6 border-4 border-neo-border shadow-neo font-bold text-xl text-center">
                        ⚠️ Error al cargar analíticas. Verifica tu token.
                        <pre className="text-xs mt-4 bg-black/20 p-4 text-left overflow-auto max-h-40">
                            {JSON.stringify(analytics, null, 2)}
                        </pre>
                    </div>
                )
            )}
        </div>
    );
}
