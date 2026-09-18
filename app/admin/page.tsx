'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // We verify by attempting a real download — if the password is wrong,
    // the server rejects it and we show an error without ever unlocking.
    setDownloading(true);
    try {
      const res = await fetch('/api/reports/export', {
        headers: { 'x-admin-key': password },
      });
      if (!res.ok) {
        setError('Incorrect password.');
        setDownloading(false);
        return;
      }
      setUnlocked(true);
      await triggerDownload(res);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function triggerDownload(res: Response) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clean-my-city-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadAgain() {
    setDownloading(true);
    setError('');
    try {
      const res = await fetch('/api/reports/export', {
        headers: { 'x-admin-key': password },
      });
      if (!res.ok) {
        setError('Session expired — enter the password again.');
        setUnlocked(false);
        return;
      }
      await triggerDownload(res);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="stamp" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1F7A46" strokeWidth={1.8} width={24} height={24}>
            <path d="M12 21s7-6.2 7-11.3A7 7 0 0 0 5 9.7C5 14.8 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.4" fill="#2FA854" stroke="none" />
          </svg>
        </div>
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
        <section className="report-panel" style={{ maxWidth: 420, margin: '48px auto' }}>
          <div className="ticket-head">
            <div>
              <h2>Admin access</h2>
              <div className="coords">Download the full reports data as CSV</div>
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
              {unlocked ? (
                <button type="button" className="btn-primary" onClick={handleDownloadAgain} disabled={downloading}>
                  {downloading ? 'Preparing…' : 'Download again'}
                </button>
              ) : (
                <button type="submit" className="btn-primary" disabled={downloading || !password}>
                  {downloading ? 'Checking…' : 'Unlock & download'}
                </button>
              )}
            </div>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-note">Clean My City — admin area.</div>
      </footer>
    </>
  );
}
