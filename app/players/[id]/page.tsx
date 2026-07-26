/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Hero, HEROES } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

type MatchPlayer = {
  player_id: string;
  team: "atlantis" | "titans";
  mmr_before: number;
  mmr_after: number;
  hero_id?: string | null;
  players: Player;
};

type Match = {
  id: string;
  winner: "atlantis" | "titans";
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  match_players: MatchPlayer[];
};
type HeroStat = {
  hero: Hero;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
};

type H2HEntry = {
  opponent: Player;
  withWins: number;
  withLosses: number;
  withMatches: number;
  againstWins: number;
  againstLosses: number;
  againstMatches: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

const heroById = (id: string | null): Hero | null =>
  id ? (HEROES.find((h) => h.id === id) ?? null) : null;

// ─── MMR Sparkline chart ───────────────────────────────────────────────────────

function MmrChart({
  points,
}: {
  points: { mmr: number; won: boolean; date: string }[];
}) {
  if (points.length < 2) {
    return (
      <p className="goa-chart-empty">Not enough battles to chart a trend</p>
    );
  }

  const W = 320,
    H = 100,
    PAD = { t: 12, r: 8, b: 28, l: 36 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const mmrs = points.map((p) => p.mmr);
  const minM = Math.min(...mmrs) - 20;
  const maxM = Math.max(...mmrs) + 20;

  const xOf = (i: number) => PAD.l + (i / (points.length - 1)) * iW;
  const yOf = (m: number) => PAD.t + iH - ((m - minM) / (maxM - minM)) * iH;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.mmr).toFixed(1)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L${xOf(points.length - 1).toFixed(1)},${(PAD.t + iH).toFixed(1)} L${PAD.l},${(PAD.t + iH).toFixed(1)} Z`;

  const yTicks = [minM + 20, Math.round((minM + maxM) / 2), maxM - 20];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="goa-chart-svg">
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9973A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#C9973A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.l}
            y1={yOf(t)}
            x2={W - PAD.r}
            y2={yOf(t)}
            className="goa-chart-axis"
          />
          <text
            x={PAD.l - 4}
            y={yOf(t) + 3}
            textAnchor="end"
            className="goa-chart-label"
          >
            {t}
          </text>
        </g>
      ))}

      <line
        x1={PAD.l}
        y1={PAD.t + iH}
        x2={W - PAD.r}
        y2={PAD.t + iH}
        className="goa-chart-axis"
      />

      <path d={areaPath} className="goa-chart-area" />
      <path d={linePath} className="goa-chart-line" />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={xOf(i)}
          cy={yOf(p.mmr)}
          r={3}
          className={`goa-chart-dot ${p.won ? "win" : "loss"}`}
        />
      ))}

      {[0, points.length - 1].map((i) => (
        <text
          key={i}
          x={xOf(i)}
          y={H - 6}
          textAnchor={i === 0 ? "start" : "end"}
          className="goa-chart-label"
        >
          {formatDate(points[i].date)}
        </text>
      ))}
    </svg>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "heroes" | "h2h">(
    "matches",
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;
    setAvatarUploading(true);
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const SIZE = 200;
            const canvas = document.createElement("canvas");
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext("2d")!;
            const min = Math.min(img.width, img.height);
            const sx = (img.width - min) / 2;
            const sy = (img.height - min) / 2;
            ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.onerror = reject;
          img.src = ev.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await supabaseClient
        .from("players")
        .update({ avatar_url: url })
        .eq("id", player.id);
      setPlayer((p) => (p ? { ...p, avatar_url: url } : p));
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!playerId) return;

    const load = async () => {
      const [{ data: pData }, { data: mData }] = await Promise.all([
        supabaseClient
          .from("players")
          .select("id, name, mmr, avatar_url")
          .eq("id", playerId)
          .single(),
        supabaseClient
          .from("matches")
          .select(
            `
            id, winner, created_at, atlantis_avg_mmr, titans_avg_mmr,
            match_players (
              player_id, team, mmr_before, mmr_after, hero_id,
              players ( id, name, mmr, avatar_url )
            )
          `,
          )
          .order("created_at", { ascending: false }),
      ]);

      setPlayer(pData ?? null);

      const normalized: Match[] = (mData ?? [])
        .filter((m: any) =>
          m.match_players.some((mp: any) => mp.player_id === playerId),
        )
        .map((m: any) => ({
          ...m,
          match_players: m.match_players
            .map((mp: any) => {
              const p = Array.isArray(mp.players) ? mp.players[0] : mp.players;
              if (!p) return null;
              return { ...mp, hero_id: mp.hero_id ?? null, players: { ...p } };
            })
            .filter(Boolean),
        }));

      setMatches(normalized);
      setLoading(false);
    };

    load();
  }, [playerId]);

  // ── Derived stats ────────────────────────────────────────────────────────────

  const myMatches = useMemo(
    () =>
      matches.filter((m) =>
        m.match_players.some((mp) => mp.player_id === playerId),
      ),
    [matches, playerId],
  );

  const { wins, losses, totalMatches, winRate, mmrTrend, streak } =
    useMemo(() => {
      let w = 0,
        l = 0;
      const trend: { mmr: number; won: boolean; date: string }[] = [];

      const chronological = [...myMatches].reverse();
      chronological.forEach((m) => {
        const me = m.match_players.find((mp) => mp.player_id === playerId);
        if (!me) return;
        const won = me.team === m.winner;
        if (won) w++;
        else l++;
        trend.push({ mmr: me.mmr_after, won, date: m.created_at });
      });

      let streak = 0;
      for (const m of myMatches) {
        const me = m.match_players.find((mp) => mp.player_id === playerId);
        if (!me) break;
        const won = me.team === m.winner;
        if (streak === 0) {
          streak = won ? 1 : -1;
        } else if (streak > 0 && won) streak++;
        else if (streak < 0 && !won) streak--;
        else break;
      }

      const total = w + l;
      return {
        wins: w,
        losses: l,
        totalMatches: total,
        winRate: total === 0 ? 0 : Math.round((w / total) * 100),
        mmrTrend: trend,
        streak,
      };
    }, [myMatches, playerId]);

  // ── H2H stats ────────────────────────────────────────────────────────────────

  const h2hStats: H2HEntry[] = useMemo(() => {
    const map = new Map<string, H2HEntry>();

    myMatches.forEach((m) => {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me) return;
      const myTeam = me.team;
      const won = myTeam === m.winner;

      m.match_players.forEach((mp) => {
        if (mp.player_id === playerId) return;
        const opId = mp.player_id;

        if (!map.has(opId)) {
          map.set(opId, {
            opponent: mp.players,
            withWins: 0,
            withLosses: 0,
            withMatches: 0,
            againstWins: 0,
            againstLosses: 0,
            againstMatches: 0,
          });
        }

        const entry = map.get(opId)!;

        if (mp.team === myTeam) {
          entry.withMatches++;
          if (won) entry.withWins++;
          else entry.withLosses++;
        } else {
          entry.againstMatches++;
          if (won) entry.againstWins++;
          else entry.againstLosses++;
        }
      });
    });

    return Array.from(map.values())
      .filter((e) => e.withMatches + e.againstMatches > 0)
      .sort(
        (a, b) =>
          b.withMatches + b.againstMatches - (a.withMatches + a.againstMatches),
      );
  }, [myMatches, playerId]);

  // ── Hero stats ──────────────────────────────────────────────────────────────
  const heroStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number }>();
    myMatches.forEach((m) => {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me || !me.hero_id) return;
      const won = me.team === m.winner;
      const cur = map.get(me.hero_id) ?? { wins: 0, losses: 0 };
      map.set(me.hero_id, {
        wins: cur.wins + (won ? 1 : 0),
        losses: cur.losses + (won ? 0 : 1),
      });
    });
    return Array.from(map.entries())
      .map(([heroId, { wins, losses }]) => {
        const hero = HEROES.find((h) => h.id === heroId);
        if (!hero) return null;
        const played = wins + losses;
        return {
          hero,
          played,
          wins,
          losses,
          winRate: played === 0 ? 0 : Math.round((wins / played) * 100),
        };
      })
      .filter((x): x is HeroStat => x !== null)
      .sort((a, b) => b.played - a.played);
  }, [myMatches, playerId]);

  if (loading || !player) {
    return (
      <div className="goa-root">
        <div className="goa-loading">
          <div style={{ fontSize: "2rem" }}>⚔️</div>
          <p>Consulting the archives…</p>
        </div>
      </div>
    );
  }

  const renderStars = (n: number) => "★".repeat(n);

  const streakLabel =
    streak > 0
      ? `${streak}W streak`
      : streak < 0
        ? `${Math.abs(streak)}L streak`
        : "—";
  const streakColor =
    streak > 0 ? "var(--gain)" : streak < 0 ? "var(--loss)" : "var(--muted)";

  return (
    <main className="goa-root">
      {/* Back */}
      <button className="goa-back" onClick={() => router.back()}>
        <span className="goa-back-arrow">‹</span> Back
      </button>

      {/* Hero */}
      <div className="goa-hero-banner">
        <div
          className="goa-avatar-wrap"
          onClick={() => fileInputRef.current?.click()}
        >
          <PlayerAvatar
            avatarUrl={player.avatar_url}
            name={player.name}
            size={80}
            borderColor="var(--gold)"
          />
          {avatarUploading && <div className="goa-avatar-uploading">⏳</div>}

          {/* Always visible semi-opaque helper badge */}
          <div className="goa-avatar-edit-btn">
            <span className="goa-avatar-edit-icon"></span>
            <span className="goa-avatar-edit-text">Edit</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
        <h1 className="goa-profile-player-name">{player.name}</h1>
        <p className="goa-mmr-display">
          <b>{player.mmr}</b> MMR
        </p>
      </div>

      {/* Stat tiles */}
      <div className="goa-stats-grid">
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Win Rate</div>
          <div className="goa-stat-val">{winRate}%</div>
          <div className="goa-win-bar-wrap">
            <div className="goa-win-bar" style={{ width: `${winRate}%` }} />
          </div>
        </div>

        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Battles</div>
          <div className="goa-stat-val">{totalMatches}</div>
          <div className="goa-stat-sub">matches played</div>
        </div>

        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Record</div>
          <div className="goa-wl-row">
            <span className="goa-wins">{wins}W</span>
            <span className="goa-wl-sep">/</span>
            <span className="goa-losses">{losses}L</span>
          </div>
          <div className="goa-stat-sub">victories / defeats</div>
        </div>

        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Streak</div>
          <div
            className="goa-stat-val"
            style={{ color: streakColor, fontSize: "1rem" }}
          >
            {streakLabel}
          </div>
          <div className="goa-stat-sub">current run</div>
        </div>
      </div>

      {/* MMR Trend */}
      <div className="goa-section">
        <div className="goa-sec-head">MMR Trend</div>
        <div className="goa-chart-wrap">
          <MmrChart points={mmrTrend} />
          {mmrTrend.length >= 2 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "0.5rem",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "0.58rem",
                  color: "var(--muted)",
                  letterSpacing: "0.06em",
                }}
              >
                ● <span style={{ color: "var(--gain)" }}>Win</span> &nbsp; ●{" "}
                <span style={{ color: "var(--loss)" }}>Loss</span>
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "0.58rem",
                  color: "var(--muted)",
                  letterSpacing: "0.06em",
                }}
              >
                {totalMatches} battles charted
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab selector */}
      <div className="goa-profile-tabs">
        {(
          [
            ["matches", "History"],
            ["heroes", "Heroes"],
            ["h2h", "H2H"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            className={`goa-profile-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab as "matches" | "heroes" | "h2h")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Match History */}
      {activeTab === "matches" && (
        <div className="goa-profile-section">
          <div className="goa-profile-sec-head">Recent Battles</div>

          {myMatches.length === 0 && (
            <p
              style={{
                textAlign: "center",
                padding: "1.5rem",
                fontFamily: "'Cinzel', serif",
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              No battles on record
            </p>
          )}

          {myMatches.map((m) => {
            const me = m.match_players.find((mp) => mp.player_id === playerId)!;
            if (!me) return null;
            const won = me.team === m.winner;
            const delta = me.mmr_after - me.mmr_before;
            const hero = me.hero_id ? heroById(me.hero_id) : null;

            const myTeammates = m.match_players
              .filter((mp) => mp.team === me.team && mp.player_id !== playerId)
              .map((mp) => mp.players);

            const enemies = m.match_players
              .filter((mp) => mp.team !== me.team)
              .map((mp) => mp.players);

            return (
              <div key={m.id} className="goa-profile-match-row">
                <div className={`goa-match-badge ${won ? "win" : "loss"}`}>
                  {won ? "Victory" : "Defeat"}
                </div>

                <div className="goa-match-info">
                  <div className="goa-match-date">
                    {formatDate(m.created_at)}
                  </div>
                  {/* Hero played */}
                  {hero && (
                    <div
                      style={{
                        marginTop: "0.15rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Cinzel',serif",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {hero.name} {renderStars(Number(hero.complexity))}
                      </span>
                    </div>
                  )}
                  {/* My team */}
                  <div
                    className="goa-match-teams"
                    style={{ marginTop: "0.15rem" }}
                  >
                    {myTeammates.length > 0 && (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                        }}
                      >
                        {" "}
                        with{" "}
                        <>
                          {myTeammates.map((p, i) => (
                            <React.Fragment key={p.id}>
                              {i > 0 && ", "}
                              <span className="goa-vs-player">{p.name}</span>
                            </React.Fragment>
                          ))}
                        </>
                      </span>
                    )}
                  </div>
                  {/* Enemy team */}
                  <div
                    className="goa-match-teams"
                    style={{ marginTop: "0.15rem" }}
                  >
                    {enemies.length > 0 && (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                        }}
                      >
                        {" "}
                        vs{" "}
                        <>
                          {enemies.map((p, i) => (
                            <React.Fragment key={p.id}>
                              {i > 0 && ", "}
                              <span className="goa-vs-player">{p.name}</span>
                            </React.Fragment>
                          ))}
                        </>
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`goa-match-delta ${delta >= 0 ? "pos" : "neg"}`}
                >
                  {delta >= 0 ? "▲" : "▼"}
                  {Math.abs(delta)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Heroes */}
      {activeTab === "heroes" && (
        <div className="goa-profile-section">
          <div className="goa-profile-sec-head">Hero Performance</div>

          {heroStats.length === 0 && (
            <p
              style={{
                textAlign: "center",
                padding: "1.5rem",
                fontFamily: "'Cinzel', serif",
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              No hero data recorded yet
            </p>
          )}

          {heroStats.map((hs) => {
            const wrClass =
              hs.winRate >= 60 ? "good" : hs.winRate >= 45 ? "mid" : "bad";
            const barColor =
              hs.winRate >= 60
                ? "linear-gradient(90deg, var(--gain), rgba(93,187,138,0.6))"
                : hs.winRate >= 45
                  ? "linear-gradient(90deg, var(--gold), rgba(201,151,58,0.6))"
                  : "linear-gradient(90deg, var(--loss), rgba(196,74,74,0.6))";
            return (
              <div key={hs.hero.id} className="goa-hero-stat-row">
                <div className="goa-hero-stat-info">
                  <div className="goa-hero-stat-hero-info">
                    <div className="goa-hero-stat-name">{hs.hero.name}</div>
                    <div className="goa-hero-stat-complexity">
                      {renderStars(Number(hs.hero.complexity))}
                    </div>
                  </div>

                  <div className="goa-hero-stat-bar-wrap">
                    <div
                      className="goa-hero-stat-bar-fill"
                      style={{ width: `${hs.winRate}%`, background: barColor }}
                    />
                  </div>
                  <div className="goa-hero-stat-games">
                    {hs.played} game{hs.played !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="goa-hero-stat-right">
                  <div className={`goa-hero-stat-wr ${wrClass}`}>
                    {hs.winRate}%
                  </div>
                  <div className="goa-hero-stat-wl">
                    <span style={{ color: "var(--gain)" }}>{hs.wins}W</span>
                    <span style={{ color: "var(--text-muted)" }}>/</span>
                    <span style={{ color: "var(--loss)" }}>{hs.losses}L</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Head to Head */}
      {activeTab === "h2h" && (
        <div className="goa-profile-section">
          <div className="goa-profile-sec-head">Head to Head</div>

          {h2hStats.length === 0 && (
            <p className="goa-h2h-no-data">No head-to-head data yet</p>
          )}

          {h2hStats.map((entry) => {
            const withRate =
              entry.withMatches === 0
                ? 0
                : Math.round((entry.withWins / entry.withMatches) * 100);
            const againstRate =
              entry.againstMatches === 0
                ? 0
                : Math.round((entry.againstWins / entry.againstMatches) * 100);

            return (
              <div key={entry.opponent.id} className="goa-h2h-row">
                <div className="goa-h2h-name">
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <PlayerAvatar
                      avatarUrl={entry.opponent.avatar_url}
                      name={entry.opponent.name}
                      size={22}
                    />
                    {entry.opponent.name}
                  </span>
                  <span className="goa-h2h-mmr">{entry.opponent.mmr} MMR</span>
                </div>

                <div className="goa-h2h-bars">
                  {entry.withMatches > 0 && (
                    <div className="goa-h2h-bar-row">
                      <span
                        className="goa-h2h-bar-lbl"
                        style={{ color: "var(--atl)" }}
                      >
                        With
                      </span>
                      <div className="goa-h2h-bar-track">
                        <div
                          className="goa-h2h-bar-fill with"
                          style={{ width: `${withRate}%` }}
                        />
                      </div>
                      <span className="goa-h2h-bar-stat">
                        {entry.withWins}W/{entry.withLosses}L
                      </span>
                    </div>
                  )}

                  {entry.againstMatches > 0 && (
                    <div className="goa-h2h-bar-row">
                      <span
                        className="goa-h2h-bar-lbl"
                        style={{ color: "var(--tit)" }}
                      >
                        Vs
                      </span>
                      <div className="goa-h2h-bar-track">
                        <div
                          className="goa-h2h-bar-fill against"
                          style={{ width: `${againstRate}%` }}
                        />
                      </div>
                      <span className="goa-h2h-bar-stat">
                        {entry.againstWins}W/{entry.againstLosses}L
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
