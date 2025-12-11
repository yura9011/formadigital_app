
import React, { useState, useEffect } from 'react';
import { StoredClient, ClientNote, Language, Project, ProjectTemplate } from './types';
import { TRANSLATIONS } from './constants';
import * as gmbService from '../../services/gmb.service';
import ProjectCard from './ProjectCard';

interface ClientDetailsProps {
    client: StoredClient | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedClient: StoredClient) => void;
    language: Language;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ client, isOpen, onClose, onUpdate, language }) => {
    const t = TRANSLATIONS[language];
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<StoredClient>>({});
    const [notes, setNotes] = useState<ClientNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'projects'>('overview');

    // Project State
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectBudget, setNewProjectBudget] = useState('');
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    useEffect(() => {
        if (isOpen && client) {
            setFormData(client);
            loadNotes(client.id);
            setIsEditing(false);
            setActiveTab('overview');
            // Pre-load templates
            loadTemplates();
        }
    }, [isOpen, client]);

    useEffect(() => {
        if (isOpen && client && activeTab === 'projects') {
            loadProjects(client.id);
        }
    }, [isOpen, client, activeTab]);

    const loadNotes = async (clientId: string) => {
        setIsLoadingNotes(true);
        try {
            const freshClient = await gmbService.getClient(clientId);
            if (freshClient && freshClient.notes) {
                setNotes(freshClient.notes);
            }
        } catch (error) {
            console.error("Failed to load notes", error);
        } finally {
            setIsLoadingNotes(false);
        }
    };

    const loadProjects = async (clientId: string) => {
        setIsLoadingProjects(true);
        try {
            const data = await gmbService.getClientProjects(clientId);
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects", error);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const loadTemplates = async () => {
        try {
            const data = await gmbService.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    };

    const handleSaveClient = async () => {
        if (!client) return;
        setIsSaving(true);
        try {
            const updated = await gmbService.updateClient(client.id, formData);
            onUpdate(updated);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update client", error);
            alert("Error updating client");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNote = async () => {
        if (!client || !newNote.trim()) return;
        try {
            const note = await gmbService.addNote(client.id, newNote);
            setNotes([note, ...notes]);
            setNewNote('');
        } catch (error) {
            console.error("Failed to add note", error);
            alert("Error adding note");
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Delete this note?")) return;
        try {
            await gmbService.deleteNote(noteId);
            setNotes(notes.filter(n => n.id !== noteId));
        } catch (error) {
            console.error("Failed to delete note", error);
        }
    };

    const handleCreateProject = async () => {
        if (!client || !newProjectName.trim()) return;
        try {
            await gmbService.createProject(client.id, {
                name: newProjectName,
                budget: newProjectBudget,
                templateId: selectedTemplateId
            });
            setIsNewProjectModalOpen(false);
            setNewProjectName('');
            setNewProjectBudget('');
            setSelectedTemplateId('');
            loadProjects(client.id);
        } catch (error) {
            console.error("Failed to create project", error);
            alert("Error creating project");
        }
    };

    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
            <div className={`fixed inset-y-0 right-0 ${activeTab === 'projects' ? 'max-w-2xl' : 'max-w-md'} w-full flex transition-all duration-300`}>
                <div className="w-full h-full bg-white shadow-xl flex flex-col overflow-y-auto">
                    {/* Header */}
                    <div className="px-6 py-4 bg-blue-600 text-white">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold truncate pr-4">{client.name}</h2>
                            <button onClick={onClose} className="text-white hover:text-gray-200 focus:outline-none">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex space-x-4 text-sm font-medium">
                            <button
                                className={`pb-2 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                Overview
                            </button>
                            <button
                                className={`pb-2 border-b-2 transition-colors ${activeTab === 'projects' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}
                                onClick={() => setActiveTab('projects')}
                            >
                                Projects
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 bg-gray-50">
                        {activeTab === 'overview' && (
                            <>
                                {/* Actions Bar */}
                                <div className="flex justify-end mb-4 bg-white p-2 rounded shadow-sm">
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit Details
                                        </button>
                                    ) : (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                                                disabled={isSaving}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveClient}
                                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Link to existing code for Form and Notes */}
                                <div className="bg-white p-4 rounded shadow-sm space-y-4 mb-6">
                                    {/* ... Form Fields (Type, Phone, Website, Address) ... */}
                                    {/* Since I am replacing the whole file, I will rewrite them here concisely */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Type</label>
                                        {isEditing ? (
                                            <select
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                value={formData.type || 'LEAD'}
                                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                            >
                                                <option value="LEAD">Lead</option>
                                                <option value="CLIENT">Client</option>
                                                <option value="COMPETITOR">Competitor</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${client.type === 'CLIENT' ? 'bg-green-100 text-green-800' :
                                                    client.type === 'COMPETITOR' ? 'bg-red-100 text-red-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                                {client.type}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Phone</label>
                                        {isEditing ? (
                                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded text-sm" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        ) : <p className="text-sm text-gray-900">{client.phone || '-'}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Website</label>
                                        {isEditing ? (
                                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded text-sm" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                                        ) : client.website ? <a href={client.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{client.website}</a> : <p className="text-sm text-gray-900">-</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Address</label>
                                        <p className="text-sm text-gray-900">{client.address}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded shadow-sm">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                                    <div className="mb-4 flex">
                                        <input
                                            type="text"
                                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-l-md text-sm"
                                            placeholder="Add a note..."
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                        />
                                        <button onClick={handleAddNote} disabled={!newNote.trim()} className="px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium hover:bg-gray-100">Add</button>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {notes.map((note) => (
                                            <div key={note.id} className="bg-gray-50 rounded p-3 relative group">
                                                <div className="text-sm text-gray-900">{note.content}</div>
                                                <div className="mt-1 text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</div>
                                                <button onClick={() => handleDeleteNote(note.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'projects' && (
                            <div className="space-y-4">
                                <button
                                    onClick={() => setIsNewProjectModalOpen(true)}
                                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center font-medium"
                                >
                                    + Start New Project
                                </button>

                                {isLoadingProjects ? (
                                    <p className="text-center text-gray-500 py-4">Loading projects...</p>
                                ) : projects.length > 0 ? (
                                    projects.map(project => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onUpdate={() => loadProjects(client!.id)}
                                        />
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 italic py-4">No projects started yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Project Modal */}
            {isNewProjectModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                        <h3 className="text-lg font-bold mb-4">New Project</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Project Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="e.g. Website Redesign"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Budget (Optional)</label>
                                <input
                                    type="number"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={newProjectBudget}
                                    onChange={(e) => setNewProjectBudget(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    <option value="">No Template (Blank)</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button
                                onClick={() => setIsNewProjectModalOpen(false)}
                                className="px-3 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName}
                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDetails;
