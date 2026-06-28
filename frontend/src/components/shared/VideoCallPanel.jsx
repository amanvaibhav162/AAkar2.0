import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

const token = () => localStorage.getItem('token');
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

export default function VideoCallPanel({ hierarchy, userRole }) {
  const { currentUser } = useAuth();
  const [subordinates, setSubordinates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  
  const [roomToken, setRoomToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const HISTORY_PAGE_SIZE = 10;
  const [callPage, setCallPage] = useState(1);
  const [callTotalPages, setCallTotalPages] = useState(1);

  const fetchSubordinates = async () => {
    try {
      const res = await fetch('/api/v1/video-calls/subordinates', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setSubordinates(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchActiveCalls = async () => {
    try {
      const res = await fetch('/api/v1/video-calls/active', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setActiveCalls(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchCallHistory = async (p = callPage) => {
    try {
      const res = await fetch(`/api/v1/video-calls/history?page=${p}&page_size=${HISTORY_PAGE_SIZE}`, { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setCallHistory(Array.isArray(data.items) ? data.items : []);
      setCallTotalPages(data.pages || 1);
      setCallPage(data.page || 1);
    } catch (e) { console.error(e); }
  };

  const deleteHistory = async () => {
    try {
      await fetch('/api/v1/video-calls/history', { method: 'DELETE', headers: headers() });
      setCallHistory([]);
      setCallPage(1);
      setCallTotalPages(1);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSubordinates();
    fetchActiveCalls();
    fetchCallHistory();
    const interval = setInterval(fetchActiveCalls, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleRecipient = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const startNewCall = async () => {
    if (selectedIds.length === 0) return;
    setIsConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/v1/video-calls/create-room', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ participant_ids: selectedIds })
      });
      const data = await res.json();
      if (res.ok) {
        setRoomToken(data.token);
        setLivekitUrl(data.livekit_url);
        setCurrentRoomName(data.room_name);
      } else {
        setError(data.detail || 'Failed to create room');
      }
    } catch (e) {
      setError('Network error creating room');
    }
    setIsConnecting(false);
  };

  const joinExistingCall = async (roomName) => {
    setIsConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/v1/video-calls/token', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ room_name: roomName })
      });
      const data = await res.json();
      if (res.ok) {
        setRoomToken(data.token);
        setLivekitUrl(data.livekit_url);
        setCurrentRoomName(roomName);
      } else {
        setError(data.detail || 'Failed to join room');
      }
    } catch (e) {
      setError('Network error joining room');
    }
    setIsConnecting(false);
  };

  const handleDisconnected = async () => {
    if (currentRoomName) {
      // Tell backend call is over (if initiator, this updates duration)
      try {
        await fetch('/api/v1/video-calls/end', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ room_name: currentRoomName })
        });
      } catch (e) { console.error(e); }
    }
    
    setRoomToken(null);
    setLivekitUrl(null);
    setCurrentRoomName(null);
    setSelectedIds([]);
    fetchActiveCalls();
    fetchCallHistory();
  };

  const targetLabel = subordinates.length > 0 ? subordinates[0].role.replace(/_/g, ' ') : 'Subordinates';

  // State 2: Active Call View
  if (roomToken && livekitUrl) {
    return (
      <div className="fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        <div className="dash-page-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="dash-page-title">Live Video Conference</div>
            <div className="dash-page-subtitle">Room: {currentRoomName}</div>
          </div>
          <button className="btn" style={{ background: '#dc2626', color: 'white', fontWeight: 800 }} onClick={handleDisconnected}>
            END CALL
          </button>
        </div>
        <div style={{ flex: 1, background: '#0f172a', borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b' }}>
          <LiveKitRoom
            video={true}
            audio={true}
            token={roomToken}
            serverUrl={livekitUrl}
            onDisconnected={handleDisconnected}
            data-lk-theme="default"
            style={{ height: '100%' }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  // State 1: Lobby View
  return (
    <div className="fade-in">
      <div className="dash-page-header">
        <div>
          <div className="dash-page-title">Video Conference</div>
          <div className="dash-page-subtitle">Start or join a group call with your team</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 20, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Active Calls Banner */}
      {activeCalls.length > 0 && (
        <div className="dash-section" style={{ border: '2px solid var(--amber-500)', background: '#fffbeb' }}>
          <div className="dash-section-head" style={{ background: 'transparent' }}>
            <h3 style={{ color: 'var(--amber-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }} />
              Active Conference Calls
            </h3>
          </div>
          <div className="dash-section-body">
            {activeCalls.map(call => (
              <div key={call.room_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'white', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--navy-900)' }}>Initiated by: {call.initiator_name} ({call.initiator_role.replace('_', ' ')})</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>
                    Started: {new Date(call.started_at).toLocaleTimeString()}
                  </div>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => joinExistingCall(call.room_name)}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'CONNECTING...' : 'JOIN CALL'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dash-grid-2">
        {/* Start New Call */}
        <div className="dash-section">
          <div className="dash-section-head"><h3>Start New Conference</h3></div>
          <div className="dash-section-body">
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Invite {targetLabel}
              </label>

              {subordinates.length > 0 ? (
                <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 4 }}>
                  {subordinates.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--gray-100)' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleRecipient(s.id)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span style={{ fontWeight: 600 }}>{s.display_name}</span>
                      <span style={{ color: 'var(--gray-400)', fontSize: 11, marginLeft: 4 }}>({s.email})</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 16, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 4, fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
                  You don't have any direct subordinates to invite.
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={startNewCall}
              disabled={isConnecting || selectedIds.length === 0}
              style={{ width: '100%', padding: '12px', fontSize: 14 }}
            >
              {isConnecting ? 'INITIALIZING...' : `START CALL (${selectedIds.length} invited)`}
            </button>
          </div>
        </div>

        {/* Call History */}
        <div className="dash-section">
          <div className="dash-section-head">
            <h3>Call History</h3>
            {callHistory.length > 0 && (
              <button className="btn" style={{ fontSize: 11, padding: '4px 10px', color: '#dc2626' }} onClick={deleteHistory}>
                CLEAR
              </button>
            )}
          </div>
          <div className="dash-section-body" style={{ padding: 0 }}>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Initiator</th>
                    <th>Date</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {callHistory.map(call => (
                    <tr key={call.room_name}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                          {call.initiator_name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>
                          {call.initiator_role.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{new Date(call.started_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{new Date(call.started_at).toLocaleTimeString()}</div>
                      </td>
                      <td>
                        {call.status === 'active' ? (
                          <span style={{ color: '#059669', fontWeight: 800, fontSize: 11 }}>IN PROGRESS</span>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {callHistory.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                        No call history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {callTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--gray-200)' }}>
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  disabled={callPage <= 1}
                  onClick={() => fetchCallHistory(callPage - 1)}
                >
                  ‹ PREV
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)' }}>
                  Page {callPage} of {callTotalPages}
                </span>
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  disabled={callPage >= callTotalPages}
                  onClick={() => fetchCallHistory(callPage + 1)}
                >
                  NEXT ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
