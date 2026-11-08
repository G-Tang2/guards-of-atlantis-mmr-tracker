"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Medal, ScrollText } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { BADGES } from "@/lib/badges";

type SnapshotPlayer = {
  player_id: string;
  name: string;
  mmr: number;
  rank: number;
  avatar_url?: string | null;
  matches_played?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  badge_ids?: string[];
};

type Snapshot = {
  id: string;
  snapshot_date: string;
  players: SnapshotPlayer[];
};

// Same threshold the Rankings tab hides low-activity players behind (see
// MINIMUM_MATCHES_FOR_DISPLAY in app/leaderboard/page.tsx) — kept in sync
// manually since each tab fetches/filters its own data independently.
const MINIMUM_MATCHES_FOR_DISPLAY = 5;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// snapshot_date is a plain "YYYY-MM-DD" date column (the 1st of the month
// the cron actually ran — see app/api/cron/leaderboard-snapshot), parsed
// by hand instead of `new Date(...)` so it can't shift a day off under a
// non-UTC local timezone. A snapshot taken at midnight on the 1st
// captures everything up to that instant, i.e. the *prior* month's final
// standings — so the label shown here is shifted back one month from the
// stored date (a Nov 1 snapshot reads "Oct 2026", not "Nov 2026").
function formatSnapshotMonth(dateString: string, short: boolean) {
  const [year, month] = dateString.split("-").map(Number);
  const zeroBasedMonth = (month ?? 1) - 1;
  const labelMonthIndex = (zeroBasedMonth - 1 + 12) % 12;
  const labelYear = zeroBasedMonth === 0 ? year - 1 : year;
  const name = MONTH_NAMES[labelMonthIndex] ?? "";
  return `${short ? name.slice(0, 3) : name} ${labelYear}`;
}

// The "Chronicles" tab on /leaderboard — a read-only history of the
// monthly leaderboard snapshots taken automatically by the Vercel Cron
// job (see app/api/cron/leaderboard-snapshot and vercel.json). Fetches its
// own data, independently of the Rankings/Legends tabs, since
// leaderboard_snapshots is an entirely separate table.
export function ChroniclesPanel() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseClient
        .from("leaderboard_snapshots")
        .select("id, snapshot_date, players")
        .order("snapshot_date", { ascending: false });
      setSnapshots((data as unknown as Snapshot[]) ?? []);
    };
    load();
  }, []);

  const goToProfile = (id: string) => router.push(`/players/${id}`);

  if (snapshots === null) {
    return (
      <div className="goa-loading">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <ScrollText size={32} />
          </div>
          <p className="goa-loading-text">Unrolling the chronicles…</p>
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <section className="goa-stats-card">
        <div className="goa-stats-head">
          <ScrollText size={16} />
          Chronicles
        </div>
        <div className="goa-funstat-empty">
          No snapshots recorded yet — the leaderboard is automatically archived every month,
          so the first entry will appear here after the next one runs.
        </div>
      </section>
    );
  }

  const selected = snapshots[selectedIndex] ?? snapshots[0];
  const visiblePlayers = selected.players.filter(
    (p) => showAllPlayers || (p.matches_played ?? 0) >= MINIMUM_MATCHES_FOR_DISPLAY,
  );
  const sortedPlayers = [...visiblePlayers].sort((a, b) => a.rank - b.rank);

  return (
    <>
      <div className="goa-sort-bar goa-chronicles-months">
        {snapshots.map((snapshot, i) => (
          <button
            key={snapshot.id}
            type="button"
            className={`goa-sort-btn ${i === selectedIndex ? "active" : ""}`}
            onClick={() => setSelectedIndex(i)}
          >
            {formatSnapshotMonth(snapshot.snapshot_date, true)}
          </button>
        ))}
      </div>

      <p className="goa-funstat-desc" style={{ margin: "0 0.75rem 0.5rem" }}>
        {formatSnapshotMonth(selected.snapshot_date, false)}
      </p>

      <div className="goa-checkbox-container">
        <Checkbox
          id="chronicles-show-all-players"
          checked={showAllPlayers}
          onCheckedChange={(checked) => setShowAllPlayers(checked === true)}
          className="border-[#ebc931ab] data-[state=checked]:border-[#ebc931ab] data-[state=checked]:bg-[#b7a14238] inline-block"
        />
        <label htmlFor="chronicles-show-all-players" className="goa-tap-hint">
          Show all players
        </label>
      </div>

      {/* Same row/cell styling as the Rankings table (app/leaderboard/page.tsx). */}
      <div className="goa-table-wrap">
        <div className="goa-header-row">
          <span className="goa-col-head center">#</span>
          <span className="goa-col-head">Name</span>
          <span className="goa-col-head right">MMR</span>
          <span className="goa-col-head right">Win%</span>
          <span className="goa-col-head right">W/L</span>
          <span className="goa-col-head right goa-col-head-battles">Bat.</span>
        </div>
        {sortedPlayers.map((p) => {
          const rankCls = p.rank === 1 ? "r1" : p.rank === 2 ? "r2" : p.rank === 3 ? "r3" : "";
          const rowCls = p.rank <= 3 ? `rank-${p.rank}` : "";
          const wins = p.wins ?? 0;
          const losses = p.losses ?? 0;
          const draws = p.draws ?? 0;
          const matches = p.matches_played ?? wins + losses + draws;
          const winRate = matches === 0 ? 0 : (wins / matches) * 100;
          const badges = BADGES.filter((b) => p.badge_ids?.includes(b.id));
          return (
            <div
              key={p.player_id}
              className={`goa-row ${rowCls}`}
              onClick={() => goToProfile(p.player_id)}
            >
              <span className={`goa-cell-rank ${rankCls}`}>
                {p.rank <= 3 ? (
                  <Medal size={14} className="inline-block align-middle" />
                ) : (
                  `#${p.rank}`
                )}
              </span>
              <span className="goa-cell-name">
                <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={26} />
                <span className="goa-cell-name-stack">
                  <span className="goa-cell-name-line">
                    {p.name}
                    <span className="goa-name-arrow">›</span>
                  </span>
                  {badges.length > 0 && (
                    <span className="goa-player-badges">
                      {badges.map((b) => (
                        <Image key={b.id} src={b.icon} alt={b.name} title={b.name} width={14} height={14} />
                      ))}
                    </span>
                  )}
                </span>
              </span>
              <span className="goa-cell-mmr">{p.mmr}</span>
              <span className={`goa-cell-wr ${winRate >= 50 ? "good" : "bad"}`}>{winRate.toFixed(1)}%</span>
              <span className="goa-cell-wl">
                <span className="goa-wins">{wins}</span>
                <span className="goa-wl-sep">/</span>
                <span className="goa-losses">{losses}</span>
                {draws > 0 && (
                  <>
                    <span className="goa-wl-sep">/</span>
                    <span className="goa-draws">{draws}</span>
                  </>
                )}
              </span>
              <span className="goa-cell-m">{matches}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
