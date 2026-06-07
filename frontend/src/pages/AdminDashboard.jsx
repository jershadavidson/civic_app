import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, CheckCircle, Clock, MapPin, Eye, Edit2, SlidersHorizontal, Search, RefreshCw, BarChart, X } from 'lucide-react';
import InteractiveMap from '../components/InteractiveMap';

export default function AdminDashboard({ user, token, viewDensityTab = false }) {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({ summary: { total: 0, reported: 0, under_review: 0, in_progress: 0, resolved: 0 }, categories: [], densityZones: [] });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Issue Details & Resolution state
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [adminComment, setAdminComment] = useState('');

  // Alert State
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchIssues();
    fetchStats();
  }, [statusFilter, categoryFilter, priorityFilter, searchQuery]);

  // If tab changes, refresh statistics
  useEffect(() => {
    fetchStats();
  }, [viewDensityTab]);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/issues?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (categoryFilter) url += `category=${categoryFilter}&`;
      if (priorityFilter) url += `priority=${priorityFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setIssues(data);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Error fetching incident reports.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/issues/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadIssueDetail = async (issueId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/issues/${issueId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setSelectedIssueDetail(data);
      setNewStatus(data.issue.status);
      setNewPriority(data.issue.priority);
      setAdminComment('');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Could not retrieve report logs.');
    }
  };

  const handleUpdateIssue = async (e) => {
    e.preventDefault();
    if (!selectedIssueDetail) return;

    setUpdating(true);
    try {
      const res = await fetch(`http://localhost:5000/api/issues/${selectedIssueDetail.issue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          priority: newPriority,
          admin_comment: adminComment || `Administrator updated issue settings (Status: ${newStatus.toUpperCase()}, Priority: ${newPriority.toUpperCase()}).`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      triggerAlert('success', 'Incident settings updated & email notification triggered.');
      
      // Reload detail & issue list
      loadIssueDetail(selectedIssueDetail.issue.id);
      fetchIssues();
      fetchStats();
    } catch (err) {
      console.error(err);
      triggerAlert('error', err.message || 'Failed to update issue.');
    } finally {
      setUpdating(false);
    }
  };

  // Density View Page Layout
  if (viewDensityTab) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Problem Density & Hotspot Analysis</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Geographically grouped incidents to identify high-density problem zones. Use this to prioritize municipal resources.
          </p>
        </div>

        <div className="dashboard-grid">
          {/* Left Side: Heatmap Map */}
          <div className="glass-card" style={{ height: '520px', padding: 0, overflow: 'hidden' }}>
            <InteractiveMap 
              issues={issues} 
              role="admin" 
              heatmapMode={true} 
            />
          </div>

          {/* Right Side: Analytical list of hotspots */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              🔥 Prioritized Problem Zones
            </h3>

            {stats.densityZones.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                No active problem zones calculated.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
                {stats.densityZones.map((zone, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: zone.density_count > 3 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${zone.density_count > 3 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)'}`,
                      borderRadius: '8px',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>
                        ZONE #{idx + 1} ({parseFloat(zone.lat).toFixed(3)}, {parseFloat(zone.lng).toFixed(3)})
                      </span>
                      <span className={`badge ${zone.density_count > 3 ? 'badge-high' : 'badge-reported'}`} style={{ fontWeight: 800 }}>
                        {zone.density_count} Reports
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                      Primary Hazard: <strong style={{ color: '#38bdf8' }}>{zone.primary_category.toUpperCase().replace('_', ' ')}</strong>
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recent issues in this zone:</span>
                      {zone.issue_titles.map((title, idt) => (
                        <span key={idt} style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          • {title}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard Admin Dashboard Tab
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Alert Notices */}
      {alert && (
        <div className={`alert-banner alert-banner-${alert.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} />
            <span>{alert.message}</span>
          </div>
        </div>
      )}

      {/* Analytics Counter Banner */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <span className="stat-label">Total Reports</span>
          <span className="stat-value">{stats.summary.total}</span>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className="stat-label" style={{ color: '#f59e0b' }}>New Reported</span>
          <span className="stat-value">{stats.summary.reported}</span>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <span className="stat-label" style={{ color: '#a855f7' }}>Under Review</span>
          <span className="stat-value">{stats.summary.under_review}</span>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <span className="stat-label" style={{ color: '#3b82f6' }}>In Progress</span>
          <span className="stat-value">{stats.summary.in_progress}</span>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span className="stat-label" style={{ color: '#10b981' }}>Resolved</span>
          <span className="stat-value">{stats.summary.resolved}</span>
        </div>
      </div>

      {/* Admin Central Dashboard Grid */}
      <div className="dashboard-grid-full" style={{ display: 'grid', gap: '1.5rem' }}>
        
        {/* Table View left */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Manage Incident Reports</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Inspect, prioritize and update citizen reported issues.</p>
            </div>
            
            <button className="btn btn-secondary" onClick={() => { fetchIssues(); fetchStats(); }} title="Refresh database records">
              <RefreshCw size={16} />
              Sync
            </button>
          </div>

          {/* Filtering row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'rgba(255,255,255,0.01)',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
              <Search size={16} color="#64748b" />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search by keywords..." 
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '0.5rem', fontSize: '0.85rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="under_review">Under Review</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '0.5rem', fontSize: '0.85rem' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="pothole">Pothole</option>
              <option value="street_light">Street Light</option>
              <option value="leak">Water Leak</option>
              <option value="trash">Trash Dump</option>
              <option value="road_block">Road Block</option>
              <option value="other">Other</option>
            </select>

            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '0.5rem', fontSize: '0.85rem' }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Table list */}
          <div className="table-container">
            {loading ? (
              <p style={{ color: '#94a3b8', padding: '2rem 0' }}>Retrieving cases...</p>
            ) : issues.length === 0 ? (
              <p style={{ color: '#64748b', padding: '2rem 0', textAlign: 'center' }}>No tickets match active search queries.</p>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{issue.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{issue.address.substring(0, 30)}{issue.address.length > 30 ? '...' : ''}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{issue.category.replace('_', ' ')}</td>
                      <td>
                        <span className={`badge badge-${issue.priority}`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${issue.status}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(issue.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => loadIssueDetail(issue.id)}>
                          <Eye size={12} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Map View right */}
        <div className="glass-card" style={{ height: '360px', padding: 0, overflow: 'hidden' }}>
          <InteractiveMap issues={issues} role="admin" />
        </div>

      </div>

      {/* Detail & Action Resolution Drawer Modal */}
      {selectedIssueDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1.5rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => setSelectedIssueDetail(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              Issue Details & Resolution Center
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              
              {/* Left Column info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{selectedIssueDetail.issue.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Reporter: <strong>{selectedIssueDetail.issue.reporter_name}</strong> ({selectedIssueDetail.issue.reporter_email})
                  </p>
                </div>

                {selectedIssueDetail.issue.image_url && (
                  <img 
                    src={selectedIssueDetail.issue.image_url} 
                    alt="Evidence Photo" 
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} 
                  />
                )}

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Description</span>
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{selectedIssueDetail.issue.description}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Address</span>
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{selectedIssueDetail.issue.address}</p>
                </div>

                {/* Timeline comments logs */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem' }}>Comments History</h5>
                  <div className="timeline">
                    {selectedIssueDetail.timeline.map((log) => (
                      <div key={log.id} className="timeline-item">
                        <div className={`timeline-dot ${log.status_changed_to ? `dot-${log.status_changed_to}` : ''}`}></div>
                        <div className="timeline-header">
                          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                            {log.author_name || 'System Auto-Log'}
                          </span>
                          <span className="timeline-meta" style={{ fontSize: '0.7rem' }}>
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="timeline-body" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                          {log.comment_text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right/Bottom Admin Resolution Form */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
                    <Shield size={18} />
                    Resolve Ticket
                  </h4>

                  <form onSubmit={handleUpdateIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Set Case Status</label>
                      <select 
                        className="form-select"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="reported">Reported (Pending)</option>
                        <option value="under_review">Under Review</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved (Completed)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Set Case Priority</label>
                      <select 
                        className="form-select"
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Admin Update Comment / Email Alert Details</label>
                      <textarea 
                        className="form-textarea"
                        placeholder="Write comments for the citizen (this logs into the history and sends a mock status email notification)..."
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={updating}>
                      <Edit2 size={14} />
                      {updating ? 'Saving resolution settings...' : 'Update Settings & Alert Citizen'}
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
