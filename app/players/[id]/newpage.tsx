"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { HEROES, ROLE_COLORS, ROLE_ICON, Hero } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Player = { id: string; name: string; mmr: number; avatar_url?: string | null };

type MatchPlayer = {
  player_id: string;
  team: "atlantis" | "titans";
  mmr_before: number;
  mmr_after: number;
  hero_id: string | null;
  players: Player;
};

type Match = {
  id: string;
  winner: "atlantis" | "titans";
  played_at: string;
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
  opponent: Player; // Player already has avatar_url
  withWins: number; withLosses: number; withMatches: number;
  againstWins: number; againstLosses: number; againstMatches: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`;
};

const heroById = (id: string | null): Hero | null =>
  id ? (HEROES.find((h) => h.id === id) ?? null) : null;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');

  .goa-root {
    --gold:#C9973A; --gold-light:#F0C96A; --gold-dark:#7A5A1A;
    --atl:#C42A3A; --atl-light:#E8364A;
    --tit:#2AABB8; --tit-light:#3DCAD8;
    --stone:#1C1A14; --stone-mid:#2A2720; --stone-lt:#3A3628;
    --border:rgba(201,151,58,0.28); --border-b:rgba(201,151,58,0.65);
    --txt:#F0E6C8; --muted:#A09070;
    --gain:#5DBB8A; --loss:#C44A4A;
    font-family:'Crimson Pro',Georgia,serif;
    background:
      radial-gradient(ellipse 140% 55% at 50% 0%,rgba(196,42,58,0.15) 0%,transparent 52%),
      radial-gradient(ellipse 90% 40% at 50% 100%,rgba(42,107,122,0.1) 0%,transparent 50%),
      repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(201,151,58,0.022) 40px),
      repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(201,151,58,0.022) 40px),
      #1C1A14;
    min-height:100vh; color:var(--txt);
  }

  .goa-back { display:flex; align-items:center; gap:0.4rem; padding:0.9rem 0.9rem 0; background:none; border:none; color:var(--muted); font-family:'Cinzel',serif; font-size:0.62rem; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; transition:color 0.15s; }
  .goa-back:hover { color:var(--gold-light); }

  .goa-hero-banner { padding:1rem 1rem 0; text-align:center; position:relative; }
  .goa-hero-banner::after { content:''; display:block; height:2px; background:linear-gradient(90deg,transparent,var(--gold),transparent); margin:1.1rem auto 0; width:75%; }
  .goa-avatar { width:64px; height:64px; border-radius:50%; border:2px solid var(--gold); background:linear-gradient(135deg,var(--stone-lt),var(--stone-mid)); display:flex; align-items:center; justify-content:center; margin:0 auto 0.65rem; font-family:'Cinzel',serif; font-size:1.5rem; font-weight:700; color:var(--gold-light); box-shadow:0 0 20px rgba(201,151,58,0.2); }
  .goa-player-name { font-family:'Cinzel',serif; font-size:1.35rem; font-weight:700; color:var(--gold-light); letter-spacing:0.06em; text-transform:uppercase; text-shadow:0 0 20px rgba(201,151,58,0.4); margin:0 0 0.2rem; }
  .goa-mmr-display { font-family:'Cinzel',serif; font-size:0.72rem; letter-spacing:0.15em; color:var(--muted); text-transform:uppercase; }
  .goa-mmr-display b { color:var(--gold); font-size:1rem; }

  /* Stat grid */
  .goa-stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin:0.75rem; }
  .goa-stat-tile { background:rgba(28,26,20,0.85); border:1px solid var(--border); border-radius:4px; padding:0.7rem 0.85rem; position:relative; overflow:hidden; }
  .goa-stat-tile::before { content:''; position:absolute; top:0;left:0;right:0; height:1px; background:linear-gradient(90deg,transparent,var(--border-b),transparent); }
  .goa-stat-lbl { font-family:'Cinzel',serif; font-size:0.58rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--muted); margin-bottom:0.25rem; }
  .goa-stat-val { font-family:'Cinzel',serif; font-size:1.35rem; font-weight:700; color:var(--gold-light); line-height:1; }
  .goa-stat-sub { font-size:0.72rem; color:var(--muted); font-style:italic; margin-top:0.15rem; }
  .goa-win-bar-wrap { margin-top:0.5rem; height:6px; background:rgba(196,74,74,0.2); border-radius:3px; overflow:hidden; }
  .goa-win-bar { height:100%; background:linear-gradient(90deg,var(--gain),rgba(93,187,138,0.7)); border-radius:3px; transition:width 0.6s ease; }
  .goa-wl-row { display:flex; align-items:center; gap:0.5rem; margin-top:0.35rem; }
  .goa-wins { color:var(--gain); font-family:'Cinzel',serif; font-size:0.85rem; font-weight:600; }
  .goa-losses { color:var(--loss); font-family:'Cinzel',serif; font-size:0.85rem; font-weight:600; }

  /* Section card */
  .goa-section { margin:0 0.75rem 0.75rem; border:1px solid var(--border); border-radius:4px; overflow:hidden; background:rgba(28,26,20,0.85); position:relative; }
  .goa-section::before { content:''; position:absolute; top:0;left:0;right:0; height:1px; background:linear-gradient(90deg,transparent,var(--border-b),transparent); }
  .goa-sec-head { padding:0.55rem 0.85rem; display:flex; align-items:center; gap:0.4rem; border-bottom:1px solid var(--border); background:linear-gradient(135deg,rgba(42,39,32,0.55),rgba(28,26,20,0.8)); font-family:'Cinzel',serif; font-size:0.68rem; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:var(--gold); }

  /* Chart */
  .goa-chart-wrap { padding:0.75rem; overflow:hidden; }
  .goa-chart-svg { width:100%; overflow:visible; }
  .goa-chart-line { fill:none; stroke:var(--gold); stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
  .goa-chart-area { fill:url(#goldGrad); opacity:0.25; }
  .goa-chart-dot { fill:var(--stone); stroke:var(--gold-light); stroke-width:1.5; }
  .goa-chart-dot.win { stroke:var(--gain); }
  .goa-chart-dot.loss { stroke:var(--loss); }
  .goa-chart-label { font-family:'Cinzel',serif; font-size:9px; fill:var(--muted); }
  .goa-chart-axis { stroke:var(--border); stroke-width:0.5; }
  .goa-chart-empty { text-align:center; font-family:'Cinzel',serif; font-size:0.65rem; letter-spacing:0.1em; color:var(--muted); text-transform:uppercase; padding:1.5rem; }

  /* Tabs */
  .goa-tabs { display:flex; margin:0 0.75rem 0.6rem; gap:0.4rem; }
  .goa-tab { flex:1; background:rgba(28,26,20,0.85); border:1px solid var(--border); border-radius:4px; color:var(--muted); font-family:'Cinzel',serif; font-size:0.6rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; padding:0.5rem 0.3rem; cursor:pointer; transition:all 0.15s; }
  .goa-tab.active { background:rgba(201,151,58,0.14); border-color:var(--border-b); color:var(--gold-light); }

  /* Match rows */
  .goa-match-row { padding:0.5rem 0.72rem; border-bottom:1px solid rgba(201,151,58,0.08); transition:background 0.12s; }
  .goa-match-row:last-child { border-bottom:none; }
  .goa-match-row:hover { background:rgba(42,39,32,0.5); }
  .goa-match-top { display:grid; grid-template-columns:50px 1fr auto; align-items:center; gap:0.5rem; }
  .goa-match-badge { font-family:'Cinzel',serif; font-size:0.58rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; padding:0.2rem 0.35rem; border-radius:2px; text-align:center; }
  .goa-match-badge.win  { background:rgba(93,187,138,0.14); color:var(--gain); border:1px solid rgba(93,187,138,0.28); }
  .goa-match-badge.loss { background:rgba(196,42,58,0.1);   color:var(--loss); border:1px solid rgba(196,42,58,0.22); }
  .goa-match-date { font-family:'Cinzel',serif; font-size:0.6rem; letter-spacing:0.06em; color:var(--muted); }
  .goa-match-meta { font-size:0.78rem; color:var(--txt); margin-top:0.06rem; display:flex; align-items:center; gap:0.3rem; flex-wrap:wrap; }
  .goa-match-delta { font-family:'Cinzel',serif; font-size:0.7rem; font-weight:600; text-align:right; }
  .goa-match-delta.pos { color:var(--gain); }
  .goa-match-delta.neg { color:var(--loss); }
  /* Hero pill shown in match row */
  .goa-match-hero-pill {
    display:inline-flex; align-items:center; gap:0.22rem;
    font-size:0.72rem; color:var(--muted);
    background:rgba(42,39,32,0.7);
    border:1px solid rgba(201,151,58,0.15);
    border-radius:2px;
    padding:0.06rem 0.3rem;
    margin-top:0.2rem;
    font-family:'Crimson Pro',serif;
  }
  .goa-match-hero-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
  .goa-atl { color:var(--atl-light); }
  .goa-tit { color:var(--tit-light); }

  /* ── Hero stats section ── */
  .goa-hero-row {
    display:grid;
    grid-template-columns:auto 1fr auto;
    align-items:center;
    gap:0.55rem;
    padding:0.55rem 0.72rem;
    border-bottom:1px solid rgba(201,151,58,0.07);
    transition:background 0.12s;
  }
  .goa-hero-row:last-child { border-bottom:none; }
  .goa-hero-row:hover { background:rgba(42,39,32,0.5); }

  .goa-hero-icon-wrap {
    width:32px; height:32px;
    border-radius:3px;
    display:flex; align-items:center; justify-content:center;
    font-size:1.15rem;
    flex-shrink:0;
    background:rgba(42,39,32,0.7);
    border:1px solid rgba(201,151,58,0.15);
  }

  .goa-hero-info { min-width:0; }
  .goa-hero-name-row { display:flex; align-items:center; gap:0.35rem; }
  .goa-hero-name-text { font-size:0.88rem; color:var(--txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .goa-hero-role-badge {
    font-family:'Cinzel',serif; font-size:0.46rem; letter-spacing:0.08em; text-transform:uppercase;
    padding:0.06rem 0.28rem; border-radius:2px; flex-shrink:0; font-weight:600;
  }
  .goa-hero-bar-wrap {
    margin-top:0.28rem;
    height:4px;
    background:rgba(196,74,74,0.2);
    border-radius:2px;
    overflow:hidden;
  }
  .goa-hero-bar-fill {
    height:100%; border-radius:2px;
    transition:width 0.6s ease;
  }

  .goa-hero-stats-right { text-align:right; flex-shrink:0; }
  .goa-hero-wr {
    font-family:'Cinzel',serif; font-size:0.82rem; font-weight:700;
  }
  .goa-hero-wr.good { color:var(--gain); }
  .goa-hero-wr.bad  { color:var(--loss); }
  .goa-hero-wr.avg  { color:var(--gold-light); }
  .goa-hero-wl { font-family:'Cinzel',serif; font-size:0.56rem; color:var(--muted); margin-top:0.1rem; }
  .goa-hero-played { font-family:'Cinzel',serif; font-size:0.52rem; color:var(--muted); letter-spacing:0.06em; }

  .goa-no-data { text-align:center; font-style:italic; font-size:0.82rem; color:var(--muted); padding:1.5rem; }

  /* H2H */
  .goa-h2h-row { padding:0.55rem 0.72rem; border-bottom:1px solid rgba(201,151,58,0.08); transition:background 0.12s; }
  .goa-h2h-row:last-child { border-bottom:none; }
  .goa-h2h-row:hover { background:rgba(42,39,32,0.5); }
  .goa-h2h-name { font-family:'Cinzel',serif; font-size:0.7rem; font-weight:600; letter-spacing:0.06em; color:var(--txt); margin-bottom:0.3rem; display:flex; justify-content:space-between; align-items:center; }
  .goa-h2h-mmr { font-size:0.56rem; color:var(--muted); font-weight:400; }
  .goa-h2h-bars { display:flex; flex-direction:column; gap:0.25rem; }
  .goa-h2h-bar-row { display:flex; align-items:center; gap:0.38rem; }
  .goa-h2h-bar-lbl { font-family:'Cinzel',serif; font-size:0.5rem; letter-spacing:0.1em; text-transform:uppercase; width:32px; flex-shrink:0; }
  .goa-h2h-bar-track { flex:1; height:5px; background:rgba(42,39,32,0.8); border-radius:3px; overflow:hidden; }
  .goa-h2h-bar-fill { height:100%; border-radius:3px; transition:width 0.5s ease; }
  .goa-h2h-bar-fill.with    { background:linear-gradient(90deg,var(--atl),rgba(232,54,74,0.5)); }
  .goa-h2h-bar-fill.against { background:linear-gradient(90deg,var(--tit),rgba(42,171,184,0.5)); }
  .goa-h2h-bar-stat { font-family:'Cinzel',serif; font-size:0.56rem; color:var(--muted); width:32px; text-align:right; flex-shrink:0; }


  /* ── Avatar upload ── */
  .goa-avatar-wrap {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 0.65rem;
    cursor: pointer;
  }
  .goa-avatar-wrap:hover .goa-avatar-overlay { opacity: 1; }
  .goa-avatar-overlay {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(0,0,0,0.55);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    gap: 0.1rem;
  }
  .goa-avatar-overlay-icon { font-size: 1.1rem; }
  .goa-avatar-overlay-text {
    font-family: 'Cinzel', serif;
    font-size: 0.45rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #F0C96A;
  }
  .goa-avatar-uploading {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .goa-footer { text-align:center; padding:0.5rem 1rem 2rem; font-family:'Cinzel',serif; font-size:0.52rem; letter-spacing:0.2em; text-transform:uppercase; color:rgba(160,144,112,0.32); }
  .goa-loading { display:flex; align-items:center; justify-content:center; min-height:100vh; flex-direction:column; gap:0.5rem; }
  .goa-loading p { font-family:'Cinzel',serif; font-size:0.72rem; letter-spacing:0.2em; color:var(--muted); text-transform:uppercase; }
`;

// ─── MMR Chart ────────────────────────────────────────────────────────────────

function MmrChart({ points }: { points: { mmr: number; won: boolean; date: string }[] }) {
  if (points.length < 2) return <p className="goa-chart-empty">Not enough battles to chart a trend</p>;
  const W = 320, H = 100, PAD = { t: 12, r: 8, b: 28, l: 36 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const mmrs = points.map((p) => p.mmr);
  const minM = Math.min(...mmrs) - 20, maxM = Math.max(...mmrs) + 20;
  const xOf = (i: number) => PAD.l + (i / (points.length - 1)) * iW;
  const yOf = (m: number) => PAD.t + iH - ((m - minM) / (maxM - minM)) * iH;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.mmr).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xOf(points.length-1).toFixed(1)},${(PAD.t+iH).toFixed(1)} L${PAD.l},${(PAD.t+iH).toFixed(1)} Z`;
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
          <line x1={PAD.l} y1={yOf(t)} x2={W-PAD.r} y2={yOf(t)} className="goa-chart-axis" />
          <text x={PAD.l-4} y={yOf(t)+3} textAnchor="end" className="goa-chart-label">{t}</text>
        </g>
      ))}
      <line x1={PAD.l} y1={PAD.t+iH} x2={W-PAD.r} y2={PAD.t+iH} className="goa-chart-axis" />
      <path d={areaPath} className="goa-chart-area" />
      <path d={linePath} className="goa-chart-line" />
      {points.map((p, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(p.mmr)} r={3} className={`goa-chart-dot ${p.won ? "win" : "loss"}`} />
      ))}
      {[0, points.length-1].map((i) => (
        <text key={i} x={xOf(i)} y={H-6} textAnchor={i === 0 ? "start" : "end"} className="goa-chart-label">
          {fmt(points[i].date)}
        </text>
      ))}
    </svg>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = "matches" | "heroes" | "h2h";

export default function PlayerProfilePage() {
  const params  = useParams();
  const router  = useRouter();
  const playerId = params?.id as string;

  const [player,  setPlayer]  = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;
    // Resize + convert to base64 via canvas
    setAvatarUploading(true);
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const SIZE = 200;
            const canvas = document.createElement("canvas");
            canvas.width = SIZE; canvas.height = SIZE;
            const ctx = canvas.getContext("2d")!;
            // Crop to square from centre
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
      await supabaseClient.from("players").update({ avatar_url: url }).eq("id", player.id);
      setPlayer((p) => p ? { ...p, avatar_url: url } : p);
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
        supabaseClient.from("players").select("id, name, mmr, avatar_url").eq("id", playerId).single(),
        supabaseClient
          .from("matches")
          .select(`
            id, winner, played_at, atlantis_avg_mmr, titans_avg_mmr,
            match_players (
              player_id, team, mmr_before, mmr_after, hero_id,
              players ( id, name, mmr, avatar_url )
            )
          `)
          .order("played_at", { ascending: false }),
      ]);

      setPlayer(pData ?? null);

      const normalized: Match[] = (mData ?? [])
        .filter((m: any) => m.match_players.some((mp: any) => mp.player_id === playerId))
        .map((m: any) => ({
          ...m,
          match_players: m.match_players
            .map((mp: any) => {
              const p = Array.isArray(mp.players) ? mp.players[0] : mp.players;
              if (!p) return null;
              return { ...mp, players: p };
            })
            .filter(Boolean),
        }));

      setMatches(normalized);
      setLoading(false);
    };
    load();
  }, [playerId]);

  // ── Core stats ───────────────────────────────────────────────────────────────

  const myMatches = useMemo(
    () => matches.filter((m) => m.match_players.some((mp) => mp.player_id === playerId)),
    [matches, playerId]
  );

  const { wins, losses, totalMatches, winRate, mmrTrend, streak } = useMemo(() => {
    let w = 0, l = 0;
    const trend: { mmr: number; won: boolean; date: string }[] = [];
    [...myMatches].reverse().forEach((m) => {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me) return;
      const won = me.team === m.winner;
      if (won) w++; else l++;
      trend.push({ mmr: me.mmr_after, won, date: m.played_at });
    });
    let streak = 0;
    for (const m of myMatches) {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me) break;
      const won = me.team === m.winner;
      if (streak === 0) streak = won ? 1 : -1;
      else if (streak > 0 && won) streak++;
      else if (streak < 0 && !won) streak--;
      else break;
    }
    const total = w + l;
    return { wins: w, losses: l, totalMatches: total, winRate: total === 0 ? 0 : Math.round((w / total) * 100), mmrTrend: trend, streak };
  }, [myMatches, playerId]);

  // ── Hero stats ───────────────────────────────────────────────────────────────

  const heroStats: HeroStat[] = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number }>();
    myMatches.forEach((m) => {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me || !me.hero_id) return;
      const won = me.team === m.winner;
      const cur = map.get(me.hero_id) ?? { wins: 0, losses: 0 };
      map.set(me.hero_id, { wins: cur.wins + (won ? 1 : 0), losses: cur.losses + (won ? 0 : 1) });
    });
    return Array.from(map.entries())
      .map(([heroId, { wins, losses }]) => {
        const hero = heroById(heroId);
        if (!hero) return null;
        const played = wins + losses;
        return { hero, played, wins, losses, winRate: played === 0 ? 0 : Math.round((wins / played) * 100) };
      })
      .filter(Boolean)
      .sort((a, b) => b!.played - a!.played) as HeroStat[];
  }, [myMatches, playerId]);

  // ── H2H stats ────────────────────────────────────────────────────────────────

  const h2hStats: H2HEntry[] = useMemo(() => {
    const map = new Map<string, H2HEntry>();
    myMatches.forEach((m) => {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me) return;
      const won = me.team === m.winner;
      m.match_players.forEach((mp) => {
        if (mp.player_id === playerId) return;
        if (!map.has(mp.player_id)) {
          map.set(mp.player_id, { opponent: mp.players, withWins:0, withLosses:0, withMatches:0, againstWins:0, againstLosses:0, againstMatches:0 });
        }
        const e = map.get(mp.player_id)!;
        if (mp.team === me.team) { e.withMatches++; if (won) e.withWins++; else e.withLosses++; }
        else { e.againstMatches++; if (won) e.againstWins++; else e.againstLosses++; }
      });
    });
    return Array.from(map.values())
      .filter((e) => e.withMatches + e.againstMatches > 0)
      .sort((a, b) => (b.withMatches + b.againstMatches) - (a.withMatches + a.againstMatches));
  }, [myMatches, playerId]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading || !player) {
    return (
      <div className="goa-root">
        <style>{styles}</style>
        <div className="goa-loading"><div style={{fontSize:"2rem"}}>⚔️</div><p>Consulting the archives…</p></div>
      </div>
    );
  }

  const streakLabel = streak > 0 ? `${streak}W streak` : streak < 0 ? `${Math.abs(streak)}L streak` : "—";
  const streakColor = streak > 0 ? "var(--gain)" : streak < 0 ? "var(--loss)" : "var(--muted)";

  const TABS: { key: Tab; label: string }[] = [
    { key: "matches", label: "⚔ History" },
    { key: "heroes",  label: "🦸 Heroes"  },
    { key: "h2h",     label: "🛡 H2H"     },
  ];

  return (
    <main className="goa-root">
      <style>{styles}</style>

      <button className="goa-back" onClick={() => router.back()}>‹ Hall of Honour</button>

      {/* Hero banner */}
      <div className="goa-hero-banner">
        <div className="goa-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
          <PlayerAvatar avatarUrl={player.avatar_url} name={player.name} size={80} borderColor="var(--gold)" />
          <div className="goa-avatar-overlay">
            {avatarUploading
              ? <div className="goa-avatar-uploading">⟳</div>
              : <>
                  <span className="goa-avatar-overlay-icon">📷</span>
                  <span className="goa-avatar-overlay-text">Change</span>
                </>
            }
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
        <h1 className="goa-player-name">{player.name}</h1>
        <p className="goa-mmr-display"><b>{player.mmr}</b> MMR</p>
      </div>

      {/* Stat tiles */}
      <div className="goa-stat-grid">
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Win Rate</div>
          <div className="goa-stat-val">{winRate}%</div>
          <div className="goa-win-bar-wrap"><div className="goa-win-bar" style={{width:`${winRate}%`}} /></div>
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
            <span style={{color:"var(--muted)",fontSize:"0.7rem"}}>/</span>
            <span className="goa-losses">{losses}L</span>
          </div>
          <div className="goa-stat-sub">victories / defeats</div>
        </div>
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Streak</div>
          <div className="goa-stat-val" style={{color:streakColor,fontSize:"1rem"}}>{streakLabel}</div>
          <div className="goa-stat-sub">current run</div>
        </div>
      </div>

      {/* MMR Trend */}
      <div className="goa-section">
        <div className="goa-sec-head"><span>📈</span> MMR Trend</div>
        <div className="goa-chart-wrap">
          <MmrChart points={mmrTrend} />
          {mmrTrend.length >= 2 && (
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.5rem"}}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.58rem",color:"var(--muted)",letterSpacing:"0.06em"}}>
                ● <span style={{color:"var(--gain)"}}>Win</span> &nbsp; ● <span style={{color:"var(--loss)"}}>Loss</span>
              </span>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.58rem",color:"var(--muted)",letterSpacing:"0.06em"}}>
                {totalMatches} battles charted
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="goa-tabs">
        {TABS.map(({ key, label }) => (
          <button key={key} className={`goa-tab ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Match History ── */}
      {activeTab === "matches" && (
        <div className="goa-section">
          <div className="goa-sec-head"><span>📜</span> Recent Battles</div>
          {myMatches.length === 0 && <p className="goa-no-data">No battles on record</p>}
          {myMatches.map((m) => {
            const me = m.match_players.find((mp) => mp.player_id === playerId);
            if (!me) return null;
            const won   = me.team === m.winner;
            const delta = me.mmr_after - me.mmr_before;
            const hero  = heroById(me.hero_id);
            const teammates = m.match_players
              .filter((mp) => mp.team === me.team && mp.player_id !== playerId)
              .map((mp) => mp.players.name);

            return (
              <div key={m.id} className="goa-match-row">
                <div className="goa-match-top">
                  <div className={`goa-match-badge ${won ? "win" : "loss"}`}>{won ? "Victory" : "Defeat"}</div>
                  <div>
                    <div className="goa-match-date">{fmt(m.played_at)}</div>
                    <div className="goa-match-meta">
                      <span className={me.team === "atlantis" ? "goa-atl" : "goa-tit"}>
                        {me.team === "atlantis" ? "🔴" : "🔵"}
                      </span>
                      <span style={{fontSize:"0.75rem",color:"var(--muted)"}}>
                        {teammates.length > 0 ? `w/ ${teammates.join(", ")}` : "Solo"}
                      </span>
                    </div>
                  </div>
                  <div className={`goa-match-delta ${delta >= 0 ? "pos" : "neg"}`}>
                    {delta >= 0 ? "▲" : "▼"}{Math.abs(delta)}
                  </div>
                </div>

                {/* Hero pill */}
                {hero && (
                  <div style={{marginTop:"0.25rem"}}>
                    <span className="goa-match-hero-pill">
                      <span
                        className="goa-match-hero-dot"
                        style={{background: ROLE_COLORS[hero.role]}}
                      />
                      {ROLE_ICON[hero.role]} {hero.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Hero Stats ── */}
      {activeTab === "heroes" && (
        <div className="goa-section">
          <div className="goa-sec-head"><span>🦸</span> Hero Performance</div>

          {heroStats.length === 0 && (
            <p className="goa-no-data">No hero data recorded yet</p>
          )}

          {heroStats.map((hs) => {
            const roleColor = ROLE_COLORS[hs.hero.role];
            const wrClass   = hs.winRate >= 60 ? "good" : hs.winRate >= 45 ? "avg" : "bad";
            return (
              <div key={hs.hero.id} className="goa-hero-row">
                {/* Icon */}
                <div className="goa-hero-icon-wrap" style={{borderColor:`${roleColor}33`, background:`${roleColor}11`}}>
                  {ROLE_ICON[hs.hero.role]}
                </div>

                {/* Name + bar */}
                <div className="goa-hero-info">
                  <div className="goa-hero-name-row">
                    <span className="goa-hero-name-text">{hs.hero.name}</span>
                    <span
                      className="goa-hero-role-badge"
                      style={{background:`${roleColor}22`, color:roleColor, border:`1px solid ${roleColor}44`}}
                    >
                      {hs.hero.role[0]}
                    </span>
                  </div>
                  <div className="goa-hero-bar-wrap">
                    <div
                      className="goa-hero-bar-fill"
                      style={{
                        width:`${hs.winRate}%`,
                        background: hs.winRate >= 60
                          ? `linear-gradient(90deg, var(--gain), rgba(93,187,138,0.6))`
                          : hs.winRate >= 45
                            ? `linear-gradient(90deg, var(--gold), rgba(201,151,58,0.6))`
                            : `linear-gradient(90deg, var(--loss), rgba(196,74,74,0.6))`,
                      }}
                    />
                  </div>
                  <div className="goa-hero-played" style={{marginTop:"0.18rem"}}>{hs.played} game{hs.played !== 1 ? "s" : ""}</div>
                </div>

                {/* Win rate + W/L */}
                <div className="goa-hero-stats-right">
                  <div className={`goa-hero-wr ${wrClass}`}>{hs.winRate}%</div>
                  <div className="goa-hero-wl">
                    <span style={{color:"var(--gain)"}}>{hs.wins}W</span>
                    <span style={{color:"var(--muted)"}}>/</span>
                    <span style={{color:"var(--loss)"}}>{hs.losses}L</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── H2H ── */}
      {activeTab === "h2h" && (
        <div className="goa-section">
          <div className="goa-sec-head"><span>🛡</span> Head to Head</div>
          {h2hStats.length === 0 && <p className="goa-no-data">No head-to-head data yet</p>}
          {h2hStats.map((entry) => {
            const withRate    = entry.withMatches    === 0 ? 0 : Math.round((entry.withWins    / entry.withMatches)    * 100);
            const againstRate = entry.againstMatches === 0 ? 0 : Math.round((entry.againstWins / entry.againstMatches) * 100);
            return (
              <div key={entry.opponent.id} className="goa-h2h-row">
                <div className="goa-h2h-name">
                  <span style={{display:"flex",alignItems:"center",gap:"0.35rem"}}>
                    <PlayerAvatar avatarUrl={entry.opponent.avatar_url} name={entry.opponent.name} size={22} />
                    {entry.opponent.name}
                  </span>
                  <span className="goa-h2h-mmr">{entry.opponent.mmr} MMR</span>
                </div>
                <div className="goa-h2h-bars">
                  {entry.withMatches > 0 && (
                    <div className="goa-h2h-bar-row">
                      <span className="goa-h2h-bar-lbl" style={{color:"var(--atl)"}}>With</span>
                      <div className="goa-h2h-bar-track"><div className="goa-h2h-bar-fill with" style={{width:`${withRate}%`}} /></div>
                      <span className="goa-h2h-bar-stat">{entry.withWins}W/{entry.withLosses}L</span>
                    </div>
                  )}
                  {entry.againstMatches > 0 && (
                    <div className="goa-h2h-bar-row">
                      <span className="goa-h2h-bar-lbl" style={{color:"var(--tit)"}}>Vs</span>
                      <div className="goa-h2h-bar-track"><div className="goa-h2h-bar-fill against" style={{width:`${againstRate}%`}} /></div>
                      <span className="goa-h2h-bar-stat">{entry.againstWins}W/{entry.againstLosses}L</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{height:"1px",background:"linear-gradient(90deg,transparent,var(--border),transparent)",margin:"0.25rem 0.75rem"}} />
      <div className="goa-footer">✦ &nbsp; Your legend is still being written &nbsp; ✦</div>
    </main>
  );
}
