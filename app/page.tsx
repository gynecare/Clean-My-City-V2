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
  const [showToast, setShowToast] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const alreadyShown = sessionStorage.getItem('cmc-welcome-shown');
      if (!alreadyShown) {
        setShowWelcome(true);
      }
    } catch {
      // sessionStorage unavailable — just skip the popup rather than error out.
    }
  }, []);

  function dismissWelcome() {
    setShowWelcome(false);
    try {
      sessionStorage.setItem('cmc-welcome-shown', 'true');
    } catch {
      // ignore
    }
  }

  function handleReportNowClick() {
    dismissWelcome();
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
  }

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
      setShowToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setShowToast(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong sending your report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {showWelcome && (
        <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={dismissWelcome}>
          <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
            <button className="welcome-close" aria-label="Close" onClick={dismissWelcome}>
              ×
            </button>
            <img src="/logo-icon.png" alt="" className="stamp-img" style={{ margin: '0 auto 14px' }} />
            <h2 id="welcome-title">See waste nearby?</h2>
            <p>
              Mark it on the map in under a minute — no account needed. Every report helps build a public
              case for getting it cleaned up.
            </p>
            <div className="welcome-actions">
              <button className="btn-primary" onClick={handleReportNowClick} style={{ justifyContent: 'center' }}>
                Report a Waste Site
              </button>
              <button className="btn-secondary" onClick={dismissWelcome}>
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="site-header">
        <img src="/logo-icon.png" alt="Clean My City logo" className="stamp-img" />
        <div className="brand-text">
          <div className="brand-name">
            Clean <span className="accent">My City</span>
          </div>
          <div className="brand-tag">Report it. Track it. Get it cleaned.</div>
        </div>
        <nav className="main-nav">
          <a href="#map-section">Map</a>
          <a href="#reports">Reports</a>
          <Link href="/leaderboard">Leaderboard</Link>
          <a href="#about">About</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-text">
          <h1>
            Report waste.
            <br />
            Improve your <span className="accent">neighborhood</span>.
          </h1>
          <p>
            See waste in your community? Report it in seconds — no account needed. Together we can keep
            Rawalpindi clean, one report at a time.
          </p>
          <div className="hero-actions">
            <a className="btn-primary" href="#map-section">
              Report a Waste Site
            </a>
            <a className="btn-outline" href="#map-section">
              View Map
            </a>
          </div>
        </div>
        <div className="hero-illustration">
          <img src="/logo-full.jpg" alt="Clean My City" style={{ width: '100%', height: 'auto', mixBlendMode: 'multiply' }} />
        </div>
      </section>

      <div className="stats-strip">
        <div className="stat">
          <span className="stat-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2h9l5 5v15H6z" />
              <path d="M9 12h6M9 16h6" />
            </svg>
          </span>
          <span>
            <span className="stat-num">{loaded ? reports.length : '—'}</span>
            <span className="stat-label">Reports submitted</span>
          </span>
        </div>
        <div className="stat">
          <span className="stat-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s7-6.2 7-11.3A7 7 0 0 0 5 9.7C5 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.4" />
            </svg>
          </span>
          <span>
            <span className="stat-num">
              {loaded ? new Set(reports.map((r) => r.locality).filter(Boolean)).size : '—'}
            </span>
            <span className="stat-label">Areas covered</span>
          </span>
        </div>
        <div className="stat">
          <span className="stat-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="9" width="16" height="12" />
              <path d="M9 21v-5h6v5M9 3h6v6H9z" />
            </svg>
          </span>
          <span>
            <span className="stat-num">{WASTE_TYPES.length}</span>
            <span className="stat-label">Waste types tracked</span>
          </span>
        </div>
        <div className="stat">
          <span className="stat-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span>
            <span className="stat-num">Free</span>
            <span className="stat-label">No account needed</span>
          </span>
        </div>
      </div>

      <main>
        <section className="map-section" id="map-section">
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

        <section className="reports-section" id="reports">
          <div className="reports-header-row">
            <h2>Recent reports</h2>
          </div>
          <p className="reports-sub">
            {!loaded
              ? 'Loading reports…'
              : reports.length === 0
              ? 'No reports yet'
              : `${reports.length} ${reports.length === 1 ? 'report' : 'reports'} so far`}
          </p>
          <div className="reports-grid">
            {!loaded &&
              [1, 2, 3].map((i) => (
                <div className="report-card skeleton-card" key={i} aria-hidden="true">
                  <div className="skeleton-block skeleton-photo" />
                  <div className="skeleton-block skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton-block skeleton-line" style={{ width: '90%' }} />
                  <div className="skeleton-block skeleton-line" style={{ width: '40%' }} />
                </div>
              ))}
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
                  <span className="coords-text">
                    {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                  </span>
                  <span>{new Date(r.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="leaderboard-teaser">
          <div className="leaderboard-teaser-text">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
              <path d="M7 6H4a2 2 0 0 0 2 4M17 6h3a2 2 0 0 1-2 4" />
            </svg>
            <div>
              <h3>See which areas need the most attention</h3>
              <p>Public rankings help put pressure where it's needed most.</p>
            </div>
          </div>
          <Link href="/leaderboard">View Leaderboard →</Link>
        </div>

        <section className="about-section" id="about">
          <h2>Why this exists</h2>
          <p>
            Garbage complaints often go nowhere because there&apos;s no easy way to show where the problem
            actually is, or how many people are affected. Clean My City fixes that: anyone can mark a site
            in seconds, no account or app download needed, and every report is public — visible on the map,
            in the leaderboard, and exportable as a spreadsheet for local authorities to act on.
          </p>
          <p>
            Your location and photos are only used to describe the report itself and are never sold or
            shared beyond what&apos;s needed to get the site cleaned up.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/logo-icon.png" alt="" className="stamp-img" style={{ width: 36, height: 36 }} />
            <div className="footer-brand-text">
              <div className="brand-name">
                Clean <span className="accent">My City</span>
              </div>
              <div className="brand-tag">Report it. Track it. Get it cleaned.</div>
            </div>
          </div>
          <nav className="footer-links">
            <a href="#map-section">Report</a>
            <a href="#reports">Recent reports</a>
            <Link href="/leaderboard">Leaderboard</Link>
            <a href="#about">About</a>
          </nav>
          <div className="footer-contact">
            <a href="https://wa.me/923008489597" target="_blank" rel="noopener noreferrer">
              WhatsApp / Call: 0300-8489597
            </a>
            <a href="mailto:clean.my.city.pk@gmail.com">clean.my.city.pk@gmail.com</a>
          </div>
        </div>
        <div className="footer-note">Together for a cleaner city.</div>
        <div className="footer-note">
          <Link href="/admin" style={{ color: 'inherit' }}>
            Admin
          </Link>
        </div>
      </footer>

      {showToast && (
        <div className="toast" role="status">
          Report sent — thank you for helping clean up the city.
        </div>
      )}
    </>
  );
}
