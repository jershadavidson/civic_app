import React, { useState, useEffect } from 'react';
import { MapPin, Image as ImageIcon, Send, Clock, CheckCircle2, AlertCircle, MessageSquare, PlusCircle, X } from 'lucide-react';
import InteractiveMap from '../components/InteractiveMap';

export default function CitizenDashboard({ user, token }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('pothole');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [imageBase64, setImageBase64] = useState('');

  // UI States
  const [alert, setAlert] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    fetchMyIssues();
  }, []);

  const fetchMyIssues = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/issues?my_issues=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setIssues(data);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to retrieve your issues.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Reverse geocode lat/lng to human-readable address using Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  // Handle map click selection
  const handleLocationSelect = (lat, lng) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    reverseGeocode(lat, lng);
  };

  // Get current browser coordinates
  const detectLocation = () => {
    if (!navigator.geolocation) {
      triggerAlert('error', 'Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        reverseGeocode(lat, lng);
        triggerAlert('success', 'Current coordinates detected!');
      },
      (error) => {
        console.error(error);
        triggerAlert('error', 'Unable to retrieve location. Please click the map instead.');
      }
    );
  };

  // Convert uploaded image to Base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit issue report
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category || !latitude || !longitude) {
      triggerAlert('error', 'Please complete all required fields and pin a location.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          category,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address,
          image_url: imageBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      triggerAlert('success', 'Civic issue report filed successfully!');
      
      // Clear form
      setTitle('');
      setCategory('pothole');
      setDescription('');
      setLatitude('');
      setLongitude('');
      setAddress('');
      setImageBase64('');

      // Refresh list
      fetchMyIssues();
    } catch (err) {
      console.error(err);
      triggerAlert('error', err.message || 'Error submitting report.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch issue details & timeline comments
  const handleViewDetails = async (issueId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/issues/${issueId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSelectedIssue(data);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Could not load issue history.');
    }
  };

  // Add a comment to timeline
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommenting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/issues/${selectedIssue.issue.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment_text: newComment })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Append comment to active detailed issue view
      setSelectedIssue(prev => ({
        ...prev,
        timeline: [...prev.timeline, data]
      }));

      setNewComment('');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Could not post comment.');
    } finally {
      setCommenting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 size={18} color="#10b981" />;
      case 'in_progress':
        return <Clock size={18} color="#3b82f6" />;
      case 'under_review':
        return <Clock size={18} color="#a855f7" />;
      default:
        return <AlertCircle size={18} color="#f59e0b" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Alert Notice */}
      {alert && (
        <div className={`alert-banner alert-banner-${alert.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {alert.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{alert.message}</span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Left pane: submit form */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Report Civil Issue</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              File a safety hazard, damage, or repair request.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Issue Title</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Brief summary (e.g. Large pothole)" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="pothole">Pothole / Road Damage</option>
                <option value="street_light">Street Light Outage</option>
                <option value="leak">Water Leak / Pipe Burst</option>
                <option value="trash">Illegal Dumping / Trash Pile</option>
                <option value="road_block">Road Blockage / Hazard</option>
                <option value="other">Other Incident</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                className="form-textarea" 
                placeholder="Explain the problem details..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Geotag Coordinates</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Latitude" 
                  value={latitude}
                  readOnly 
                  required
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Longitude" 
                  value={longitude}
                  readOnly 
                  required
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.75rem' }} 
                  onClick={detectLocation}
                  title="Detect GPS Position"
                >
                  <MapPin size={18} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Detected Address</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Pin location on map to find address" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Upload Evidence Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label className="btn btn-secondary" style={{ flex: 1, margin: 0 }}>
                  <ImageIcon size={18} />
                  Choose File
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
                {imageBase64 && (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={imageBase64} 
                      alt="Upload Preview" 
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setImageBase64('')}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', padding: '2px' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              <Send size={16} />
              {submitting ? 'Submitting Report...' : 'File Issue Report'}
            </button>
          </form>
        </div>

        {/* Right pane: Map and reports history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Map */}
          <div className="glass-card" style={{ height: '360px', padding: 0, overflow: 'hidden' }}>
            <InteractiveMap 
              issues={issues} 
              onLocationSelected={handleLocationSelect} 
              selectedLocation={latitude && longitude ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : null}
              role="citizen"
            />
          </div>

          {/* Issue list */}
          <div className="glass-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>My Reported Incidents</h3>

            {loading ? (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Fetching issues list...</p>
            ) : issues.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                You have not reported any issues yet. Use the form on the left to submit a ticket.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {issues.map((issue) => (
                  <div 
                    key={issue.id} 
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: '0.2s'
                    }}
                    onClick={() => handleViewDetails(issue.id)}
                    className="issue-item-hover"
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>{issue.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                        {issue.category.replace('_', ' ').toUpperCase()} • {issue.address.substring(0, 40)}{issue.address.length > 40 ? '...' : ''}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Filed on {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className={`badge badge-${issue.status}`}>
                        {getStatusIcon(issue.status)}
                        {issue.status.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
                        View Details →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Details Timeline Modal */}
      {selectedIssue && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => setSelectedIssue(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              Issue Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedIssue.issue.title}</h4>
                  <span className={`badge badge-${selectedIssue.issue.status}`}>
                    {selectedIssue.issue.status.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Category: <strong>{selectedIssue.issue.category.replace('_', ' ').toUpperCase()}</strong> | 
                  Filed on {new Date(selectedIssue.issue.created_at).toLocaleString()}
                </p>
              </div>

              {selectedIssue.issue.image_url && (
                <img 
                  src={selectedIssue.issue.image_url} 
                  alt="Incident evidence" 
                  style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              )}

              <div>
                <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</h5>
                <p style={{ fontSize: '0.95rem', color: '#cbd5e1', whiteSpace: 'pre-line' }}>{selectedIssue.issue.description}</p>
              </div>

              <div>
                <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Address/Location</h5>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{selectedIssue.issue.address}</p>
              </div>

              {/* Progress Timeline Comments */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Activity History</h4>
                
                <div className="timeline">
                  {selectedIssue.timeline.map((log) => (
                    <div key={log.id} className="timeline-item">
                      <div className={`timeline-dot ${log.status_changed_to ? `dot-${log.status_changed_to}` : ''}`}></div>
                      <div className="timeline-header">
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {log.author_name || 'System Auto-Log'} 
                          {log.author_role && <span className={`badge ${log.author_role === 'admin' ? 'badge-under_review' : 'badge-in_progress'}`} style={{ transform: 'scale(0.8)', marginLeft: '4px' }}>{log.author_role}</span>}
                        </span>
                        <span className="timeline-meta">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="timeline-body">
                        {log.comment_text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add citizen comment */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Add Comment</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Write a message or upload update details..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.25rem' }} disabled={commenting}>
                  <MessageSquare size={16} />
                  Comment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Styled hover transitions */}
      <style>{`
        .issue-item-hover:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(56, 189, 248, 0.25) !important;
          transform: translateX(4px);
        }
      `}</style>

    </div>
  );
}
