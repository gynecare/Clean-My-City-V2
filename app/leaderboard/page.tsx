'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { TYPE_COLORS, TYPE_LABELS, WASTE_TYPES, RAWALPINDI_LOCALITIES, type WasteReport, type WasteType } from '@/types';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

type LatLng = { lat: number; lng: number };

// Phone cameras produce huge photos (often 5-10MB). We shrink and compress
// them in the browser before sending, so uploads stay fast and under the
// server's request size limit.
function resizeImage(file: File, maxDim = 1280, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported in this browser.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export default function Page() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<LatLng | null>(null);
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null);
  const [selectedType, setSelectedType] = useState<WasteType | null>(null);
  const [description, setDescription] = useState('');
  const [locality, setLocality] = useState('');
  const [customLocality, setCustomLocality] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [mapHint, setMapHint] = useState('Click or tap anywhere on the map to mark a waste site');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => setReports(data.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoaded(true));
  }, []);

  function openPanelAt(lat: number, lng: number) {
    setPendingLatLng({ lat, lng });
    setError('');
  }

  function closePanel() {
    setPendingLatLng(null);
    setSelectedType(null);
    setDescription('');
    setLocality('');
    setCustomLocality('');
    setPhoto(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setMapHint("Location isn't available in this browser — click the map instead.");
      return;
    }
    setMapHint('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFlyTarget(ll);
        openPanelAt(ll.lat, ll.lng);
        setMapHint('Click or tap anywhere on the map to mark a waste site');
      },
      () => setMapHint("Couldn't get your location — click the map instead.")
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const resized = await resizeImage(file);
      setPhoto(resized);
    } catch {
      setError("Couldn't process that photo — try a different one.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = description.trim();
    const finalLocality = locality === 'Other' ? customLocality.trim() : locality;
    if (!pendingLatLng || !selectedType || !trimmed) {
      setError('Pick a waste type and add a short description before sending.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pendingLatLng.lat,
          lng: pendingLatLng.lng,
          type: selectedType,
          description: trimmed,
          locality: finalLocality || null,
          photo,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong sending your report.');
      }
      const data = await res.json();
      setReports((prev) => [data.report, ...prev]);
      closePanel();
    } catch (err: any) {
      setError(err.message || 'Something went wrong sending your report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="stamp" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#B5502E" strokeWidth={1.8} width={28} height={28}>
            <path d="M12 21s7-6.2 7-11.3A7 7 0 0 0 5 9.7C5 14.8 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.4" />
          </svg>
        </div>
        <div className="header-text">
          <h1>Clean My City</h1>
          <p>Mark a waste site on the map, add a few details, and send the report — no account needed.</p>
        </div>
        <Link className="btn-secondary header-nav-link" href="/leaderboard">
          Leaderboard
        </Link>
      </header>

      <main>
        <section className="map-section">
          <div className="map-toolbar">
            <span className="map-hint">{mapHint}</span>
            <button className="locate-btn" type="button" onClick={handleLocate}>
              Use my current location
            </button>
          </div>
          <div className="map-wrap">
            <Map
              reports={reports}
              pendingLatLng={pendingLatLng}
              flyTarget={flyTarget}
              onMapClick={openPanelAt}
            />
          </div>
          <div className="legend" aria-hidden="true">
            {WASTE_TYPES.map((t) => (
              <span key={t}>
                <i style={{ background: TYPE_COLORS[t] }} />
                {TYPE_LABELS[t]}
              </span>
            ))}
          </div>
        </section>

        {pendingLatLng && (
          <section className="report-panel">
            <form onSubmit={handleSubmit}>
              <div className="ticket-head">
                <div>
                  <h2>Describe this site</h2>
                  <div className="coords">
                    {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
                  </div>
                </div>
                <button type="button" className="close-btn" aria-label="Cancel report" onClick={closePanel}>
                  ×
                </button>
              </div>

              <span className="field-label">Type of waste</span>
              <div className="chip-row">
                {WASTE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-type={t}
                    className={`chip${selectedType === t ? ' chip--active' : ''}`}
                    onClick={() => setSelectedType(t)}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="description">
                What&apos;s there?
              </label>
              <textarea
                id="description"
                placeholder="e.g. Garbage piled up near the drain, been there for two weeks"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <label className="field-label" htmlFor="locality">
                Locality / area
              </label>
              <select
                id="locality"
                className="locality-select"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              >
                <option value="">Select an area (optional)</option>
                {RAWALPINDI_LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              {locality === 'Other' && (
                <input
                  type="text"
                  className="locality-custom-input"
                  placeholder="Type the area name"
                  value={customLocality}
                  onChange={(e) => setCustomLocality(e.target.value)}
                />
              )}

              <span className="field-label">Photo (optional)</span>
              <div className="photo-row">
                <label className="photo-btn" htmlFor="photoInput">
                  Add a photo
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="photoInput"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
                {photo && <img className="photo-preview" src={photo} alt="Selected photo preview" />}
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="panel-actions">
                <button type="button" className="btn-secondary" onClick={closePanel}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send report'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="how-it-works">
          <div className="step">
            <span className="num">1</span>
            <h3>Mark the spot</h3>
            <p>Click the map where the waste is, or use your current location.</p>
          </div>
          <div className="step">
            <span className="num">2</span>
            <h3>Add details</h3>
            <p>Pick a waste type, write a short description, add a photo if you have one.</p>
          </div>
          <div className="step">
            <span className="num">3</span>
            <h3>Send it</h3>
            <p>Your report is saved on the server and shown on the map for everyone.</p>
          </div>
        </section>

        <section className="reports-section">
          <div className="reports-header-row">
            <h2>Recent reports</h2>
            <a className="btn-secondary" href="/api/reports/export">
              Download report data (CSV)
            </a>
          </div>
          <p className="reports-sub">
            {!loaded
              ? 'Loading reports…'
              : reports.length === 0
              ? 'No reports yet'
              : `${reports.length} ${reports.length === 1 ? 'report' : 'reports'} so far`}
          </p>
          <div className="reports-grid">
            {loaded && reports.length === 0 && (
              <div className="empty-state">No reports yet — be the first to flag a site.</div>
            )}
            {reports.map((r) => (
              <div className="report-card" key={r.id}>
                {r.photo && <img src={r.photo} alt="" />}
                <div className="type-badge">
                  <i style={{ background: TYPE_COLORS[r.type] }} />
                  {TYPE_LABELS[r.type]}
                </div>
                {r.locality && <div className="locality-badge">{r.locality}</div>}
                <p className="desc">{r.description}</p>
                <div className="meta">
                  {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>Clean My City is a community reporting tool. Reports are stored on the server.</footer>
    </>
  );
}
