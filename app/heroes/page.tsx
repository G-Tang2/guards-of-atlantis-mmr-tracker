// app/heroes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { HEROES, Hero } from "@/lib/heroes";

type HeroStat = {
  hero: Hero;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  players: Set<string>;
};

type SortKey = "name" | "played" | "winRate" | "wins" | "losses" | "complexity";

export default function HeroesPage() {
  const router = useRouter();
  const [heroStats, setHeroStats] = useState<HeroStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("played");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabaseClient
        .from("match_players")
        .select("hero_id, team, player_id, matches ( winner )");

      if (error || !data) {
        setLoading(false);
        return;
      }

      const map = new Map<string, HeroStat>();

      data.forEach((mp) => {
        if (!mp.hero_id) return;
        const hero = HEROES.find((h) => h.id === mp.hero_id);
        if (!hero) return;

        const match = Array.isArray(mp.matches) ? mp.matches[0] : mp.matches;
        if (!match) return;

        const won = mp.team === match.winner;

        if (!map.has(mp.hero_id)) {
          map.set(mp.hero_id, {
            hero,
            played: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            players: new Set(),
          });
        }

        const entry = map.get(mp.hero_id)!;
        entry.played++;
        entry.players.add(mp.player_id);
        if (won) entry.wins++;
        else entry.losses++;
      });

      const stats = Array.from(map.values()).map((s) => ({
        ...s,
        winRate: s.played === 0 ? 0 : Math.round((s.wins / s.played) * 100),
      }));

      setHeroStats(stats);
      setLoading(false);
    };
    load();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  const renderStars = (n: number | string) => "★".repeat(Number(n) || 0);

  const sorted = useMemo(() => {
    const list = [...heroStats];
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") diff = a.hero.name.localeCompare(b.hero.name);
      else if (sortKey === "played") diff = a.played - b.played;
      else if (sortKey === "winRate") diff = a.winRate - b.winRate;
      else if (sortKey === "wins") diff = a.wins - b.wins;
      else if (sortKey === "losses") diff = a.losses - b.losses;
      else if (sortKey === "complexity")
        diff = Number(a.hero.complexity) - Number(b.hero.complexity);
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [heroStats, sortKey, sortAsc]);

  // Also list heroes with 0 games
  const allHeroRows = useMemo(() => {
    const withData = new Set(sorted.map((s) => s.hero.id));
    const zeros = HEROES.filter((h) => !withData.has(h.id)).map((h) => ({
      hero: h,
      played: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      players: new Set<string>(),
    }));
    return [...sorted, ...zeros];
  }, [sorted]);

  const sortCols: { key: SortKey; label: string }[] = [
    { key: "played", label: "GP" },
    { key: "winRate", label: "Win %" },
    { key: "wins", label: "Wins" },
    { key: "losses", label: "Losses" },
    { key: "name", label: "hero" },
    { key: "complexity", label: "★" },
  ];

  if (loading) {
    return (
      <div
        className="goa-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🦸</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.78rem",
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Gathering hero stats…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <button className="goa-back" onClick={() => router.back()}>
        <span className="goa-back-arrow">‹</span> Home
      </button>

      <header className="goa-header">
        <h1 className="goa-title">Hero Compendium</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Sort pills */}
      <div className="goa-sort-bar" style={{ marginTop: "0.3rem" }}>
        {sortCols.map(({ key, label }) => (
          <button
            key={key}
            className={`goa-sort-btn ${sortKey === key ? "active" : ""}`}
            onClick={() => handleSort(key)}
          >
            {label}
            {sortKey === key && (
              <span className="goa-sort-arrow">{sortAsc ? "▲" : "▼"}</span>
            )}
          </button>
        ))}
      </div>

      {/* Hero table */}
      <div className="goa-table-wrap" style={{ margin: "0.6rem 0.75rem 2rem" }}>
        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 40px 60px 40px 40px",
            padding: "0.45rem 0.75rem",
            borderBottom: "1px solid var(--border)",
            background: "rgba(42,39,32,0.6)",
            gap: "0.25rem",
          }}
        >
          {[
            { key: "name", label: "Hero" },
            { key: "played", label: "GP" },
            { key: "winRate", label: "Win%" },
            { key: "wins", label: "W" },
            { key: "losses", label: "L" },
          ].map(({ key, label }) => (
            <span
              key={key}
              onClick={() => handleSort(key as SortKey)}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: sortKey === key ? "var(--gold)" : "var(--text-muted)",
                cursor: "pointer",
                userSelect: "none",
                textAlign: key === "name" ? "left" : "center",
              }}
            >
              {label}
              {sortKey === key ? (sortAsc ? " ▲" : " ▼") : ""}
            </span>
          ))}
        </div>

        {allHeroRows.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              fontFamily: "'Cinzel', serif",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            No heroes found
          </div>
        )}

        {allHeroRows.map((s) => {
          const wrColor =
            s.played === 0
              ? "var(--text-muted)"
              : s.winRate >= 60
                ? "var(--gain)"
                : s.winRate >= 45
                  ? "var(--gold-light)"
                  : "var(--loss)";

          return (
            <div
              key={s.hero.id}
              onClick={() =>
                s.played > 0 && router.push(`/heroes/${s.hero.id}`)
              }
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 40px 60px 40px 40px",
                alignItems: "center",
                padding: "0.55rem 0.75rem",
                borderBottom: "1px solid rgba(201,151,58,0.08)",
                background: "rgba(28,26,20,0.85)",
                gap: "0.25rem",
                cursor: s.played > 0 ? "pointer" : "default",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => {
                if (s.played > 0)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(42,39,32,0.9)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(28,26,20,0.85)";
              }}
            >
              {/* Name */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: "1rem",
                      color:
                        s.played > 0
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                    }}
                  >
                    {s.hero.name}
                  </span>
                  {s.played > 0 && (
                    <span
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: "1.1rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                      }}
                    >
                      ›
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    fontFamily: "'Cinzel', serif",
                    fontSize: "0.7rem",
                  }}
                >
                  {renderStars(s.hero.complexity)}
                </div>

                {/* Win rate bar */}
                {s.played > 0 && (
                  <div
                    style={{
                      marginTop: "0.25rem",
                      height: "3px",
                      background: "rgba(42,39,32,0.8)",
                      borderRadius: "2px",
                      overflow: "hidden",
                      maxWidth: "120px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${s.winRate}%`,
                        borderRadius: "2px",
                        background:
                          s.winRate >= 60
                            ? "linear-gradient(90deg, var(--gain), rgba(93,187,138,0.6))"
                            : s.winRate >= 45
                              ? "linear-gradient(90deg, var(--gold), rgba(201,151,58,0.6))"
                              : "linear-gradient(90deg, var(--loss), rgba(196,74,74,0.6))",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* GP */}
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "0.9rem",
                  color:
                    s.played > 0 ? "var(--gold-light)" : "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                {s.played > 0 ? s.played : "—"}
              </span>

              {/* Win % */}
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "0.9rem",
                  color: wrColor,
                  textAlign: "center",
                }}
              >
                {s.played > 0 ? `${s.winRate}%` : "—"}
              </span>

              {/* Wins */}
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "0.9rem",
                  color: s.wins > 0 ? "var(--gain)" : "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                {s.wins > 0 ? s.wins : "—"}
              </span>

              {/* Losses */}
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "0.9rem",
                  color: s.losses > 0 ? "var(--loss)" : "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                {s.losses > 0 ? s.losses : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
