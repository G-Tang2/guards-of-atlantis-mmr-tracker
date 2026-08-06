"use client";

import {
  ChangeEvent,
  CSSProperties,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase/client";
import { Hero } from "@/lib/heroes";
import { BADGES } from "@/lib/badges";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { didWin, formatDate, getHero, renderStars } from "@/lib/match";
import { Swords, Loader2, X, Camera, Coins, ChevronDown } from "lucide-react";

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
  is_bounty?: boolean;
  players: Player;
};

type Match = {
  id: string;
  match_number: number;
  winner: "atlantis" | "titans" | "none";
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  match_players: MatchPlayer[];
};

// Supabase returns the embedded `players` relation as an array when it
// can't infer a one-to-one cardinality from the foreign key, and as a
// single object when it can — normalize both shapes when loading.
type RawMatchPlayer = {
  player_id: string;
  team: "atlantis" | "titans";
  mmr_before: number;
  mmr_after: number;
  hero_id?: string | null;
  is_bounty?: boolean;
  players: Player | Player[] | null;
};

type RawMatch = {
  id: string;
  match_number: number;
  winner: "atlantis" | "titans" | "none";
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  match_players: RawMatchPlayer[];
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

type TrendPoint = {
  mmr: number;
  result: "win" | "loss" | "draw";
  date: string;
};

// ─── MMR Sparkline chart ───────────────────────────────────────────────────────

function MmrChart({ points }: { points: TrendPoint[] }) {
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
          className={`goa-chart-dot ${p.result}`}
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

// ─── Tag-style player filter (type to search, click to add a badge) ──────────

function PlayerTagFilter({
  placeholder,
  options,
  selected,
  onToggle,
  emptyMessage,
}: {
  placeholder: string;
  options: Player[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyMessage: string;
}) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const selectedPlayers = selected
    .map((id) => options.find((p) => p.id === id))
    .filter((p): p is Player => !!p);

  const suggestions = options.filter(
    (p) =>
      !selected.includes(p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="goa-multiselect">
      <div className="goa-filter-input-row">
        {selectedPlayers.map((p) => (
          <span key={p.id} className="goa-filter-badge">
            {p.name}
            <button
              type="button"
              className="goa-filter-badge-remove"
              onClick={() => onToggle(p.id)}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="goa-filter-input"
          placeholder={selectedPlayers.length === 0 ? placeholder : "Add another…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onClick={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      {focused && options.length > 0 && (
        <div className="goa-multiselect-panel">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              className="goa-multiselect-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onToggle(p.id);
                setSearch("");
                setFocused(false);
              }}
            >
              {p.name}
            </button>
          ))}
          {suggestions.length === 0 && (
            <p className="goa-pool-empty">No matches</p>
          )}
        </div>
      )}
      {options.length === 0 && (
        <p className="goa-pool-empty">{emptyMessage}</p>
      )}
    </div>
  );
}

// ─── Tag-style hero filter (type to search, click to select a single hero) ───

function HeroTagFilter({
  placeholder,
  options,
  selectedId,
  onSelect,
  onClear,
  emptyMessage,
}: {
  placeholder: string;
  options: Hero[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClear: () => void;
  emptyMessage: string;
}) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const selectedHero = options.find((h) => h.id === selectedId) ?? null;

  const suggestions = options.filter(
    (h) =>
      h.id !== selectedId && h.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="goa-multiselect">
      <div className="goa-filter-input-row">
        {selectedHero && (
          <span className="goa-filter-badge">
            {selectedHero.name}
            <button
              type="button"
              className="goa-filter-badge-remove"
              onClick={onClear}
            >
              <X size={10} />
            </button>
          </span>
        )}
        {!selectedHero && (
          <input
            className="goa-filter-input"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </div>
      {focused && !selectedHero && options.length > 0 && (
        <div className="goa-multiselect-panel">
          {suggestions.map((h) => (
            <button
              key={h.id}
              type="button"
              className="goa-multiselect-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(h.id);
                setSearch("");
                setFocused(false);
              }}
            >
              {h.name}
            </button>
          ))}
          {suggestions.length === 0 && (
            <p className="goa-pool-empty">No matches</p>
          )}
        </div>
      )}
      {options.length === 0 && (
        <p className="goa-pool-empty">{emptyMessage}</p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "heroes" | "h2h">(
    "matches",
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History tab: pagination + filters
  const HISTORY_PAGE_SIZE = 10;
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [heroFilter, setHeroFilter] = useState("");
  const [withFilter, setWithFilter] = useState<string[]>([]);
  const [againstFilter, setAgainstFilter] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateHeroFilter = (v: string) => {
    setHeroFilter(v);
    setHistoryLimit(HISTORY_PAGE_SIZE);
  };
  const toggleWithFilter = (id: string) => {
    setWithFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setHistoryLimit(HISTORY_PAGE_SIZE);
  };
  const toggleAgainstFilter = (id: string) => {
    setAgainstFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setHistoryLimit(HISTORY_PAGE_SIZE);
  };

  // Heroes tab: sort control
  type HeroSortKey =
    | "name"
    | "played"
    | "winRate"
    | "wins"
    | "losses"
    | "complexity";
  const [heroSortKey, setHeroSortKey] = useState<HeroSortKey>("played");
  const [heroSortAsc, setHeroSortAsc] = useState(false);
  const [expandedHeroId, setExpandedHeroId] = useState<string | null>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);

  const handleHeroSort = (key: HeroSortKey) => {
    if (heroSortKey === key) setHeroSortAsc((v) => !v);
    else {
      setHeroSortKey(key);
      setHeroSortAsc(key === "name");
    }
  };

  // H2H tab: sort control
  type H2HSortKey = "name" | "total" | "with_wins" | "with_losses" | "against_wins" | "against_losses" | "mmr";
  const [h2hSortKey, setH2hSortKey] = useState<H2HSortKey>("total");
  const [h2hSortAsc, setH2hSortAsc] = useState(false);

  const handleH2HSort = (key: H2HSortKey) => {
    if (h2hSortKey === key) setH2hSortAsc((v) => !v);
    else {
      setH2hSortKey(key);
      setH2hSortAsc(key === "name");
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;
    setAvatarUploading(true);
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new window.Image();
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
            id, match_number, winner, created_at, atlantis_avg_mmr, titans_avg_mmr,
            match_players (
              player_id, team, mmr_before, mmr_after, hero_id, is_bounty,
              players ( id, name, mmr, avatar_url )
            )
          `,
          )
          .order("created_at", { ascending: false }),
      ]);

      setPlayer(pData ?? null);

      const rawMatches = (mData ?? []) as RawMatch[];
      const normalized: Match[] = rawMatches
        .filter((m) => m.match_players.some((mp) => mp.player_id === playerId))
        .map((m) => ({
          ...m,
          match_players: m.match_players
            .map((mp): MatchPlayer | null => {
              const p = Array.isArray(mp.players) ? mp.players[0] : mp.players;
              if (!p) return null;
              return { ...mp, hero_id: mp.hero_id ?? null, players: { ...p } };
            })
            .filter((mp): mp is MatchPlayer => mp !== null),
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
      const trend: TrendPoint[] = [];

      const chronological = [...myMatches].reverse();
      chronological.forEach((m) => {
        const me = m.match_players.find((mp) => mp.player_id === playerId);
        if (!me) return;
        const won = didWin(me.team, m.winner);
        if (won) w++;
        else l++;

        const result: "win" | "loss" | "draw" =
          m.winner === "none"
            ? "draw"
            : me.team === m.winner
              ? "win"
              : "loss";

        trend.push({ mmr: me.mmr_after, result, date: m.created_at });
      });

      let streak = 0;
      for (const m of myMatches) {
        const me = m.match_players.find((mp) => mp.player_id === playerId);
        if (!me) break;
        const won = didWin(me.team, m.winner);
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
      const won = didWin(myTeam, m.winner);

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

  const sortedH2HStats = useMemo(() => {
    const list = [...h2hStats];
    list.sort((a, b) => {
      let diff = 0;
      if (h2hSortKey === "name")
        diff = a.opponent.name.localeCompare(b.opponent.name);
      else if (h2hSortKey === "total")
        diff =
          a.withMatches + a.againstMatches - (b.withMatches + b.againstMatches);
      else if (h2hSortKey === "with_wins") {
        const ar = a.withMatches === 0 ? -1 : a.withWins;
        const br = b.withMatches === 0 ? -1 : b.withWins;
        diff = ar - br;
      } else if (h2hSortKey === "with_losses") {
        const ar = a.withMatches === 0 ? -1 : a.withLosses;
        const br = b.withMatches === 0 ? -1 : b.withLosses;
        diff = ar - br;
      }else if (h2hSortKey === "against_wins") {
        const ar =
          a.againstMatches === 0 ? -1 : a.againstWins;
        const br =
          b.againstMatches === 0 ? -1 : b.againstWins;
        diff = ar - br;
      }else if (h2hSortKey === "against_losses") {
        const ar =
          a.againstMatches === 0 ? -1 : a.againstLosses;
        const br =
          b.againstMatches === 0 ? -1 : b.againstLosses;
        diff = ar - br;
      } else diff = a.opponent.mmr - b.opponent.mmr;
      return h2hSortAsc ? diff : -diff;
    });
    return list;
  }, [h2hStats, h2hSortKey, h2hSortAsc]);

  // ── Hero stats ──────────────────────────────────────────────────────────────
  const heroStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number }>();
    myMatches.forEach((m) => {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me || !me.hero_id) return;
      const won = didWin(me.team, m.winner);
      const cur = map.get(me.hero_id) ?? { wins: 0, losses: 0 };
      map.set(me.hero_id, {
        wins: cur.wins + (won ? 1 : 0),
        losses: cur.losses + (won ? 0 : 1),
      });
    });
    return Array.from(map.entries())
      .map(([heroId, { wins, losses }]) => {
        const hero = getHero(heroId);
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

  const wonHeroIds = useMemo(
    () => new Set(heroStats.filter((hs) => hs.wins > 0).map((hs) => hs.hero.id)),
    [heroStats],
  );

  const sortedHeroStats = useMemo(() => {
    const list = [...heroStats];
    list.sort((a, b) => {
      let diff = 0;
      if (heroSortKey === "played") diff = a.played - b.played;
      else if (heroSortKey === "winRate") diff = a.winRate - b.winRate;
      else if (heroSortKey === "wins") diff = a.wins - b.wins;
      else if (heroSortKey === "losses") diff = a.losses - b.losses;
      else if (heroSortKey === "name")
        diff = a.hero.name.localeCompare(b.hero.name);
      else diff = Number(a.hero.complexity) - Number(b.hero.complexity);
      return heroSortAsc ? diff : -diff;
    });
    return list;
  }, [heroStats, heroSortKey, heroSortAsc]);

  // ── History filters ──────────────────────────────────────────────────────────

  const playedWithOptions = useMemo(
    () =>
      h2hStats
        .filter((e) => e.withMatches > 0)
        .map((e) => e.opponent)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [h2hStats],
  );

  const playedAgainstOptions = useMemo(
    () =>
      h2hStats
        .filter((e) => e.againstMatches > 0)
        .map((e) => e.opponent)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [h2hStats],
  );

  const filteredMatches = useMemo(() => {
    if (!heroFilter && withFilter.length === 0 && againstFilter.length === 0)
      return myMatches;
    return myMatches.filter((m) => {
      const me = m.match_players.find((mp) => mp.player_id === playerId);
      if (!me) return false;
      if (heroFilter && me.hero_id !== heroFilter) return false;
      if (
        withFilter.length > 0 &&
        !withFilter.every((id) =>
          m.match_players.some(
            (mp) => mp.player_id === id && mp.team === me.team,
          ),
        )
      )
        return false;
      if (
        againstFilter.length > 0 &&
        !againstFilter.every((id) =>
          m.match_players.some(
            (mp) => mp.player_id === id && mp.team !== me.team,
          ),
        )
      )
        return false;
      return true;
    });
  }, [myMatches, playerId, heroFilter, withFilter, againstFilter]);

  const visibleMatches = filteredMatches.slice(0, historyLimit);
  const activeFilterCount =
    (heroFilter ? 1 : 0) + withFilter.length + againstFilter.length;

  if (loading || !player) {
    return (
      <div className="goa-root">
        <div className="goa-loading">
          <div className="goa-loading-emoji">
            <Swords size={28} />
          </div>
          <p>Consulting the archives…</p>
        </div>
      </div>
    );
  }

  const streakLabel =
    streak > 0
      ? `${streak}W streak`
      : streak < 0
        ? `${Math.abs(streak)}L streak`
        : "—";
  const streakClass = streak > 0 ? "gain" : streak < 0 ? "loss" : "muted";

  return (
    <main className="goa-root">
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
          {avatarUploading && (
            <div className="goa-avatar-uploading">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {/* Always visible semi-opaque helper badge */}
          <div className="goa-avatar-edit-btn">
            <Camera size={10} className="goa-avatar-edit-icon" />
            <span className="goa-avatar-edit-text">Edit</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <h1 className="goa-profile-player-name">{player.name}</h1>
        <p className="goa-mmr-display">
          <b>{player.mmr}</b> MMR
        </p>
      </div>

      {/* Badges
      <div className="goa-section">
        <div
          className="goa-sec-head clickable"
          onClick={() => setBadgesOpen((v) => !v)}
        >
          <span>Badges</span>
          <ChevronDown
            size={14}
            className={`goa-badges-chevron${badgesOpen ? " open" : ""}`}
          />
        </div>

        {!badgesOpen && (
          <div className="goa-badges-summary">
            {BADGES.map((badge) => {
              const earnedCount = badge.heroIds.filter((id) =>
                wonHeroIds.has(id),
              ).length;
              const complete = earnedCount === badge.heroIds.length;
              return (
                <span
                  key={badge.id}
                  className={`goa-badge-pill${complete ? " complete" : ""}`}
                  title={badge.name}
                >
                  <Image
                    src={badge.icon}
                    alt={badge.name}
                    width={28}
                    height={28}
                  />
                </span>
              );
            })}
          </div>
        )}

        {badgesOpen && (
          <div className="goa-badges-wrap">
            {BADGES.map((badge) => {
              const earnedCount = badge.heroIds.filter((id) =>
                wonHeroIds.has(id),
              ).length;
              const complete = earnedCount === badge.heroIds.length;
              return (
                <div
                  key={badge.id}
                  className={`goa-badge-row${complete ? " complete" : ""}`}
                >
                  <div className="goa-badge-row-head">
                    <span className="goa-badge-name">
                      <Image
                        src={badge.icon}
                        alt={badge.name}
                        width={24}
                        height={24}
                        className="goa-badge-name-icon"
                      />
                      {badge.name}
                    </span>
                    <span className="goa-badge-progress">
                      {earnedCount}/{badge.heroIds.length}
                    </span>
                  </div>
                  <div className="goa-badge-icons">
                    {badge.heroIds.map((heroId) => {
                      const hero = getHero(heroId);
                      if (!hero) return null;
                      const earned = wonHeroIds.has(heroId);
                      return (
                        <div
                          key={heroId}
                          className={`goa-badge-icon-wrap${earned ? " earned" : ""}`}
                          title={hero.name}
                        >
                          <Image
                            src={hero.icon}
                            alt={hero.name}
                            width={32}
                            height={32}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div> */}

      {/* Stat tiles */}
      <div className="goa-stats-grid">
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Win Rate</div>
          <div className="goa-stat-val">{winRate}%</div>
          <div className="goa-win-bar-wrap">
            <div
              className="goa-win-bar"
              style={{ "--bar-width": `${winRate}%` } as CSSProperties}
            />
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
          <div className={`goa-stat-val sm ${streakClass}`}>
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
            <div className="goa-chart-footer">
              <span className="goa-chart-footer-text">
                ● <span className="goa-text-gain">Win</span> &nbsp; ●{" "}
                <span className="goa-text-loss">Loss</span> &nbsp; ●{" "}
                <span>Draw</span>
              </span>
              <span className="goa-chart-footer-text">
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

          {myMatches.length > 0 && (
            <button
              type="button"
              className="goa-history-filters-toggle"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <span>
                Filters
                {activeFilterCount > 0 && (
                  <span className="goa-history-filters-badge">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <ChevronDown
                size={14}
                className={`goa-history-filters-chevron${filtersOpen ? " open" : ""}`}
              />
            </button>
          )}

          {myMatches.length > 0 && filtersOpen && (
            <div className="goa-history-filters">
              <HeroTagFilter
                placeholder="Hero played…"
                options={[...heroStats]
                  .map((hs) => hs.hero)
                  .sort((a, b) => a.name.localeCompare(b.name))}
                selectedId={heroFilter}
                onSelect={updateHeroFilter}
                onClear={() => updateHeroFilter("")}
                emptyMessage="No heroes played yet"
              />
              <PlayerTagFilter
                placeholder="Played with…"
                options={playedWithOptions}
                selected={withFilter}
                onToggle={toggleWithFilter}
                emptyMessage="No teammates yet"
              />
              <PlayerTagFilter
                placeholder="Played against…"
                options={playedAgainstOptions}
                selected={againstFilter}
                onToggle={toggleAgainstFilter}
                emptyMessage="No opponents yet"
              />
            </div>
          )}

          {myMatches.length === 0 && (
            <p className="goa-empty-note">No battles on record</p>
          )}
          {myMatches.length > 0 && filteredMatches.length === 0 && (
            <p className="goa-empty-note">No battles match these filters</p>
          )}

          {visibleMatches.map((m) => {
            const me = m.match_players.find((mp) => mp.player_id === playerId);
            if (!me) return null;
            const won = didWin(me.team, m.winner);
            const delta = me.mmr_after - me.mmr_before;
            const hero = me.hero_id ? getHero(me.hero_id) : null;

            const myTeammates = m.match_players
              .filter((mp) => mp.team === me.team && mp.player_id !== playerId)
              .map((mp) => mp.players);

            const enemies = m.match_players
              .filter((mp) => mp.team !== me.team)
              .map((mp) => mp.players);

            return (
              <div
                key={m.id}
                className="goa-profile-match-row clickable"
                onClick={() => router.push(`/matches/${m.id}`)}
              >
                <div className={`goa-match-badge ${m.winner==="none" ? "draw" : won ? "win" : "loss"}`}>
                  {m.winner==="none"? "Draw" : won ? "Victory" : "Defeat"}
                </div>

                <div className="goa-match-info">
                  <div className="goa-match-date">
                    <span className="goa-match-number">#{m.match_number}</span>
                    · {formatDate(m.created_at)}
                  </div>
                  {/* Hero played */}
                  {hero && (
                    <div className="goa-match-hero-row">
                      <span className="goa-match-hero-label">
                        {hero.name} {renderStars(Number(hero.complexity))}
                      </span>
                    </div>
                  )}
                  {/* My team */}
                  <div className="goa-match-teams">
                    {myTeammates.length > 0 && (
                      <span className="goa-match-teams-list">
                        {" "}
                        with{" "}
                        {myTeammates.map((p, i) => (
                          <Fragment key={p.id}>
                            {i > 0 && ", "}
                            <span className="goa-vs-player">{p.name}</span>
                          </Fragment>
                        ))}
                      </span>
                    )}
                  </div>
                  {/* Enemy team */}
                  <div className="goa-match-teams">
                    {enemies.length > 0 && (
                      <span className="goa-match-teams-list">
                        {" "}
                        vs{" "}
                        {enemies.map((p, i) => (
                          <Fragment key={p.id}>
                            {i > 0 && ", "}
                            <span className="goa-vs-player">{p.name}</span>
                          </Fragment>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="goa-match-delta-col">
                  <div
                    className={`goa-match-delta ${delta >= 0 ? "pos" : "neg"}`}
                  >
                    {delta >= 0 ? "▲" : "▼"}
                    {Math.abs(delta)}
                  </div>
                  {me.is_bounty && (
                    <span className="goa-bounty-badge">
                      <Coins size={10} />
                      +5
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredMatches.length > 0 && (
            <div className="goa-pagination">
              <p className="goa-pagination-count">
                Showing {visibleMatches.length} of {filteredMatches.length}{" "}
                battles
              </p>
              {historyLimit < filteredMatches.length && (
                <button
                  className="goa-load-more"
                  onClick={() =>
                    setHistoryLimit((n) => n + HISTORY_PAGE_SIZE)
                  }
                >
                  Load More
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Heroes */}
      {activeTab === "heroes" && (
        <div className="goa-profile-section">
          <div className="goa-profile-sec-head">Hero Performance</div>

          {heroStats.length === 0 && (
            <p className="goa-empty-note">No hero data recorded yet</p>
          )}

          {heroStats.length > 0 && (
            <div className="goa-sort-bar">
              {(
                [
                  ["name", "Hero"],
                  ["played", "GP"],
                  ["winRate", "Win %"],
                  ["wins", "Wins"],
                  ["losses", "Losses"],
                  ["complexity", "★"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`goa-sort-btn ${heroSortKey === key ? "active" : ""}`}
                  onClick={() => handleHeroSort(key)}
                >
                  {label}
                  {heroSortKey === key && (
                    <span className="goa-sort-arrow">
                      {heroSortAsc ? "▲" : "▼"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {sortedHeroStats.map((hs) => {
            const wrClass =
              hs.winRate >= 60 ? "good" : hs.winRate >= 45 ? "mid" : "bad";
            const isExpanded = expandedHeroId === hs.hero.id;
            const heroMatches = isExpanded
              ? myMatches.filter(
                  (m) =>
                    m.match_players.find((mp) => mp.player_id === playerId)
                      ?.hero_id === hs.hero.id,
                )
              : [];
            return (
              <div
                key={hs.hero.id}
                className="goa-hero-stat-row clickable"
                onClick={() =>
                  setExpandedHeroId((prev) =>
                    prev === hs.hero.id ? null : hs.hero.id,
                  )
                }
              >
                <div className="goa-hero-stat-icon">
                  <Image
                    src={hs.hero.icon}
                    alt={hs.hero.name}
                    width={36}
                    height={36}
                  />
                </div>
                <div className="goa-hero-stat-info">
                  <div className="goa-hero-stat-hero-info">
                    <div className="goa-hero-stat-name">{hs.hero.name}</div>
                    <div className="goa-hero-stat-complexity">
                      {renderStars(Number(hs.hero.complexity))}
                    </div>
                  </div>

                  <div className="goa-hero-stat-bar-wrap">
                    <div
                      className="goa-hero-stat-bar-seg win"
                      style={
                        { "--bar-width": `${hs.winRate}%` } as CSSProperties
                      }
                    />
                    <div
                      className="goa-hero-stat-bar-seg loss"
                      style={
                        {
                          "--bar-width": `${100 - hs.winRate}%`,
                        } as CSSProperties
                      }
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
                    <span className="goa-text-gain">{hs.wins}W</span>
                    <span>/</span>
                    <span className="goa-text-loss">{hs.losses}L</span>
                  </div>
                </div>

                <ChevronDown
                  size={13}
                  className={`goa-hero-stat-chevron${isExpanded ? " open" : ""}`}
                />

                {isExpanded && (
                  <div className="goa-hero-stat-expanded">
                    {heroMatches.map((m) => {
                      const me = m.match_players.find(
                        (mp) => mp.player_id === playerId,
                      );
                      if (!me) return null;
                      const won = didWin(me.team, m.winner);
                      const delta = me.mmr_after - me.mmr_before;
                      return (
                        <div
                          key={m.id}
                          className="goa-hero-expanded-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/matches/${m.id}`);
                          }}
                        >
                          <span
                            className={`goa-match-badge ${m.winner === "none" ? "draw" : won ? "win" : "loss"}`}
                          >
                            {m.winner === "none"
                              ? "Draw"
                              : won
                                ? "Victory"
                                : "Defeat"}
                          </span>
                          <span className="goa-hero-expanded-date">
                            #{m.match_number} · {formatDate(m.created_at)}
                          </span>
                          <span
                            className={`goa-hero-expanded-delta ${delta >= 0 ? "pos" : "neg"}`}
                          >
                            {delta >= 0 ? "▲" : "▼"}
                            {Math.abs(delta)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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

          {h2hStats.length > 0 && (
            <div className="goa-sort-bar">
              {(
                [
                  ["name", "Name"],
                  ["total", "GP"],
                  ["with_wins", "With Wins"],
                  ["with_losses", "With Losses"],
                  ["against_wins", "Against Wins"],
                  ["against_losses", "Against Losses"],
                  ["mmr", "MMR"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`goa-sort-btn ${h2hSortKey === key ? "active" : ""}`}
                  onClick={() => handleH2HSort(key)}
                >
                  {label}
                  {h2hSortKey === key && (
                    <span className="goa-sort-arrow">
                      {h2hSortAsc ? "▲" : "▼"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {sortedH2HStats.map((entry) => {
            const withRate =
              entry.withMatches === 0
                ? 0
                : Math.round((entry.withWins / entry.withMatches) * 100);
            const againstRate =
              entry.againstMatches === 0
                ? 0
                : Math.round((entry.againstWins / entry.againstMatches) * 100);

            return (
              <div
                key={entry.opponent.id}
                className="goa-h2h-row clickable"
                onClick={() => router.push(`/players/${entry.opponent.id}`)}
              >
                <div className="goa-h2h-name">
                  <span className="goa-h2h-name-row">
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
                      <span className="goa-h2h-bar-lbl">With</span>
                      <div className="goa-h2h-bar-track">
                        <div
                          className="goa-h2h-bar-seg win"
                          style={
                            { "--bar-width": `${withRate}%` } as CSSProperties
                          }
                        />
                        <div
                          className="goa-h2h-bar-seg loss"
                          style={
                            {
                              "--bar-width": `${100 - withRate}%`,
                            } as CSSProperties
                          }
                        />
                      </div>
                      <span className="goa-h2h-bar-stat">
                        {entry.withWins}W/{entry.withLosses}L · {withRate}%
                      </span>
                    </div>
                  )}

                  {entry.againstMatches > 0 && (
                    <div className="goa-h2h-bar-row">
                      <span className="goa-h2h-bar-lbl">Vs</span>
                      <div className="goa-h2h-bar-track">
                        <div
                          className="goa-h2h-bar-seg win"
                          style={
                            {
                              "--bar-width": `${againstRate}%`,
                            } as CSSProperties
                          }
                        />
                        <div
                          className="goa-h2h-bar-seg loss"
                          style={
                            {
                              "--bar-width": `${100 - againstRate}%`,
                            } as CSSProperties
                          }
                        />
                      </div>
                      <span className="goa-h2h-bar-stat">
                        {entry.againstWins}W/{entry.againstLosses}L ·{" "}
                        {againstRate}%
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
