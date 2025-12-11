
'use client';

import React, { useEffect, useState } from 'react';
import * as gmbService from '../../services/gmb.service';
import { Project } from '../../components/gmb/types';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import toast from 'react-hot-toast';

export default function ProjectsDashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const data = await gmbService.getAllProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects", error);
            toast.error("Failed to load projects");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSeedTemplates = async () => {
        const toastId = toast.loading('Seeding templates...');
        try {
            await gmbService.createTemplate({
                name: 'GMB Optimization',
                description: 'Standard workflow for GMB profile optimization.',
                phases: [
                    { name: 'Audit', description: 'Initial audit of the profile.' },
                    { name: 'Keyword Research', description: 'Identify target keywords.' },
                    { name: 'Profile Update', description: 'Update categories, hours, description.' },
                    { name: 'Photos', description: 'Upload high-quality photos.' },
                    { name: 'Reviews Strategy', description: 'Plan for getting more reviews.' },
                    { name: 'Posts', description: 'Create initial posts.' }
                ]
            });
            await gmbService.createTemplate({
                name: 'RRSS Management',
                description: 'Monthly social media management workflow.',
                phases: [
                    { name: 'Content Plan', description: 'Create monthly content calendar.' },
                    { name: 'Design', description: 'Create visuals for posts.' },
                    { name: 'Copywriting', description: 'Write captions and hashtags.' },
                    { name: 'Client Approval', description: 'Send to client for review.' },
                    { name: 'Scheduling', description: 'Schedule posts in tools.' },
                    { name: 'Reporting', description: 'Monthly performance report.' }
                ]
            });
            toast.success("Templates created successfully!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Error seeding templates. They might already exist.", { id: toastId });
        }
    };

    const filteredProjects = projects.filter(p => {
        if (filter === 'ALL') return true;
        return p.status === filter;
    });

    return (
        <div className="min-h-screen bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            <header className="mb-12 flex justify-between items-center border-b-4 border-neo-border pb-6">
                <div className="flex items-center gap-4">
                    <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                        ← Back
                    </NeoButton>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                        Projects
                    </h1>
                </div>
                <div className="flex gap-4">
                    <NeoButton
                        onClick={handleSeedTemplates}
                        variant="secondary"
                        size="sm"
                    >
                        Seed Templates
                    </NeoButton>
                    <NeoButton
                        onClick={loadProjects}
                        size="sm"
                    >
                        Refresh
                    </NeoButton>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <NeoCard className="bg-neo-blue text-white">
                    <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-2">Total</h3>
                    <p className="text-4xl font-black">{projects.length}</p>
                </NeoCard>
                <NeoCard className="bg-neo-yellow/20">
                    <h3 className="text-neo-text text-sm font-bold uppercase tracking-widest mb-2">In Progress</h3>
                    <p className="text-4xl font-black">{projects.filter(p => p.status === 'IN_PROGRESS').length}</p>
                </NeoCard>
                <NeoCard className="bg-green-100">
                    <h3 className="text-green-800 text-sm font-bold uppercase tracking-widest mb-2">Completed</h3>
                    <p className="text-4xl font-black text-green-900">{projects.filter(p => p.status === 'COMPLETED').length}</p>
                </NeoCard>
                <NeoCard className="bg-gray-100">
                    <h3 className="text-gray-600 text-sm font-bold uppercase tracking-widest mb-2">Planning</h3>
                    <p className="text-4xl font-black text-gray-800">{projects.filter(p => p.status === 'PLANNING').length}</p>
                </NeoCard>
            </div>

            {/* Filter Bar */}
            <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
                {['ALL', 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-6 py-2 border-2 border-neo-border font-bold uppercase text-sm transition-all
                            ${filter === status
                                ? 'bg-neo-text text-white shadow-neo-sm translate-x-[2px] translate-y-[2px]'
                                : 'bg-white text-neo-text hover:bg-gray-100 shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px]'
                            }`}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Projects Table/List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue rounded-full"></div>
                </div>
            ) : (
                <NeoCard className="bg-white p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y-2 divide-neo-border">
                            <thead className="bg-neo-blue text-white">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest">Project Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest">Client</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest">Progress</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest">Last Update</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y-2 divide-neo-border">
                                {filteredProjects.map(project => (
                                    <tr key={project.id} className="hover:bg-neo-yellow/10 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-neo-text">{project.name}</div>
                                            <div className="text-xs text-gray-500 font-medium">{project.phases.length} Phases</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-neo-text">{project.client?.name || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-black uppercase border-2 border-neo-border shadow-neo-sm ${project.status === 'COMPLETED' ? 'bg-green-300 text-black' :
                                                    project.status === 'IN_PROGRESS' ? 'bg-blue-300 text-black' :
                                                        'bg-gray-200 text-black'
                                                }`}>
                                                {project.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="w-full bg-gray-200 h-3 border-2 border-neo-border">
                                                <div
                                                    className="bg-neo-orange h-full"
                                                    style={{ width: `${(project.phases.filter(p => p.status === 'DONE').length / (project.phases.length || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                                            {new Date(project.updatedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </NeoCard>
            )}
        </div>
    );
}
