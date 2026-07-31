// app/heroes/page.tsx
"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase/client";
import { HEROES, Hero } from "@/lib/heroes";
import { didWin, renderStars } from "@/lib/match";

type RawMatch = {
  id: string;
  created_at: string;
  winner: string;
  match_players: {
    hero_id: string | null;
    team: string;
    player_id: string;
  }[];
};

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
      (matches as RawMatch[]).forEach((match, gameIndex) => {
        const mps = match.match_players ?? [];
        mps.forEach((mp) => {
          if (!mp.hero_id) return;
          const entry = map.get(mp.hero_id);
          if (!entry) return;

          // Set lastPlayedGame if this is the first time we see the hero (newest match)
          if (entry.lastPlayedGame === null) {
            entry.lastPlayedGame = gameIndex + 1;
          }

          entry.played++;
          entry.players.add(mp.player_id);

          if (didWin(mp.team, match.winner)) entry.wins++;
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
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">🦸</div>
          <p className="goa-loading-text wide">Gathering hero stats…</p>
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
        <div className="goa-bounty-section">
          <div className="goa-bounty-header">
            <div>💰 Bounty Heroes</div>
            <div className="goa-bounty-header-sub">
              <span>
                Not picked in {threshold}+ games · Bonus 5 MMR awarded on play
              </span>
            </div>
          </div>

          <div className="goa-bounty-grid">
            {forgottenHeroes.map((s) => (
              <div
                key={s.hero.id}
                className="goa-bounty-card"
                onClick={() => router.push(`/heroes/${s.hero.id}`)}
              >
                <div className="goa-bounty-card-icon-wrap">
                  <Image
                    src={s.hero.icon}
                    alt={s.hero.name}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="goa-bounty-card-name">{s.hero.name}</div>
                  <div className="goa-bounty-card-meta">
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

      {/* Hero table title */}
      <div className="goa-match-history-header lg">
        <span>🦸</span> Hero Statistics
      </div>

      {/* Sort pills */}
      <div className="goa-sort-bar mt-sm">
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
      <div className="goa-table-wrap">
        {/* Column headers */}
        <div className="goa-heroes-col-header">
          {[
            { key: "name", label: "Hero" },
            { key: "played", label: "GP" },
            { key: "winRate", label: "Win%" },
            { key: "wins", label: "W" },
            { key: "losses", label: "L" },
          ].map(({ key, label }) => (
            <span
              key={key}
              className={`goa-heroes-col-head ${key === "name" ? "left" : ""}`}
              onClick={() => handleSort(key as SortKey)}
            >
              {label}
            </span>
          ))}
        </div>

        {sortedTable.length === 0 && (
          <div className="goa-heroes-empty">No heroes found</div>
        )}

        {sortedTable.map((s) => {
          const wrClass =
            s.played === 0
              ? "muted"
              : s.winRate >= 60
                ? "good"
                : s.winRate >= 45
                  ? "mid"
                  : "bad";

          return (
            <div
              key={s.hero.id}
              className={`goa-heroes-row ${s.played > 0 ? "clickable" : ""}`}
              onClick={() =>
                s.played > 0 && router.push(`/heroes/${s.hero.id}`)
              }
            >
              {/* Name & Sub-details */}
              <div>
                <div className="goa-heroes-name-row">
                  <span
                    className={`goa-heroes-name ${s.played > 0 ? "" : "dim"}`}
                  >
                    <Image
                      src={s.hero.icon}
                      alt={s.hero.name}
                      width={24}
                      height={24}
                      className="object-contain shrink-0"
                    />
                    {s.hero.name}
                  </span>
                  {s.played > 0 && (
                    <span className="goa-heroes-row-arrow">›</span>
                  )}
                </div>

                {/* Stars + Last Played Info */}
                <div className="goa-heroes-sub-row">
                  <span className="goa-heroes-stars">
                    {renderStars(s.hero.complexity)}
                  </span>
                  <span>·</span>
                  <span className="goa-heroes-last-played">
                    {s.lastPlayedGame === null
                      ? "Never played"
                      : `${s.lastPlayedGame} ${s.lastPlayedGame === 1 ? "game" : "games"} ago`}
                  </span>
                </div>

                {/* Win rate bar */}
                {s.played > 0 && (
                  <div className="goa-heroes-bar-wrap">
                    <div
                      className={`goa-heroes-bar-fill ${wrClass}`}
                      style={
                        { "--bar-width": `${s.winRate}%` } as CSSProperties
                      }
                    />
                  </div>
                )}
              </div>

              {/* GP */}
              <span
                className={`goa-heroes-stat-cell ${s.played > 0 ? "gold" : "muted"}`}
              >
                {s.played > 0 ? s.played : "—"}
              </span>

              {/* Win % */}
              <span className={`goa-heroes-stat-cell ${wrClass}`}>
                {s.played > 0 ? `${s.winRate}%` : "—"}
              </span>

              {/* Wins */}
              <span
                className={`goa-heroes-stat-cell ${s.wins > 0 ? "gain" : "muted"}`}
              >
                {s.wins > 0 ? s.wins : "—"}
              </span>

              {/* Losses */}
              <span
                className={`goa-heroes-stat-cell ${s.losses > 0 ? "loss" : "muted"}`}
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
