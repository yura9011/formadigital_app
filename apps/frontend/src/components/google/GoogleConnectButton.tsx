'use client';

import React, { useState, useEffect } from 'react';

interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
  mock: boolean;
}

import { API_URL as API_BASE } from '@/config/api';

export default function GoogleConnectButton() {
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Fetch connection status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/google-auth/status`);
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch Google status:', error);
      setStatus({ connected: false, mock: true });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        console.error('No user found');
        setConnecting(false);
        return;
      }
      const res = await fetch(`${API_BASE}/google-auth/url?userId=${userId}`);
      const data = await res.json();

      if (data.mock) {
        // Mock mode - redirect to mock callback
        window.location.href = `${API_BASE}${data.url}`;
      } else {
        // Real OAuth - redirect to Google consent
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/google-auth/disconnect`);
      setStatus({ connected: false, mock: status?.mock || true });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="google-connect-button loading">
        <div className="spinner" />
        <span>Checking connection...</span>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="google-connect-button connected">
        <div className="status-icon">✓</div>
        <div className="info">
          <span className="label">Google Connected</span>
          <span className="email">{status.email}</span>
          {status.mock && <span className="mock-badge">DEMO MODE</span>}
        </div>
        <button onClick={handleDisconnect} className="disconnect-btn">
          Disconnect
        </button>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="google-connect-button"
    >
      <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span>{connecting ? 'Connecting...' : 'Connect Google Account'}</span>
      <style jsx>{styles}</style>
    </button>
  );
}

const styles = `
  .google-connect-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: linear-gradient(145deg, #1a1a2e, #16213e);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .google-connect-button:hover:not(:disabled) {
    background: linear-gradient(145deg, #1f1f3a, #1a2744);
    border-color: rgba(100, 150, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .google-connect-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .google-connect-button.loading {
    background: rgba(255, 255, 255, 0.05);
    cursor: default;
  }

  .google-connect-button.connected {
    background: linear-gradient(145deg, #0a3d2e, #0d4035);
    border-color: rgba(52, 168, 83, 0.3);
  }

  .google-icon {
    flex-shrink: 0;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: #4285f4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .status-icon {
    width: 24px;
    height: 24px;
    background: #34a853;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
  }

  .info {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .label {
    font-weight: 600;
    font-size: 13px;
  }

  .email {
    font-size: 12px;
    opacity: 0.7;
  }

  .mock-badge {
    display: inline-block;
    padding: 2px 6px;
    background: rgba(251, 188, 5, 0.2);
    color: #fbbc05;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    margin-top: 4px;
    width: fit-content;
  }

  .disconnect-btn {
    padding: 6px 12px;
    background: rgba(234, 67, 53, 0.1);
    border: 1px solid rgba(234, 67, 53, 0.3);
    border-radius: 6px;
    color: #ea4335;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .disconnect-btn:hover {
    background: rgba(234, 67, 53, 0.2);
  }
`;
