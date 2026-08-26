import React, { useState } from 'react';
import { Landmark, Mail, Lock, User, ShieldAlert, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('citizen'); // default role is citizen
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister ? 'http://localhost:5001/api/auth/register' : 'http://localhost:5001/api/auth/login';
    const payload = isRegister 
      ? { email, password, full_name: fullName, role } 
      : { email, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Store in localStorage
      localStorage.setItem('civic_token', data.token);
      localStorage.setItem('civic_user', JSON.stringify(data.user));
      
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (type) => {
    if (type === 'admin') {
      setEmail('admin@civic.gov');
      setPassword('admin123');
      setIsRegister(false);
    } else {
      setEmail('citizen@civic.gov');
      setPassword('citizen123');
      setIsRegister(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.1)'
          }}>
            <Landmark size={32} color="#38bdf8" />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.75px', marginBottom: '0.25rem' }}>
            Civic<span style={{ color: '#38bdf8' }}>Care</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            {isRegister ? 'Join our community report network' : 'Secure Access Civic Management Console'}
          </p>
        </div>

        {/* Glass Card Form */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
            {isRegister ? 'Create Citizen Account' : 'Sign In'}
          </h3>

          {error && (
            <div className="alert-banner alert-banner-error" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: '2.5rem' }} 
                    placeholder="Enter your name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="name@agency.gov or mail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {isRegister && (
              <div className="form-group">
                <label className="form-label">Account Privilege Role</label>
                <select 
                  className="form-select" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="citizen">Citizen (Submit Issues & View Progress)</option>
                  <option value="admin">Administrator (Resolve Issues & View Analytics)</option>
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Processing Authentication...' : isRegister ? 'Register Account' : 'Authenticate Credentials'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Toggle Register/Login Link */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button 
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
            >
              {isRegister ? 'Sign In here' : 'Register Citizen Account'}
            </button>
          </div>
        </div>

        {/* Demo Fast Login Helpers */}
        <div style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 700 }}>
            🛠️ Developer Demo Panel
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => fillCredentials('citizen')}>
              Quick Citizen
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => fillCredentials('admin')}>
              Quick Admin
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
            Loads preset demo credentials and sets up local data simulations.
          </p>
        </div>

      </div>
    </div>
  );
}
