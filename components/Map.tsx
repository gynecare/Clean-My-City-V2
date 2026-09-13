'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TYPE_COLORS, TYPE_LABELS, type WasteReport } from '@/types';

export const RAWALPINDI: [number, number] = [33.5973, 73.0479];

function pinIcon(color: string, pending = false) {
  const svg = `<svg class="pin${pending ? ' pending' : ''}" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 21 13 21s13-11.3 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
    <circle cx="13" cy="13" r="5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });
}

function ClickCatcher({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ target, zoom }: { target: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], zoom ?? 16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

interface MapProps {
  reports: WasteReport[];
  pendingLatLng: { lat: number; lng: number } | null;
  flyTarget: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}

export default function Map({ reports, pendingLatLng, flyTarget, onMapClick }: MapProps) {
  return (
    <MapContainer
      center={RAWALPINDI}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onMapClick={onMapClick} />
      <FlyTo target={flyTarget} />
      {pendingLatLng && (
        <Marker position={[pendingLatLng.lat, pendingLatLng.lng]} icon={pinIcon('#B5502E', true)} />
      )}
      {reports.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={pinIcon(TYPE_COLORS[r.type])}>
          <Popup>
            <strong>{TYPE_LABELS[r.type]}</strong>
            <br />
            {r.description}
            {r.photo && (
              <>
                <br />
                <img src={r.photo} alt="" style={{ width: '100%', marginTop: 6, borderRadius: 3 }} />
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
