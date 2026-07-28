// app/heroes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase/client";
import { HEROES, Hero } from "@/lib/heroes";

type HeroStat = {
  hero: Hero;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  players: Set<string>;
  lastPlayedGame: number | null;
};

type SortKey = "name" | "played" | "winRate" | "wins" | "losses" | "complexity";

export default function HeroesPage() {
  const router = useRouter();
  const [heroStats, setHeroStats] = useState<HeroStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("played");
  const [sortAsc, setSortAsc] = useState(false);
  const threshold = 7;

  useEffect(() => {
    const load = async () => {
      // Fetch matches ordered by newest first to calculate last played and overall stats
      const { data: matches, error } = await supabaseClient
        .from("matches")
        .select(
          "id, created_at, winner, match_players ( hero_id, team, player_id )",
        )
        .order("created_at", { ascending: false });

      if (error || !matches) {
        setLoading(false);
        return;
      }

      const map = new Map<string, HeroStat>();

      // Initialize all heroes so we can easily track unplayed ones
      HEROES.forEach((hero) => {
        map.set(hero.id, {
          hero,
          played: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          players: new Set(),
          lastPlayedGame: null,
        });
      });

      // Process matches
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matches.forEach((match: any, gameIndex: number) => {
        const mps = match.match_players ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mps.forEach((mp: any) => {
          if (!mp.hero_id) return;
          const entry = map.get(mp.hero_id);
          if (!entry) return;

          // Set lastPlayedGame if this is the first time we see the hero (newest match)
          if (entry.lastPlayedGame === null) {
            entry.lastPlayedGame = gameIndex + 1;
          }

          entry.played++;
          entry.players.add(mp.player_id);

          const won = mp.team === match.winner || match.winner === "none";
          if (won) entry.wins++;
          else entry.losses++;
        });
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

  // 1. Filter and sort heroes for the "Unplayed" section at the top
  const forgottenHeroes = useMemo(() => {
    return heroStats
      .filter((s) => s.lastPlayedGame === null || s.lastPlayedGame > threshold)
      .sort((a, b) => {
        // Never-played first, then by how long ago (further back = higher priority)
        if (a.lastPlayedGame === null && b.lastPlayedGame !== null) return -1;
        if (a.lastPlayedGame !== null && b.lastPlayedGame === null) return 1;
        if (a.lastPlayedGame === null && b.lastPlayedGame === null)
          return a.hero.name.localeCompare(b.hero.name);
        return b.lastPlayedGame! - a.lastPlayedGame!; // longer ago = first
      });
  }, [heroStats, threshold]);

  // 2. Sort the main compendium table
  const sortedTable = useMemo(() => {
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

  const sortCols: { key: SortKey; label: string }[] = [
    { key: "name", label: "hero" },
    { key: "played", label: "GP" },
    { key: "winRate", label: "Win %" },
    { key: "wins", label: "Wins" },
    { key: "losses", label: "Losses" },
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

      {/* Forgotten Heroes Section - Compact Grid */}
      {forgottenHeroes.length > 0 && (
        <div style={{ margin: "0.6rem 0.75rem 1rem" }}>
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold)",
              padding: "0.5rem",
              paddingTop: "0rem",
              borderBottom: "1px solid var(--border)",
              marginBottom: "0.5rem",
            }}
          >
            <div>💰 Bounty Heroes</div>
            <div
              style={{
                fontSize: "0.62rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontWeight: 500,
              }}
            >
              <span>
                Not picked in {threshold}+ games · Bonus 5 MMR awarded on play
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "0.35rem",
            }}
          >
            {forgottenHeroes.map((s) => (
              <div
                key={s.hero.id}
                onClick={() => router.push(`/heroes/${s.hero.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0.35rem 0.5rem",
                  border: "1px solid rgba(201,151,58,0.18)",
                  background: "rgba(28,26,20,0.85)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  gap: "0.4rem",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(42,39,32,0.9)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(28,26,20,0.85)";
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={s.hero.icon}
                    alt={s.hero.name}
                    fill
                    style={{ objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: "0.85rem",
                      lineHeight: "1.1",
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.hero.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.04em",
                      lineHeight: "1",
                      marginTop: "0.1rem",
                    }}
                  >
                    {s.lastPlayedGame === null
                      ? "Never played"
                      : `${s.lastPlayedGame} ${s.lastPlayedGame === 1 ? "game" : "games"} ago`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            gridTemplateColumns: "1fr 30px 50px 30px 30px",
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
                color: "var(--text-muted)",
                cursor: "pointer",
                userSelect: "none",
                textAlign: key === "name" ? "left" : "center",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {sortedTable.length === 0 && (
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

        {sortedTable.map((s) => {
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
                gridTemplateColumns: "1fr 30px 50px 30px 30px",
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
              {/* Name & Sub-details */}
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
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      color:
                        s.played > 0
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                    }}
                  >
                    <Image
                      src={s.hero.icon}
                      alt={s.hero.name}
                      width={24}
                      height={24}
                      style={{ objectFit: "contain", flexShrink: 0 }}
                    />
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

                {/* Stars + Last Played Info */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    color: "var(--text-muted)",
                    fontFamily: "'Cinzel', serif",
                    fontSize: "0.62rem",
                    marginTop: "0.1rem",
                  }}
                >
                  <span
                    style={{
                      letterSpacing: ".15em",
                      textTransform: "uppercase",
                    }}
                  >
                    {renderStars(s.hero.complexity)}
                  </span>
                  <span>·</span>
                  <span style={{ letterSpacing: "0.04em" }}>
                    {s.lastPlayedGame === null
                      ? "Never played"
                      : `${s.lastPlayedGame} ${s.lastPlayedGame === 1 ? "game" : "games"} ago`}
                  </span>
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
