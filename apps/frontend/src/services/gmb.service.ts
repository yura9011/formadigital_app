
import { API_URL } from '../config/api';
import { Business, SearchParams, AuditResult, StoredClient } from '../components/gmb/types';

// Agency Client type (from /agency/overview)
export interface AgencyClient {
    id: string;
    name: string;
    email?: string;
    googleConnected: boolean;
    gbpLocations: number;
    pendingReviews: number;
}

export async function fetchAgencyClients(): Promise<AgencyClient[]> {
    const res = await fetch(`${API_URL}/agency/overview`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!res.ok) {
        throw new Error(`Error fetching agency clients: ${res.statusText}`);
    }

    const data = await res.json();
    return data.clients || [];
}

export async function searchCompetitors(params: SearchParams): Promise<Business[]> {
    const res = await fetch(`${API_URL}/gmb/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!res.ok) {
        throw new Error(`Error fetching competitors: ${res.statusText}`);
    }

    return res.json();
}

export async function performAudit(
    clientUrl: string,
    clientData: Business | undefined,
    competitors: Business[],
    language: 'en' | 'es',
    userSearchAddress: string,
    productsList: string = "",
    zoneContext: string = ""
): Promise<AuditResult> {
    const res = await fetch(`${API_URL}/gmb/audit/ai`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            clientUrl,
            clientData,
            competitors,
            language,
            userSearchAddress,
            productsList,
        }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ejecutando auditoría: ${res.statusText}`);
    }

    return res.json();
}

export async function fetchLeads(): Promise<StoredClient[]> {
    const res = await fetch(`${API_URL}/gmb/leads`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!res.ok) {
        throw new Error(`Error fetching leads: ${res.statusText}`);
    }

    return res.json();
}

export async function createClient(data: { name: string; address: string; phone?: string; category?: string }): Promise<StoredClient> {
    const res = await fetch(`${API_URL}/gmb/clients`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        throw new Error(`Error creating client: ${res.statusText}`);
    }

    return res.json();
}

export async function getClient(id: string): Promise<StoredClient> {
    const res = await fetch(`${API_URL}/gmb/client/${id}`);
    if (!res.ok) throw new Error(`Error fetching client: ${res.statusText}`);
    return res.json();
}

export async function updateClient(id: string, data: Partial<StoredClient>): Promise<StoredClient> {
    const res = await fetch(`${API_URL}/gmb/client/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Error updating client: ${res.statusText}`);
    return res.json();
}

export async function addNote(clientId: string, content: string) {
    const res = await fetch(`${API_URL}/gmb/client/${clientId}/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`Error adding note: ${res.statusText}`);
    return res.json();
}

export async function deleteNote(id: string) {
    const res = await fetch(`${API_URL}/gmb/client/note/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Error deleting note: ${res.statusText}`);
    return res.json();
}

// --- Projects ---

export async function createProject(clientId: string, data: any) {
    const res = await fetch(`${API_URL}/gmb/clients/${clientId}/projects`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Error creating project: ${res.statusText}`);
    return res.json();
}

export async function getClientProjects(clientId: string) {
    const res = await fetch(`${API_URL}/gmb/clients/${clientId}/projects`);
    if (!res.ok) throw new Error(`Error fetching projects: ${res.statusText}`);
    return res.json();
}

export async function getAllProjects() {
    const res = await fetch(`${API_URL}/gmb/projects`);
    if (!res.ok) throw new Error(`Error fetching all projects: ${res.statusText}`);
    return res.json();
}

export async function updateProject(id: string, data: any) {
    const res = await fetch(`${API_URL}/gmb/projects/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Error updating project: ${res.statusText}`);
    return res.json();
}

export async function deleteProject(id: string) {
    const res = await fetch(`${API_URL}/gmb/projects/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Error deleting project: ${res.statusText}`);
    return res.json();
}

// --- Phases ---

export async function addPhase(projectId: string, data: any) {
    const res = await fetch(`${API_URL}/gmb/projects/${projectId}/phases`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Error adding phase: ${res.statusText}`);
    return res.json();
}

export async function updatePhase(id: string, data: any) {
    const res = await fetch(`${API_URL}/gmb/phases/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Error updating phase: ${res.statusText}`);
    return res.json();
}

export async function deletePhase(id: string) {
    const res = await fetch(`${API_URL}/gmb/phases/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Error deleting phase: ${res.statusText}`);
    return res.json();
}

export async function reorderPhase(id: string, direction: 'UP' | 'DOWN') {
    const res = await fetch(`${API_URL}/gmb/phases/${id}/reorder`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
    });
    if (!res.ok) throw new Error(`Error reordering phase: ${res.statusText}`);
    return res.json();
}

export async function uploadAttachment(phaseId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/gmb/phases/${phaseId}/attachments`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error(`Error uploading attachment: ${res.statusText}`);
    return res.json();
}

// --- Templates ---

export async function createTemplate(data: any) {
    const res = await fetch(`${API_URL}/gmb/templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Error creating template: ${res.statusText}`);
    return res.json();
}

export async function getTemplates() {
    const res = await fetch(`${API_URL}/gmb/templates`);
    if (!res.ok) throw new Error(`Error fetching templates: ${res.statusText}`);
    return res.json();
}

export async function deleteTemplate(id: string) {
    const res = await fetch(`${API_URL}/gmb/templates/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Error deleting template: ${res.statusText}`);
    return res.json();
}

// --- Reminders ---

export interface Reminder {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DISMISSED';
    user?: { id: string; name: string; email: string };
    project?: { id: string; name: string };
    client?: { id: string; name: string };
}

export async function getReminders(userId?: string): Promise<Reminder[]> {
    const url = userId ? `${API_URL}/gmb/reminders?userId=${userId}` : `${API_URL}/gmb/reminders`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error fetching reminders: ${res.statusText}`);
    return res.json();
}

export async function createReminder(data: {
    title: string;
    description?: string;
    dueDate: string;
    userId: string;
    projectId?: string;
    clientId?: string;
}): Promise<Reminder> {
    const res = await fetch(`${API_URL}/gmb/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Error creating reminder: ${res.statusText}`);
    return res.json();
}

export async function updateReminder(id: string, data: { status?: string }) {
    const res = await fetch(`${API_URL}/gmb/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Error updating reminder: ${res.statusText}`);
    return res.json();
}

export async function deleteReminder(id: string) {
    const res = await fetch(`${API_URL}/gmb/reminders/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Error deleting reminder: ${res.statusText}`);
    return res.json();
}

// --- Users ---

export interface User {
    id: string;
    email: string;
    name?: string;
}

export async function getUsers(): Promise<User[]> {
    const res = await fetch(`${API_URL}/gmb/users`);
    if (!res.ok) throw new Error(`Error fetching users: ${res.statusText}`);
    return res.json();
}

// --- Project Assignment ---

export async function assignProject(projectId: string, userId?: string) {
    const res = await fetch(`${API_URL}/gmb/projects/${projectId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error(`Error assigning project: ${res.statusText}`);
    return res.json();
}
