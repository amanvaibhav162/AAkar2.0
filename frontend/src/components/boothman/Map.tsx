'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface Booth {
  id: number;
  partNumber: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

interface Volunteer {
  id: number;
  name: string;
  phone: string;
  status: string;
  lat: number | null;
  lng: number | null;
}

interface Task {
  id: number;
  title: string;
  status: string;
  lat: number | null;
  lng: number | null;
}

interface House {
  partNumber: string;
  houseNo: string;
  section: string;
  voterCount: number;
  lat: number | null;
  lng: number | null;
}

interface MapProps {
  booths?: Booth[];
  volunteers?: Volunteer[];
  tasks?: Task[];
  houses?: House[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  height?: string;
}

export default function LeafletMap({ 
  booths = [], 
  volunteers = [], 
  tasks = [],
  houses = [],
  centerLat = 28.6139, 
  centerLng = 77.2090, 
  zoom = 11,
  height = '500px'
}: MapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: zoom,
          scrollWheelZoom: true,
          attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);
      } else {
        mapRef.current.setView([centerLat, centerLng], zoom);
      }

      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
      }

      // Draw booth boundary polygon
      if (houses.length >= 3) {
        const pts = houses.filter(h => h.lat && h.lng).map(h => [h.lat!, h.lng!] as [number, number]);
        
        function crossProduct(O: number[], A: number[], B: number[]) {
          return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
        }
        function convexHull(points: [number, number][]) {
          const n = points.length;
          if (n < 3) return points;
          const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
          const lower: [number, number][] = [];
          for (const p of sorted) {
            while (lower.length >= 2 && crossProduct(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
            lower.push(p);
          }
          const upper: [number, number][] = [];
          for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i];
            while (upper.length >= 2 && crossProduct(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
            upper.push(p);
          }
          lower.pop(); upper.pop();
          return [...lower, ...upper];
        }

        const hull = convexHull(pts);
        if (hull.length >= 3) {
          L.polygon(hull, {
            color: '#D4A843',
            weight: 2,
            fillColor: '#D4A843',
            fillOpacity: 0.07,
            dashArray: '6 4',
          }).addTo(layerGroupRef.current);
        }
      }

      // ── BOOTH Markers ──────────────────────────────────────────
      booths.forEach(booth => {
        if (!booth.lat || !booth.lng) return;

        const iconHtml = `
          <div style="position:relative;width:44px;height:52px;display:flex;flex-direction:column;align-items:center;">
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#04122e,#0f2860);border:3px solid #D4A843;box-shadow:0 6px 20px rgba(212,168,67,0.45),0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;">🏢</div>
            <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #D4A843;margin-top:-2px;"></div>
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [44, 52],
          iconAnchor: [22, 52],
          popupAnchor: [0, -54]
        });

        const marker = L.marker([booth.lat, booth.lng], { icon });
        marker.bindPopup(`
          <div style="font-family:system-ui,sans-serif;padding:8px 4px;min-width:160px;">
            <div style="font-size:9px;font-weight:900;color:#D4A843;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">📍 Polling Booth</div>
            <div style="font-size:15px;font-weight:900;color:#04122e;margin-bottom:4px;">${booth.partNumber}</div>
            <div style="font-size:11px;color:#64748b;line-height:1.4;max-width:200px;">${booth.name}</div>
          </div>
        `);
        layerGroupRef.current.addLayer(marker);
      });

      // ── VOLUNTEER Markers ──────────────────────────────────────
      volunteers.forEach(vol => {
        if (!vol.lat || !vol.lng) return;

        const isActive = vol.status === 'APPROVED' || vol.status === 'ACTIVE';
        const color = isActive ? '#16a34a' : '#d97706';
        const bgColor = isActive ? '#dcfce7' : '#fef3c7';
        const initials = (vol.name || '?').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();

        const pulseStyle = isActive
          ? `<div style="position:absolute;top:0;left:0;width:38px;height:38px;border-radius:50%;background:${color};opacity:0.2;animation:volpulse 2.2s ease-out infinite;pointer-events:none;"></div>`
          : '';

        const iconHtml = `
          <div style="position:relative;width:38px;height:46px;display:flex;flex-direction:column;align-items:center;">
            ${pulseStyle}
            <div style="position:relative;z-index:1;width:38px;height:38px;border-radius:50%;background:${bgColor};border:2.5px solid ${color};box-shadow:0 3px 12px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:${color};font-family:system-ui,sans-serif;">${initials}</div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:9px solid ${color};margin-top:-2px;"></div>
          </div>
          <style>.volpulse-kf{animation:volpulse 2.2s ease-out infinite;}@keyframes volpulse{0%{transform:scale(1);opacity:0.3;}100%{transform:scale(2.4);opacity:0;}}</style>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [38, 46],
          iconAnchor: [19, 46],
          popupAnchor: [0, -48]
        });

        const marker = L.marker([vol.lat, vol.lng], { icon });
        marker.bindPopup(`
          <div style="font-family:system-ui,sans-serif;padding:8px 4px;min-width:150px;">
            <div style="font-size:9px;font-weight:900;color:${color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">👤 Volunteer</div>
            <div style="font-size:14px;font-weight:900;color:#04122e;margin-bottom:4px;">${vol.name}</div>
            <div style="font-size:11px;color:#2563eb;margin-bottom:8px;">📞 ${vol.phone}</div>
            <div style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;font-weight:800;font-size:9px;color:${color};background:${bgColor};border:1.5px solid ${color};text-transform:uppercase;border-radius:20px;letter-spacing:0.05em;">
              <div style="width:6px;height:6px;border-radius:50%;background:${color};"></div>
              ${vol.status}
            </div>
          </div>
        `);
        layerGroupRef.current.addLayer(marker);
      });

      // ── TASK Markers ───────────────────────────────────────────
      tasks.forEach((task, index) => {
        if (!task.lat || !task.lng) return;

        const offsetLat = task.lat + 0.001 * Math.cos(index * 2);
        const offsetLng = task.lng + 0.001 * Math.sin(index * 2);

        const isCompleted = task.status === 'COMPLETED';
        const isInProgress = task.status === 'IN_PROGRESS';
        const color = isCompleted ? '#059669' : isInProgress ? '#2563eb' : '#dc2626';
        const bgColor = isCompleted ? '#d1fae5' : isInProgress ? '#dbeafe' : '#fee2e2';
        const emoji = isCompleted ? '✅' : isInProgress ? '⚡' : '📋';

        const iconHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;width:34px;height:40px;">
            <div style="width:34px;height:34px;border-radius:10px;background:${color};border:2px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;">${emoji}</div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color};margin-top:-2px;"></div>
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [34, 40],
          iconAnchor: [17, 40],
          popupAnchor: [0, -42]
        });

        const marker = L.marker([offsetLat, offsetLng], { icon });
        marker.bindPopup(`
          <div style="font-family:system-ui,sans-serif;padding:8px 4px;min-width:150px;">
            <div style="font-size:9px;font-weight:900;color:${color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${emoji} Task</div>
            <div style="font-size:13px;font-weight:900;color:#04122e;margin-bottom:8px;">${task.title}</div>
            <div style="display:inline-block;padding:2px 9px;font-weight:800;font-size:9px;color:${color};background:${bgColor};border:1.5px solid ${color};text-transform:uppercase;border-radius:20px;">${task.status.replace('_', ' ')}</div>
          </div>
        `);
        layerGroupRef.current.addLayer(marker);
      });

      // ── HOUSE Markers ──────────────────────────────────────────
      const sectionGroups = new Map<string, typeof houses>();
      houses.forEach(house => {
        if (!house.lat || !house.lng) return;
        const key = `${house.lat},${house.lng}`;
        if (!sectionGroups.has(key)) sectionGroups.set(key, []);
        sectionGroups.get(key)!.push(house);
      });

      sectionGroups.forEach((group) => {
        const baseLat = group[0].lat!;
        const baseLng = group[0].lng!;
        const total = group.length;

        group.forEach((house, index) => {
          const cols = Math.ceil(Math.sqrt(total));
          const col = index % cols;
          const row = Math.floor(index / cols);
          const halfCols = (cols - 1) / 2;
          const halfRows = (Math.ceil(total / cols) - 1) / 2;
          const spreadLat = baseLat + (row - halfRows) * 0.00045;
          const spreadLng = baseLng + (col - halfCols) * 0.00045;

          const size = Math.min(5 + (house.voterCount || 1) * 1.2, 13);

          const iconHtml = `
            <div style="width:${size}px;height:${size}px;background:rgba(124,58,237,0.7);border:1.5px solid rgba(139,92,246,1);border-radius:50%;box-shadow:0 1px 5px rgba(124,58,237,0.5);"></div>
          `;

          const icon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2],
            popupAnchor: [0, -size/2 - 2]
          });

          const marker = L.marker([spreadLat, spreadLng], { icon });
          marker.bindPopup(`
            <div style="font-family:system-ui,sans-serif;padding:6px 4px;min-width:120px;">
              <div style="font-size:9px;font-weight:900;color:#7c3aed;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">🏠 Household</div>
              <div style="font-size:13px;font-weight:800;color:#04122e;margin-bottom:3px;">House #${house.houseNo}</div>
              <div style="font-size:11px;color:#7c3aed;font-weight:700;">${house.voterCount} voters</div>
              <div style="font-size:9px;color:#94a3b8;margin-top:2px;">${house.section}</div>
            </div>
          `);
          layerGroupRef.current.addLayer(marker);
        });
      });

    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [booths, volunteers, tasks, houses, centerLat, centerLng, zoom]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ width: '100%', height: height, borderRadius: '8px', zIndex: 1 }} 
    />
  );
}
