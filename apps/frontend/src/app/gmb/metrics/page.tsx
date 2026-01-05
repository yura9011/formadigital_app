'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/config/api';

interface PipelineMetrics {
    totalLeads: number;
    conversionRate: number;
    averageDaysPerStage: Record<string, number>;
    leadsConvertedThisMonth: number;
    leadsDiscardedThisMonth: number;
    topCategories: { category: string; count: number }[];
}

interface PipelineSummary {
    total: number;
    byStage: Record<string, number>;
}

export default function MetricsPage() {
    const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
    const [summary, setSummary] = useState<PipelineSummary | null>(null);
    const [readyCount, setReadyCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [metricsRes, summaryRes, readyRes] = await Promise.all([
                fetch(api.pipeline.metrics()),
                fetch(api.pipeline.summary()),
                fetch(api.pipeline.readyToContact(1000)),
            ]);

            if (metricsRes.ok) {
                const data = await metricsRes.json();
                setMetrics(data);
            }
            if (summaryRes.ok) {
                const data = await summaryRes.json();
                setSummary(data);
            }
            if (readyRes.ok) {
                const data = await readyRes.json();
                setReadyCount(Array.isArray(data) ? data.length : 0);
            }
        } catch (e) {
            console.error('Error fetching metrics:', e);
        } finally {
            setLoading(false);
        }
    };

    const MetricCard = ({
        label,
        value,
        subtext,
        color = 'bg-white',
        icon
    }: {
        label: string;
        value: string | number;
        subtext?: string;
        color?: string;
        icon?: string;
    }) => (
        <div className={`${color} border-2 border-neo-border shadow-neo p-4`}>
            <div className="flex items-center gap-2 mb-1">
                {icon && <span className="text-2xl">{icon}</span>}
                <span className="text-sm font-bold uppercase text-gray-600">{label}</span>
            </div>
            <div className="text-3xl font-black">{value}</div>
            {subtext && <div className="text-sm text-gray-500 mt-1">{subtext}</div>}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-neo-bg p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-gray-200 border-2 border-black w-1/3"></div>
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-200 border-2 border-black"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neo-bg p-4 md:p-8">
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-neo-border pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/gmb/today"
                        className="bg-white border-2 border-neo-border shadow-neo px-4 py-2 font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all"
                    >
                        ← Para Hoy
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="bg-purple-500 text-white p-2 border-2 border-neo-border shadow-neo-sm">
                            <span className="text-xl">📈</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic text-neo-text">
                            Métricas
                        </h1>
                    </div>
                </div>

                <button
                    onClick={fetchAllData}
                    className="bg-white px-3 py-1 border-2 border-black font-bold hover:bg-gray-100"
                >
                    🔄 Actualizar
                </button>
            </header>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    label="Total Leads"
                    value={summary?.total || 0}
                    icon="📊"
                    color="bg-neo-yellow"
                />
                <MetricCard
                    label="Listos para contactar"
                    value={readyCount}
                    subtext="Hoy"
                    icon="⭐"
                    color="bg-green-100"
                />
                <MetricCard
                    label="Contactados"
                    value={summary?.byStage?.CONTACTED || 0}
                    icon="📤"
                    color="bg-blue-100"
                />
                <MetricCard
                    label="Respuestas"
                    value={summary?.byStage?.RESPONDED || 0}
                    subtext={`${metrics?.conversionRate?.toFixed(1) || 0}% tasa`}
                    icon="💬"
                    color="bg-purple-100"
                />
            </div>

            {/* Pipeline Overview */}
            <div className="bg-white border-2 border-neo-border shadow-neo p-6 mb-8">
                <h2 className="text-xl font-black uppercase mb-4">Pipeline Overview</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {[
                        { stage: 'DISCOVERED', label: 'Descubiertos', color: 'bg-gray-200' },
                        { stage: 'ANALYZED', label: 'Analizados', color: 'bg-blue-200' },
                        { stage: 'CONTACTED', label: 'Contactados', color: 'bg-yellow-200' },
                        { stage: 'RESPONDED', label: 'Respondieron', color: 'bg-green-200' },
                        { stage: 'CONVERTED', label: 'Convertidos', color: 'bg-purple-200' },
                        { stage: 'DISCARDED', label: 'Descartados', color: 'bg-red-200' },
                    ].map(({ stage, label, color }) => (
                        <div key={stage} className={`${color} border-2 border-black p-3 text-center`}>
                            <div className="text-2xl font-black">{summary?.byStage?.[stage] || 0}</div>
                            <div className="text-xs font-bold uppercase">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Top Categories */}
                <div className="bg-white border-2 border-neo-border shadow-neo p-6">
                    <h2 className="text-xl font-black uppercase mb-4">Top Categorías</h2>
                    {metrics?.topCategories && metrics.topCategories.length > 0 ? (
                        <div className="space-y-3">
                            {metrics.topCategories.map((cat, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="font-bold text-lg w-6">{i + 1}.</span>
                                    <div className="flex-1 bg-gray-100 border border-black p-2">
                                        <div className="font-bold">{cat.category}</div>
                                    </div>
                                    <span className="bg-neo-blue text-white px-3 py-1 font-bold border border-black">
                                        {cat.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No hay datos de categorías aún.</p>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="bg-white border-2 border-neo-border shadow-neo p-6">
                    <h2 className="text-xl font-black uppercase mb-4">Este Mes</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-bold">Leads convertidos</span>
                            <span className="bg-green-500 text-white px-3 py-1 font-bold border border-black">
                                {metrics?.leadsConvertedThisMonth || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-bold">Leads descartados</span>
                            <span className="bg-red-500 text-white px-3 py-1 font-bold border border-black">
                                {metrics?.leadsDiscardedThisMonth || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold">Tasa de conversión</span>
                            <span className="bg-purple-500 text-white px-3 py-1 font-bold border border-black">
                                {metrics?.conversionRate?.toFixed(1) || 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            {readyCount > 0 && (
                <div className="mt-8 bg-green-500 text-white border-2 border-black shadow-neo p-6 text-center">
                    <p className="text-xl font-bold mb-4">
                        Tenés {readyCount} leads listos para contactar 🚀
                    </p>
                    <Link
                        href="/gmb/today"
                        className="inline-block bg-white text-black px-6 py-3 border-2 border-black font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                    >
                        Ir a Para Hoy →
                    </Link>
                </div>
            )}
        </div>
    );
}
