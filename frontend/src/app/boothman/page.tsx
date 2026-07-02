'use client';

import { useState } from 'react';
import { loginAction, boothLoginAction } from './actions';
import { Shield, MapPin, User, Lock, ArrowRight, BadgeCheck } from 'lucide-react';
import Link from 'next/link';

function FlatField({ label, icon, placeholder, type = "text", value, onChange, name, defaultValue }: { label: string, icon: React.ReactNode, placeholder: string, type?: string, value?: any, onChange?: any, name: string, defaultValue?: string }) {
    const slate200 = "#e2e8f0";
    const slate50 = "#f8fafc";
    const slate300 = "#cbd5e1";
    const slate400 = "#94a3b8";

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '9px', fontWeight: 900, color: slate400, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '4px' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: slate300 }}>{icon}</div>
                <input
                    type={type}
                    name={name}
                    defaultValue={defaultValue}
                    style={{
                        width: '100%', backgroundColor: slate50, border: `1px solid ${slate200}`, borderRadius: '12px', padding: '16px 16px 16px 48px', fontSize: '12px', fontWeight: 700, outline: 'none', transition: 'all 0.2s ease', color: '#0f172a'
                    }}
                    placeholder={placeholder}
                    required
                    onFocus={(e) => e.target.style.borderColor = "#D4AF37"}
                    onBlur={(e) => e.target.style.borderColor = slate200}
                />
            </div>
        </div>
    );
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'BOOTH'>('ADMIN');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navy = "#0f172a";
  const gold = "#D4AF37";
  const slate400 = "#94a3b8";
  const slate500 = "#64748b";
  const slate50 = "#f8fafc";
  const slate100 = "#f1f5f9";
  const white = "#ffffff";
  const blue50 = "#eff6ff";
  const blue100 = "#dbeafe";
  const blue500 = "#3b82f6";
  const blue700 = "#1d4ed8";

  const handleAdminLogin = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const res = await loginAction(formData);
    if (res?.error) setError(res.error);
    setLoading(false);
  };

  const handleBoothLogin = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const res = await boothLoginAction(formData);
    if (res?.error) setError(res.error);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: white, fontFamily: 'Public Sans, Inter, sans-serif', overflow: 'hidden' }}>
        {/* Left Panel - Navy Blue */}
        <div style={{
            display: 'none',
            width: '50%',
            backgroundColor: navy,
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
            position: 'relative',
            borderRight: `1px solid ${gold}22`,
            overflow: 'hidden'
        }} className="lg-flex">
            <style dangerouslySetInnerHTML={{ __html: `@media (min-width: 1024px) { .lg-flex { display: flex !important; } }` }} />

            <div style={{ maxWidth: '448px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '64px' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: `${gold}1a`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', border: `1px solid ${gold}33` }}>
                        <Shield size={32} color={gold} />
                    </div>
                    <div style={{ height: '6px', width: '80px', backgroundColor: gold, marginBottom: '24px' }} />
                    <span style={{ color: slate500, fontSize: '12px', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
                        Delhi Cantt Node
                    </span>
                </div>

                <h1 style={{ color: white, fontSize: '42px', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.03em' }}>
                    Boothman Volunteer Command
                </h1>

                <p style={{ color: slate400, fontSize: '18px', fontWeight: 500, lineHeight: 1.6, maxWidth: '384px' }}>
                    Dedicated infrastructure for Booth Coordinators and Volunteers. Real-time geographical assignment and task tracking.
                </p>
            </div>
        </div>

        {/* Right Panel - White */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px', backgroundColor: white, overflowY: 'auto' }} className="right-panel">
            <style dangerouslySetInnerHTML={{ __html: `@media (min-width: 1024px) { .right-panel { width: 50% !important; padding: 0 80px !important; } }` }} />

            <div style={{ maxWidth: '520px', width: '100%', margin: '0 auto', padding: '60px 0' }}>
                
                {/* Header Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
                    <div style={{ display: 'flex', gap: '8px', backgroundColor: slate50, padding: '4px', borderRadius: '16px', border: `1px solid ${slate100}` }}>
                        <button
                            onClick={() => setActiveTab('ADMIN')}
                            style={{
                                padding: '10px 16px', borderRadius: '12px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', border: 'none', cursor: 'pointer',
                                backgroundColor: activeTab === 'ADMIN' ? navy : 'transparent',
                                color: activeTab === 'ADMIN' ? white : slate400,
                                boxShadow: activeTab === 'ADMIN' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                            }}
                        >
                            <User size={14} color={activeTab === 'ADMIN' ? gold : slate400} /> 
                            Admin
                        </button>
                        <button
                            onClick={() => setActiveTab('BOOTH')}
                            style={{
                                padding: '10px 16px', borderRadius: '12px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', border: 'none', cursor: 'pointer',
                                backgroundColor: activeTab === 'BOOTH' ? navy : 'transparent',
                                color: activeTab === 'BOOTH' ? white : slate400,
                                boxShadow: activeTab === 'BOOTH' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                            }}
                        >
                            <MapPin size={14} color={activeTab === 'BOOTH' ? gold : slate400} /> 
                            Booth
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '30px', fontWeight: 900, color: navy, letterSpacing: '-0.025em' }}>
                        Authorized Login
                    </h2>
                    <p style={{ color: slate400, fontSize: '10px', fontWeight: 900, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                        BOOTHMAN ELECTION CONTROL
                    </p>
                </div>

                {error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '14px', borderRadius: '12px', marginBottom: '24px', fontSize: '11px', fontWeight: 700, border: '1px solid #fecaca' }}>
                        {error}
                    </div>
                )}

                {activeTab === 'ADMIN' ? (
                    <form action={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <FlatField label="Phone Number" name="phone" icon={<User size={16} />} placeholder="Enter registered mobile" />
                        <FlatField label="Security Key" name="password" type="password" defaultValue="password" icon={<Lock size={16} />} placeholder="••••••••" />
                        
                        <button type="submit" disabled={loading} style={{
                            width: '100%', backgroundColor: navy, color: white, padding: '18px', marginTop: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                        }}>
                            {loading ? 'Authorizing...' : 'Initiate Session'}
                            {!loading && <ArrowRight size={16} color={gold} />}
                        </button>
                    </form>
                ) : (
                    <form action={handleBoothLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ backgroundColor: blue50, border: `1px solid ${blue100}`, padding: '16px', borderRadius: '16px', fontSize: '12px', color: blue700, fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <MapPin size={16} color={blue500} style={{ flexShrink: 0, marginTop: '2px' }} />
                            Log in directly to a polling station's dashboard to manage nearby volunteers and tasks.
                        </div>
                        
                        <FlatField label="Part Number" name="partNumber" icon={<BadgeCheck size={16} />} placeholder="e.g. AC38-001" />
                        <FlatField label="Security Pin" name="password" type="password" defaultValue="123456" icon={<Lock size={16} />} placeholder="••••••••" />
                        
                        <button type="submit" disabled={loading} style={{
                            width: '100%', backgroundColor: gold, color: navy, padding: '18px', marginTop: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                        }}>
                            {loading ? 'Authorizing...' : 'Initiate Session'}
                            {!loading && <ArrowRight size={16} color={navy} />}
                        </button>
                    </form>
                )}

                <footer style={{ marginTop: '48px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: slate400, fontWeight: 700, letterSpacing: '0.1em' }}>© 2026</span>
                        <span style={{ fontSize: '10px', color: slate400, fontWeight: 700, letterSpacing: '0.1em' }}>• NATIONAL DATA NETWORK</span>
                    </div>
                    <span style={{ fontSize: '10px', color: gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        ELECTION CONTROL CENTER
                    </span>
                </footer>
                
            </div>
        </div>
    </div>
  );
}
