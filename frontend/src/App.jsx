import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('civic_token') || '');
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // If we have a token stored, authenticate on backend to make sure it's valid
    if (token) {
      validateToken();
    } else {
      setCheckingAuth(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Token verification failed');
      }
      setUser(data);
    } catch (err) {
      console.error(err);
      handleLogout();
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLoginSuccess = (newToken, loggedUser) => {
    setToken(newToken);
    setUser(loggedUser);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('civic_token');
    localStorage.removeItem('civic_user');
    setToken('');
    setUser(null);
    setCurrentTab('dashboard');
  };

  // Helper method for demo simulation to switch user roles on-the-fly
  const handleSimulateRoleSwitch = async (targetRole) => {
    if (!user) return;
    
    // Simulate updating user state locally and on local variables
    const updatedUser = {
      ...user,
      role: targetRole,
      full_name: targetRole === 'admin' ? 'Demo Admin Partner' : 'Demo Citizen User'
    };
    
    setUser(updatedUser);
    localStorage.setItem('civic_user', JSON.stringify(updatedUser));
    setCurrentTab('dashboard');
  };

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#020617',
        color: '#f8fafc',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>CivicCare Portal</h2>
          <p style={{ color: '#94a3b8' }}>Establishing secure backend connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Dev Simulator Banner */}
      {user && (
        <div className="dev-banner">
          <span>⚙️ DEMO EMULATOR: View app as different user class:</span>
          <select 
            value={user.role} 
            onChange={(e) => handleSimulateRoleSwitch(e.target.value)}
          >
            <option value="citizen">Citizen Account View</option>
            <option value="admin">Administrator Account View</option>
          </select>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            (Changes client permissions on the fly)
          </span>
        </div>
      )}

      {/* Main navigation */}
      <Navbar 
        user={user} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onLogout={handleLogout} 
      />

      <main className="main-content">
        {!user ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : user.role === 'admin' ? (
          <AdminDashboard 
            user={user} 
            token={token} 
            viewDensityTab={currentTab === 'density'} 
          />
        ) : (
          <CitizenDashboard 
            user={user} 
            token={token} 
          />
        )}
      </main>
    </div>
  );
}
