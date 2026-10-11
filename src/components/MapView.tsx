'use client';

import React, { useEffect, useRef } from 'react';
import { LocationHotspot, RiskBand } from '../core/types';

interface MapViewProps {
  locations: LocationHotspot[];
  selectedLocationId?: string;
  onSelectLocation?: (id: string) => void;
}

const BAND_COLORS: Record<RiskBand, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#f59e0b',
  low: '#10b981',
};

export const MapView: React.FC<MapViewProps> = ({
  locations,
  selectedLocationId,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically load Leaflet in browser only
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const initialCenter: [number, number] = locations.length > 0
          ? [locations[0].coordinates.latitude, locations[0].coordinates.longitude]
          : [28.6139, 77.209];

        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 11,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      // Add markers for each hotspot
      locations.forEach((loc) => {
        const band = loc.riskEvaluation.band;
        const color = BAND_COLORS[band] || '#3b82f6';
        const score = loc.riskEvaluation.overallScore;

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 38px;
              border-radius: 9999px;
              background-color: ${color};
              color: white;
              font-weight: 700;
              font-size: 13px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              border: 3px solid white;
              cursor: pointer;
              transition: transform 0.2s;
            ">
              ${score}
              ${band === 'critical' ? `<span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const marker = L.marker([loc.coordinates.latitude, loc.coordinates.longitude], {
          icon: customIcon,
        }).addTo(map);

        marker.on('click', () => {
          if (onSelectLocation) {
            onSelectLocation(loc.id);
          }
        });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans text-sm';
        popupContent.innerHTML = `
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">${loc.name}</div>
          <div style="color: #64748b; font-size: 12px; margin-bottom: 6px;">${loc.zone}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 600; color: ${color}; text-transform: uppercase;">${band} Risk (${score}/100)</span>
            <span style="font-size: 11px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${loc.reports.length} Reports</span>
          </div>
          ${loc.weather ? `<div style="font-size: 11px; color: #475569;">Temp: ${loc.weather.temperatureC}°C (${loc.weather.apparentTemperatureC}°C feels)</div>` : ''}
          <div style="margin-top: 8px;">
            <button id="inspect-btn-${loc.id}" style="width: 100%; background: #2563eb; color: white; border: none; border-radius: 6px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer;">
              Inspect Hotspot
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`inspect-btn-${loc.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectLocation) onSelectLocation(loc.id);
            };
          }
        });

        markersRef.current.set(loc.id, marker);
      });

      // Fit bounds if we have locations
      if (locations.length > 0) {
        const bounds = L.latLngBounds(
          locations.map((loc) => [loc.coordinates.latitude, loc.coordinates.longitude])
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [locations, onSelectLocation]);

  // Pan to selected location when changed
  useEffect(() => {
    if (!selectedLocationId || !mapInstanceRef.current) return;
    const selected = locations.find((l) => l.id === selectedLocationId);
    if (selected) {
      mapInstanceRef.current.setView(
        [selected.coordinates.latitude, selected.coordinates.longitude],
        13,
        { animate: true }
      );
      const marker = markersRef.current.get(selectedLocationId);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedLocationId, locations]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px] z-0" />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-zinc-900/90 backdrop-blur rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-md text-xs space-y-1.5">
        <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Priority Risk Bands
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200" />
          <span className="text-zinc-700 dark:text-zinc-300">Critical (75–100)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-zinc-700 dark:text-zinc-300">High (50–74)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-zinc-700 dark:text-zinc-300">Moderate (30–49)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-zinc-700 dark:text-zinc-300">Low (0–29)</span>
        </div>
      </div>
    </div>
  );
};
