import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export default function InteractiveMap({ 
  issues = [], 
  onLocationSelected = null, 
  selectedLocation = null,
  role = 'citizen',
  heatmapMode = false
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const clickMarkerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use default central coordinates (Bangalore, India: 12.9716, 77.5946)
    // If we have issues, center on the first issue
    const initialLat = issues.length > 0 ? parseFloat(issues[0].latitude) : 12.9716;
    const initialLng = issues.length > 0 ? parseFloat(issues[0].longitude) : 77.5946;

    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 12);
    
    // Add open street map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Setup map click listener for location selection (Citizen reporting)
    if (onLocationSelected) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onLocationSelected(lat, lng);
      });
    }

    // Fix map container size bugs on mounting
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
    };
  }, []);

  // Update selection marker (Citizen's new report coordinate pin)
  useEffect(() => {
    if (!mapRef.current || !onLocationSelected) return;

    // Remove existing temporary click pin
    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }

    if (selectedLocation) {
      const { lat, lng } = selectedLocation;
      
      const reporterIcon = L.divIcon({
        className: 'custom-reporter-pin',
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #38bdf8; 
            border: 3px solid #fff; 
            border-radius: 50%;
            box-shadow: 0 0 10px #38bdf8;
            animation: pulse 1.5s infinite;
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      clickMarkerRef.current = L.marker([lat, lng], { icon: reporterIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="color: #000; font-family: sans-serif; font-size: 12px; font-weight: 600;">
            Report Location Selected!<br>
            <span style="font-size: 10px; color: #555;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span>
          </div>
        `)
        .openPopup();
      
      // Pan to selected position
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [selectedLocation]);

  // Render Issues and Heatmaps
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Clear previous issue markers
    markersLayerRef.current.clearLayers();

    if (heatmapMode) {
      // Admin Hotspot Density Mode
      // Aggregate issues that are close to each other
      const clusters = {};
      issues.forEach(issue => {
        const lat = parseFloat(issue.latitude);
        const lng = parseFloat(issue.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const latRound = lat.toFixed(3);
        const lngRound = lng.toFixed(3);
        const key = `${latRound}_${lngRound}`;
        if (!clusters[key]) {
          clusters[key] = {
            lat: parseFloat(latRound),
            lng: parseFloat(lngRound),
            count: 0,
            categories: new Set(),
            titles: []
          };
        }
        clusters[key].count += 1;
        clusters[key].categories.add(issue.category);
        clusters[key].titles.push(issue.title);
      });

      // Render Density Circles
      Object.values(clusters).forEach(cluster => {
        const radius = Math.min(cluster.count * 80, 800); // Dynamic radius based on density
        const color = cluster.count > 3 ? '#ef4444' : cluster.count > 1 ? '#f97316' : '#f59e0b';
        const fillOpacity = cluster.count > 3 ? 0.6 : cluster.count > 1 ? 0.45 : 0.3;

        const circle = L.circle([cluster.lat, cluster.lng], {
          color: color,
          fillColor: color,
          fillOpacity: fillOpacity,
          radius: radius,
          weight: 2
        }).addTo(markersLayerRef.current);

        const categoriesArray = Array.from(cluster.categories).map(c => c.replace('_', ' ')).join(', ');
        
        circle.bindPopup(`
          <div class="map-callout" style="color: #020617; line-height: 1.4;">
            <h4 style="color: ${color}; font-weight: 800; font-size: 14px;">🔥 High Density Zone</h4>
            <p><strong>Density Score:</strong> ${cluster.count} Active Reports</p>
            <p><strong>Key Categories:</strong> ${categoriesArray}</p>
            <p style="font-size: 11px; margin-top: 5px; color: #475569;">
              <strong>Recent issues:</strong><br>
              ${cluster.titles.slice(0, 3).map(t => `• ${t}`).join('<br>')}
            </p>
          </div>
        `);
      });

    } else {
      // Normal Pin Mode
      issues.forEach(issue => {
        const lat = parseFloat(issue.latitude);
        const lng = parseFloat(issue.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        // Custom marker based on issue state
        let color = '#f59e0b'; // reported (Amber)
        if (issue.status === 'under_review') color = '#a855f7'; // Purple
        if (issue.status === 'in_progress') color = '#3b82f6'; // Blue
        if (issue.status === 'resolved') color = '#10b981'; // Green

        const pinIcon = L.divIcon({
          className: 'custom-issue-pin',
          html: `
            <div style="
              width: 16px; 
              height: 16px; 
              background: ${color}; 
              border: 2px solid #fff; 
              border-radius: 50%;
              box-shadow: 0 0 8px ${color};
            "></div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const statusLabel = issue.status.toUpperCase().replace('_', ' ');
        const priorityLabel = issue.priority.toUpperCase();

        const popupContent = `
          <div class="map-callout" style="color: #020617; line-height: 1.4; min-width: 180px;">
            <h4 style="font-weight: 700; margin-bottom: 4px; font-size: 13px;">${issue.title}</h4>
            <p style="margin-bottom: 2px; font-size: 11px;"><strong>Category:</strong> ${issue.category.replace('_', ' ')}</p>
            <p style="margin-bottom: 2px; font-size: 11px;">
              <strong>Status:</strong> 
              <span style="color: ${color}; font-weight: 700;">${statusLabel}</span>
            </p>
            <p style="margin-bottom: 2px; font-size: 11px;"><strong>Address:</strong> ${issue.address || 'Reported Location'}</p>
            <p style="margin-top: 4px; color: #475569; font-size: 11px;">${issue.description.length > 80 ? issue.description.substring(0, 80) + '...' : issue.description}</p>
          </div>
        `;

        L.marker([lat, lng], { icon: pinIcon })
          .addTo(markersLayerRef.current)
          .bindPopup(popupContent);
      });
    }
  }, [issues, heatmapMode]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} className="map-wrapper" style={{ height: '100%', width: '100%' }} />
      {onLocationSelected && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#cbd5e1',
          pointerEvents: 'none'
        }}>
          🖱️ Click map to place a report location pin
        </div>
      )}
      
      {/* Keyframe pulse animation for select pin */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(56, 189, 248, 0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }
      `}</style>
    </div>
  );
}
