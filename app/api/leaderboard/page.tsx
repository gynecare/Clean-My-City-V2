'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardRow {
  locality: string;
  count: number;
  resolved: number;
  resolvedRate: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalResolved, setTotalResolved] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        setRows(data.leaderboard ?? []);
        setTotal(data.total ?? 0);
        setTotalResolved(data.totalResolved ?? 0);
      })
      .finally(() => setLoaded(true));
  }, []);

  const maxCount = rows.length > 0 ? rows[0].count : 0;

  return (
    <>
      <header className="site-header">
        <img src="/logo-icon.png" alt="Clean My City logo" className="stamp-img" />
        <div className="brand-text">
          <div className="brand-name">
            Clean <span className="accent">My City</span>
          </div>
          <div className="brand-tag">Report it. Track it. Get it cleaned.</div>
        </div>
        <nav className="main-nav">
          <Link href="/">Home</Link>
          <Link href="/#map-section">Map</Link>
          <Link href="/#reports">Reports</Link>
          <Link href="/#about">About</Link>
        </nav>
      </header>

      <main>
        <section className="reports-section" style={{ marginTop: 28 }}>
          <div className="reports-header-row">
            <h2>Leaderboard</h2>
            <Link className="btn-secondary" href="/">
              ← Back to homepage
            </Link>
          </div>
          <p className="reports-sub" style={{ marginTop: 4 }}>
            See which areas have the most reported waste sites — public pressure helps get them cleared.
          </p>
          <p className="reports-sub">
            {!loaded
              ? 'Loading…'
              : `${total} total ${total === 1 ? 'report' : 'reports'} across ${rows.length} area${rows.length === 1 ? '' : 's'} — ${totalResolved} resolved`}
          </p>

          {loaded && rows.length === 0 && (
            <div className="empty-state">No reports yet — once people start reporting, areas will show up here.</div>
          )}

          {rows.length > 0 && (
            <div className="leaderboard-list">
              {rows.map((row, i) => (
                <div className="leaderboard-row" key={row.locality}>
                  <div className="leaderboard-rank">{i + 1}</div>
                  <div className="leaderboard-body">
                    <div className="leaderboard-top">
                      <span className="leaderboard-name">{row.locality}</span>
                      <span className="leaderboard-count">
                        {row.count} {row.count === 1 ? 'report' : 'reports'} · {row.resolvedRate}% resolved
                      </span>
                    </div>
                    <div className="leaderboard-bar-track">
                      <div
                        className="leaderboard-bar-fill"
                        style={{ width: `${maxCount ? (row.count / maxCount) * 100 : 0}%` }}
                      />
                      <div className="leaderboard-bar-resolved" style={{ width: `${row.resolvedRate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <Link href="/">Home</Link>
            <Link href="/#map-section">Report</Link>
            <Link href="/#about">About</Link>
          </nav>
          <div className="footer-contact">
            <a href="https://wa.me/923008489597" target="_blank" rel="noopener noreferrer">
              WhatsApp / Call: 0300-8489597
            </a>
            <a href="mailto:clean.my.city.pk@gmail.com">clean.my.city.pk@gmail.com</a>
          </div>
        </div>
        <div className="footer-note">Together for a cleaner city.</div>
      </footer>
    </>
  );
}
