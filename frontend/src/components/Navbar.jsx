import React from 'react';
import { LogOut, Shield, User, Landmark, BarChart3, AlertCircle } from 'lucide-react';

export default function Navbar({ user, currentTab, setCurrentTab, onLogout }) {
  if (!user) return null;

  return (
    <header style={{
      background: 'rgba(11, 19, 41, 0.75)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      padding: '0.75rem 2rem'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setCurrentTab('dashboard')}>
          <Landmark size={28} color="#38bdf8" style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
              Civic<span style={{ color: '#38bdf8' }}>Care</span>
            </h1>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', tracking: '1px' }}>
              Issue Portal
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setCurrentTab('dashboard')}
          >
            <AlertCircle size={16} />
            Dashboard
          </button>
          
          {user.role === 'admin' && (
            <button 
              className={`btn ${currentTab === 'density' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setCurrentTab('density')}
            >
              <BarChart3 size={16} />
              Density Analysis
            </button>
          )}
        </nav>

        {/* User profile & controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: user.role === 'admin' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              border: `1px solid ${user.role === 'admin' ? '#a855f7' : '#38bdf8'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {user.role === 'admin' ? (
                <Shield size={18} color="#c084fc" />
              ) : (
                <User size={18} color="#38bdf8" />
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user.full_name}</span>
              <span className={`badge ${user.role === 'admin' ? 'badge-under_review' : 'badge-in_progress'}`} style={{ alignSelf: 'flex-start', padding: '1px 8px', fontSize: '0.6rem' }}>
                {user.role.toUpperCase()}
              </span>
            </div>
          </div>

          <button 
            className="btn btn-danger" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={onLogout}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
