import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const token = () => localStorage.getItem('token');
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

/**
 * Global floating notification banner for incoming video calls.
 * This component polls /api/v1/video-calls/active every 5 seconds
 * and shows a persistent banner at the top of the screen when
 * there's an active call the user can join.
 * 
 * Place this component in the main layout so it's always visible
 * regardless of which dashboard tab is active.
 */
export default function IncomingCallBanner() {
  const [activeCalls, setActiveCalls] = useState([]);
  const [dismissed, setDismissed] = useState({});
  const router = useRouter();

  useEffect(() => {
    if (!token()) return;

    const fetchActive = async () => {
      try {
        const res = await fetch('/api/v1/video-calls/active', { headers: headers() });
        if (!res.ok) return;
        const data = await res.json();
        setActiveCalls(Array.isArray(data) ? data : []);
      } catch (e) { /* silent */ }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 5000);
    return () => clearInterval(interval);
  }, []);

  const visibleCalls = activeCalls.filter(c => !dismissed[c.room_name]);

  if (visibleCalls.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 420,
    }}>
      {visibleCalls.map(call => (
        <div
          key={call.room_name}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '2px solid #f59e0b',
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.3)',
            animation: 'slideInRight 0.4s ease-out, glowPulse 2s ease-in-out infinite',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
              animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b' }}>
              Incoming Call
            </span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
            {call.initiator_name}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
            {call.initiator_role?.replace(/_/g, ' ')} • Started {new Date(call.started_at).toLocaleTimeString()}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => router.push('/election?tab=video-call')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 900,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              JOIN CALL
            </button>
            <button
              onClick={() => setDismissed(prev => ({ ...prev, [call.room_name]: true }))}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              DISMISS
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.3); }
          50% { box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 12px rgba(245,158,11,0.5); }
        }
      `}</style>
    </div>
  );
}
