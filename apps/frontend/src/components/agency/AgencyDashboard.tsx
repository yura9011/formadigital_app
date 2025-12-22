'use client';

import React, { useState, useEffect } from 'react';

interface AgencyClient {
  id: string;
  name: string;
  email?: string;
  googleConnected: boolean;
  gbpLocations: number;
  pendingReviews: number;
  lastActivity?: string;
}

interface AgencyOverview {
  totalClients: number;
  connectedClients: number;
  totalLocations: number;
  totalPendingReviews: number;
  clients: AgencyClient[];
}

interface ReviewAlert {
  clientId: string;
  clientName: string;
  reviewId: string;
  rating: number;
  comment: string;
  timeAgo: string;
  urgent: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';

export default function AgencyDashboard() {
  const [overview, setOverview] = useState<AgencyOverview | null>(null);
  const [alerts, setAlerts] = useState<ReviewAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '' });
  const [createInitialProject, setCreateInitialProject] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [overviewRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/agency/overview`),
        fetch(`${API_BASE}/agency/alerts`),
      ]);
      setOverview(await overviewRes.json());
      setAlerts(await alertsRes.json());
    } catch (error) {
      console.error('Failed to fetch agency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) return;
    try {
      // 1. Create the agency client (User)
      const res = await fetch(`${API_BASE}/agency/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });

      if (res.ok) {
        // 2. If checkbox is checked, also create a project
        if (createInitialProject) {
          // First create a Client record for Projects
          const clientRes = await fetch(`${API_BASE}/gmb/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newClient.name,
              address: newClient.email
            }),
          });

          if (clientRes.ok) {
            const clientData = await clientRes.json();

            // Create the initial project
            await fetch(`${API_BASE}/gmb/clients/${clientData.id}/projects`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: 'Primer contacto con cliente'
              }),
            });
          }
        }

        setNewClient({ name: '', email: '' });
        setCreateInitialProject(true);
        setShowAddClient(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add client:', error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to remove this client?')) return;
    try {
      await fetch(`${API_BASE}/agency/clients/${clientId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const getInviteLink = async (clientId: string) => {
    try {
      const res = await fetch(`${API_BASE}/agency/clients/${clientId}/invite`);
      const data = await res.json();
      navigator.clipboard.writeText(data.inviteLink);
      alert('Invite link copied to clipboard!');
    } catch (error) {
      console.error('Failed to get invite link:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center font-bold">Loading agency dashboard...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b-4 border-black">
        <h1 className="text-3xl font-black uppercase">🏢 Agency Dashboard</h1>
        <button
          onClick={() => setShowAddClient(true)}
          className="bg-neo-blue text-white px-6 py-3 border-2 border-black shadow-neo font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all"
        >
          + Add Client
        </button>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-black shadow-neo p-6">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-4xl font-black">{overview.totalClients}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Total Clients</div>
          </div>
          <div className="bg-green-100 border-2 border-black shadow-neo p-6 border-l-4 border-l-green-500">
            <div className="text-3xl mb-2">✓</div>
            <div className="text-4xl font-black">{overview.connectedClients}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Connected</div>
          </div>
          <div className="bg-white border-2 border-black shadow-neo p-6">
            <div className="text-3xl mb-2">📍</div>
            <div className="text-4xl font-black">{overview.totalLocations}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Locations</div>
          </div>
          <div className="bg-red-100 border-2 border-black shadow-neo p-6 border-l-4 border-l-red-500">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-4xl font-black">{overview.totalPendingReviews}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Pending</div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">🔔 Review Alerts</h2>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`bg-white border-2 border-black shadow-neo p-4 flex items-center gap-4 ${alert.urgent ? 'border-l-4 border-l-red-500 bg-red-50' : ''}`}
              >
                <div className="text-yellow-500 text-lg">{'★'.repeat(alert.rating)}{'☆'.repeat(5 - alert.rating)}</div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold">{alert.clientName}</span>
                    <span className="text-sm text-gray-500">{alert.timeAgo}</span>
                  </div>
                  <p className="text-gray-700 truncate">{alert.comment}</p>
                </div>
                <button className="bg-neo-blue text-white px-4 py-2 border-2 border-black font-bold text-sm uppercase shadow-neo-sm hover:shadow-neo transition-all">
                  Respond
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div>
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">📋 All Clients</h2>
        <div className="bg-white border-2 border-black shadow-neo overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="p-4 text-left font-black uppercase">Client</th>
                <th className="p-4 text-left font-black uppercase">Email</th>
                <th className="p-4 text-left font-black uppercase">Status</th>
                <th className="p-4 text-center font-black uppercase">Locations</th>
                <th className="p-4 text-center font-black uppercase">Pending</th>
                <th className="p-4 text-left font-black uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview?.clients.map((client) => (
                <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 font-bold">{client.name}</td>
                  <td className="p-4 text-gray-600">{client.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 border-2 border-black font-bold text-xs uppercase ${client.googleConnected ? 'bg-green-400' : 'bg-yellow-400'}`}>
                      {client.googleConnected ? 'Connected' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold">{client.gbpLocations}</td>
                  <td className="p-4 text-center font-bold">{client.pendingReviews}</td>
                  <td className="p-4 flex gap-2">
                    {!client.googleConnected && (
                      <button
                        onClick={() => getInviteLink(client.id)}
                        className="bg-neo-blue text-white px-3 py-1 border-2 border-black font-bold text-xs uppercase"
                      >
                        📧 Invite
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="bg-red-400 text-white px-3 py-1 border-2 border-black font-bold text-xs"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddClient(false)}>
          <div className="bg-white border-4 border-black shadow-neo-lg p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black uppercase mb-6 border-b-2 border-black pb-2">Add New Client</h3>
            <input
              type="text"
              placeholder="Nombre del Cliente"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full p-3 border-2 border-black mb-4 font-medium focus:outline-none focus:ring-2 focus:ring-neo-blue"
            />
            <input
              type="email"
              placeholder="Email del Cliente"
              value={newClient.email}
              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              className="w-full p-3 border-2 border-black mb-4 font-medium focus:outline-none focus:ring-2 focus:ring-neo-blue"
            />

            {/* Checkbox for auto-creating project */}
            <label className="flex items-center gap-3 p-3 border-2 border-black mb-6 bg-neo-yellow/20 cursor-pointer hover:bg-neo-yellow/30 transition-all">
              <input
                type="checkbox"
                checked={createInitialProject}
                onChange={(e) => setCreateInitialProject(e.target.checked)}
                className="w-5 h-5 border-2 border-black accent-neo-blue"
              />
              <div>
                <span className="font-bold">Crear proyecto "Primer contacto"</span>
                <p className="text-xs text-gray-600">Automáticamente crea un proyecto con fase inicial</p>
              </div>
            </label>

            <div className="flex gap-4">
              <button
                onClick={() => setShowAddClient(false)}
                className="flex-1 p-3 border-2 border-black font-bold uppercase bg-gray-200 hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                className="flex-1 p-3 border-2 border-black font-bold uppercase bg-neo-blue text-white shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
