import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="goa-root">
      {/* Hero */}
      <div className="goa-hero">
        <div className="goa-emblem">
          <Image src="/goa-logo.png" alt="logo" width={300} height={300} />
        </div>
        <p className="goa-hero-sub">MMR Tracker</p>
      </div>

      {/* Navigation */}
      <nav className="goa-nav">
        <Link href="/matches/new" className="goa-nav-link">
          <div className="goa-nav-btn primary">
            <div className="goa-nav-accent" />
            <div className="goa-nav-inner">
              <div className="goa-nav-left">
                <span className="goa-nav-icon">⚔️</span>
                <div className="goa-nav-text">
                  <span className="goa-nav-label">Record Battle</span>
                  <span className="goa-nav-desc">Log a new match result</span>
                </div>
              </div>
              <span className="goa-nav-arrow">›</span>
            </div>
          </div>
        </Link>

        <Link href="/matches" className="goa-nav-link">
          <div className="goa-nav-btn atl">
            <div className="goa-nav-accent" />
            <div className="goa-nav-inner">
              <div className="goa-nav-left">
                <span className="goa-nav-icon">📜</span>
                <div className="goa-nav-text">
                  <span className="goa-nav-label">Battle Archives</span>
                  <span className="goa-nav-desc">Browse match history</span>
                </div>
              </div>
              <span className="goa-nav-arrow">›</span>
            </div>
          </div>
        </Link>

        <Link href="/leaderboard" className="goa-nav-link">
          <div className="goa-nav-btn lb">
            <div className="goa-nav-accent" />
            <div className="goa-nav-inner">
              <div className="goa-nav-left">
                <span className="goa-nav-icon">🏆</span>
                <div className="goa-nav-text">
                  <span className="goa-nav-label">Hall of Honour</span>
                  <span className="goa-nav-desc">MMR rankings & stats</span>
                </div>
              </div>
              <span className="goa-nav-arrow">›</span>
            </div>
          </div>
        </Link>
        <Link href="/teams" className="goa-nav-link">
          <div className="goa-nav-btn tm">
            <div className="goa-nav-accent" />
            <div className="goa-nav-inner">
              <div className="goa-nav-left">
                <span className="goa-nav-icon">👥</span>
                <div className="goa-nav-text">
                  <span className="goa-nav-label">Assemble Teams</span>
                  <span className="goa-nav-desc">
                    Create new teams for battle
                  </span>
                </div>
              </div>
              <span className="goa-nav-arrow">›</span>
            </div>
          </div>
        </Link>
      </nav>
    </main>
  );
}
