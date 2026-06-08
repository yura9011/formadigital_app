import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Project, ProjectPhase, PhaseStatus } from './types';
import * as gmbService from '../../services/gmb.service';
import { API_URL } from '@/config/api';

interface ProjectCardProps {
    project: Project;
    onUpdate: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [isEditingPhase, setIsEditingPhase] = useState<string | null>(null);
    const [newPhaseName, setNewPhaseName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPhaseId, setUploadingPhaseId] = useState<string | null>(null);

    const handleStatusChange = async (phaseId: string, newStatus: PhaseStatus) => {
        try {
            await gmbService.updatePhase(phaseId, { status: newStatus });
            toast.success('Phase status updated');
            onUpdate();
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error('Failed to update status');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, phaseId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhaseId(phaseId);
        try {
            await gmbService.uploadAttachment(phaseId, file);
            toast.success('File uploaded successfully');
            onUpdate();
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Upload failed");
        } finally {
            setUploadingPhaseId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteProject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete project: "${project.name}"? This action cannot be undone.`)) {
            const toastId = toast.loading('Deleting project...');
            try {
                await gmbService.deleteProject(project.id);
                toast.success('Project deleted', { id: toastId });
                onUpdate();
            } catch (error) {
                console.error("Failed to delete project", error);
                toast.error('Failed to delete project', { id: toastId });
            }
        }
    };

    const handleDeletePhase = async (phaseId: string) => {
        if (confirm("Are you sure you want to delete this phase?")) {
            const toastId = toast.loading('Deleting phase...');
            try {
                await gmbService.deletePhase(phaseId);
                toast.success('Phase deleted', { id: toastId });
                onUpdate();
            } catch (error) {
                console.error("Failed to delete phase", error);
                toast.error('Failed to delete phase', { id: toastId });
            }
        }
    };

    const handleReorder = async (phaseId: string, direction: 'UP' | 'DOWN', e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await gmbService.reorderPhase(phaseId, direction);
            onUpdate();
        } catch (error) {
            console.error("Failed to reorder phase", error);
            toast.error("Failed to reorder");
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4">
            {/* Header */}
            <div
                className="bg-slate-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div>
                    <h3 className="text-sm font-bold text-slate-800">{project.name}</h3>
                    <div className="text-xs text-slate-500 flex space-x-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {project.status.replace('_', ' ')}
                        </span>
                        <span>{project.phases.filter(p => p.status === 'DONE').length} / {project.phases.length} Phases</span>
                        {project.budget && <span>${project.budget}</span>}
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleDeleteProject}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Delete Project"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                    <svg className={`w-5 h-5 text-slate-400 transform transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            {expanded && (
                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="space-y-4">
                        {project.phases.map((phase) => (
                            <div key={phase.id} className="border border-slate-100 rounded-md p-3 hover:border-blue-200 transition-colors relative group">
                                <button
                                    onClick={() => handleDeletePhase(phase.id)}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Phase"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                {/* Reorder Controls */}
                                <div className="absolute top-8 right-2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                                    <button
                                        onClick={(e) => handleReorder(phase.id, 'UP', e)}
                                        className="text-slate-300 hover:text-blue-500 "
                                        title="Move Up"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => handleReorder(phase.id, 'DOWN', e)}
                                        className="text-slate-300 hover:text-blue-500"
                                        title="Move Down"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="flex justify-between items-start mb-2 pr-6">
                                    <h4 className="font-medium text-sm text-slate-900">{phase.name}</h4>
                                    <select
                                        className={`text-xs border-0 rounded-full px-2 py-1 font-medium ${phase.status === 'DONE' ? 'bg-green-100 text-green-700' :
                                            phase.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                phase.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                            } focus:ring-0 cursor-pointer`}
                                        value={phase.status}
                                        onChange={(e) => handleStatusChange(phase.id, e.target.value as PhaseStatus)}
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="REVIEW">Review</option>
                                        <option value="DONE">Done</option>
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">{phase.description}</p>

                                {/* Attachments */}
                                <div className="space-y-2">
                                    {phase.attachments.map(att => (
                                        <div key={att.id} className="flex items-center text-xs bg-slate-50 p-2 rounded">
                                            {att.type === 'AUDIO' ? (
                                                <div className="w-full">
                                                    <audio controls className="w-full h-8">
                                                        <source src={`${API_URL}${att.filePath}`} />
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                    <span className="text-slate-400 mt-1 block truncate">{att.fileName}</span>
                                                </div>
                                            ) : att.type === 'IMAGE' ? (
                                                <a href={`${API_URL}${att.filePath}`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:opacity-80">
                                                    <img src={`${API_URL}${att.filePath}`} alt={att.fileName} className="w-10 h-10 object-cover rounded mr-2" />
                                                    <span className="truncate max-w-[150px]">{att.fileName}</span>
                                                </a>
                                            ) : (
                                                <a href={`${API_URL}${att.filePath}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                    <span className="truncate max-w-[150px]">{att.fileName}</span>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Upload Action */}
                                <div className="mt-3 flex justify-end">
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        id={`upload-${phase.id}`}
                                        onChange={(e) => handleFileUpload(e, phase.id)}
                                    />
                                    <label
                                        htmlFor={`upload-${phase.id}`}
                                        className={`text-xs flex items-center text-slate-500 hover:text-blue-600 cursor-pointer ${uploadingPhaseId === phase.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        {uploadingPhaseId === phase.id ? 'Uploading...' : 'Attach File'}
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectCard;
