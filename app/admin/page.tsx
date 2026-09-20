'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STATUSES, STATUS_LABELS, TYPE_LABELS, type ReportStatus, type WasteReport } from '@/types';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/reports/export', { headers: { 'x-admin-key': password } });
      if (!res.ok) {
        setError('Incorrect password.');
        return;
      }
      setUnlocked(true);
      const listRes = await fetch('/api/reports');
      const listData = await listRes.json();
      setReports(listData.reports ?? []);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      const res = await fetch('/api/reports/export', { headers: { 'x-admin-key': password } });
      if (!res.ok) {
        setError('Session expired — enter the password again.');
        setUnlocked(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clean-my-city-reports-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handleStatusChange(id: string, status: ReportStatus) {
    setSavingId(id);
    setError('');
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError('Failed to update status — session may have expired.');
        return;
      }
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch {
      setError('Failed to update status.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <header className="site-header">
        <img src="/logo-icon.png" alt="Clean My City logo" className="stamp-img" />
        <div className="brand-text">
          <div className="brand-name">
            Clean <span className="accent">My City</span>
          </div>
          <div className="brand-tag">Admin</div>
        </div>
        <nav className="main-nav">
          <Link href="/">Back to site</Link>
        </nav>
      </header>

      <main>
        {!unlocked ? (
          <section className="report-panel" style={{ maxWidth: 420, margin: '48px auto' }}>
            <div className="ticket-head">
              <div>
                <h2>Admin access</h2>
                <div className="coords">Enter your password to manage reports</div>
              </div>
            </div>
            <form onSubmit={handleUnlock}>
              <label className="field-label" htmlFor="admin-password">
                Admin password
              </label>
              <input
                id="admin-password"
                type="password"
                className="locality-select"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
              {error && <div className="form-error">{error}</div>}
              <div className="panel-actions">
                <button type="submit" className="btn-primary" disabled={loading || !password}>
                  {loading ? 'Checking…' : 'Unlock'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="reports-section" style={{ marginTop: 28 }}>
            <div className="reports-header-row">
              <h2>Manage reports</h2>
              <button className="btn-secondary" onClick={handleDownload} disabled={downloading}>
                {downloading ? 'Preparing…' : 'Download CSV'}
              </button>
            </div>
            <p className="reports-sub">{reports.length} total reports</p>
            {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="admin-list">
              {reports.map((r) => (
                <div className="admin-row" key={r.id}>
                  {r.photo && <img src={r.photo} alt="" className="admin-row-photo" />}
                  <div className="admin-row-body">
                    <div className="admin-row-top">
                      <strong>{TYPE_LABELS[r.type]}</strong>
                      {r.locality && <span className="locality-badge">{r.locality}</span>}
                    </div>
                    <p className="desc">{r.description}</p>
                    <div className="meta">
                      <span className="coords-text">
                        {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                      </span>
                      <span>{new Date(r.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <select
                    className="locality-select admin-status-select"
                    value={r.status}
                    disabled={savingId === r.id}
                    onChange={(e) => handleStatusChange(r.id, e.target.value as ReportStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-note">Clean My City — admin area.</div>
      </footer>
    </>
  );
}
