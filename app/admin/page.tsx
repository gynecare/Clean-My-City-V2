'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STATUSES, STATUS_LABELS, TYPE_LABELS, type ReportStatus, type WasteReport } from '@/types';

type AuthorityOption = { id: string; name: string; level: number };

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [authorities, setAuthorities] = useState<AuthorityOption[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [routingOk, setRoutingOk] = useState(false);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/reports/export', { headers: { 'x-admin-key': password } });
      if (res.status === 401) {
        setError('Incorrect password.');
        return;
      }
      if (!res.ok) {
        setError('The database is unavailable right now. Try again later.');
        return;
      }

      // Load everything first, and only then open the admin screen,
      // so it never flashes "0 total reports" while loading.
      const listRes = await fetch('/api/reports');
      if (!listRes.ok) {
        setError('Could not load reports. The database may be down.');
        return;
      }
      const listData = await listRes.json();
      setReports(listData.reports ?? []);

      // Office information is optional: if it fails, the rest still works.
      try {
        const routingRes = await fetch('/api/admin/routing', { headers: { 'x-admin-key': password } });
        if (routingRes.ok) {
          const routingData = await routingRes.json();
          setAuthorities(routingData.authorities ?? []);
          setAssignments(routingData.assignments ?? {});
          setRoutingOk(true);
        } else {
          setRoutingOk(false);
          setError('Could not load office information. You can still manage statuses.');
        }
      } catch {
        setRoutingOk(false);
        setError('Could not load office information. You can still manage statuses.');
      }

      setUnlocked(true);
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

  async function handleAuthorityChange(id: string, value: string) {
    const authorityId = value === '' ? null : value;
    setSavingId(id);
    setError('');
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
        body: JSON.stringify({ authorityId }),
      });
      if (res.status === 401) {
        setError('Session expired — enter the password again.');
        setUnlocked(false);
        return;
      }
      if (!res.ok) {
        setError('Failed to change the office. Try again.');
        return;
      }
      setAssignments((prev) => ({ ...prev, [id]: authorityId }));
    } catch {
      setError('Failed to change the office.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this report permanently? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(id);
    setError('');
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': password },
      });
      if (res.status === 401) {
        setError('Session expired — enter the password again.');
        setUnlocked(false);
        return;
      }
      // 404 means it was already gone, so removing it from the list is correct.
      if (!res.ok && res.status !== 404) {
        setError('Failed to delete the report. Try again.');
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Failed to delete the report.');
    } finally {
      setDeletingId(null);
    }
  }

  const unassignedCount = reports.filter((r) => !assignments[r.id]).length;
  const visibleReports = routingOk && onlyUnassigned ? reports.filter((r) => !assignments[r.id]) : reports;

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
                  {loading ? 'Loading reports…' : 'Unlock'}
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
            <p className="reports-sub">
              {reports.length} total reports
              {routingOk && ` · ${unassignedCount} without an office`}
            </p>
            {routingOk && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={onlyUnassigned}
                  onChange={(e) => setOnlyUnassigned(e.target.checked)}
                />
                Show only reports without an office
              </label>
            )}
            {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="admin-list">
              {visibleReports.map((r) => (
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                    <select
                      className="locality-select admin-status-select"
                      value={r.status}
                      disabled={savingId === r.id || deletingId === r.id}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as ReportStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {routingOk && (
                      <select
                        className="locality-select admin-status-select"
                        aria-label="Office responsible for this report"
                        value={assignments[r.id] ?? ''}
                        disabled={savingId === r.id || deletingId === r.id}
                        onChange={(e) => handleAuthorityChange(r.id, e.target.value)}
                      >
                        <option value="">No office yet</option>
                        {authorities.map((a) => (
                          <option key={a.id} value={a.id}>
                            L{a.level} · {a.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id || savingId === r.id}
                      style={{
                        background: '#C0392B',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontWeight: 600,
                        cursor: deletingId === r.id ? 'wait' : 'pointer',
                        opacity: deletingId === r.id ? 0.6 : 1,
                      }}
                    >
                      {deletingId === r.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
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