"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Medal, ScrollText } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type SnapshotPlayer = {
  player_id: string;
  name: string;
  mmr: number;
  rank: number;
  avatar_url?: string | null;
  matches_played?: number;
};

type Snapshot = {
  id: string;
  snapshot_date: string;
  players: SnapshotPlayer[];
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// snapshot_date is a plain "YYYY-MM-DD" date column — parsed by hand
// instead of `new Date(...)` so it can't shift a day off under a
// non-UTC local timezone.
function formatSnapshotMonth(dateString: string, short: boolean) {
  const [year, month] = dateString.split("-").map(Number);
  const name = MONTH_NAMES[(month ?? 1) - 1] ?? "";
  return `${short ? name.slice(0, 3) : name} ${year}`;
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
  const sortedPlayers = [...selected.players].sort((a, b) => a.rank - b.rank);

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

      {/* Same row/cell styling as the Rankings table (app/leaderboard/page.tsx)
          — just Rank/Name/MMR/Battles, since that's all a snapshot keeps. */}
      <div className="goa-table-wrap">
        <div className="goa-header-row compact">
          <span className="goa-col-head center">#</span>
          <span className="goa-col-head">Name</span>
          <span className="goa-col-head right">MMR</span>
          <span className="goa-col-head right">Bat.</span>
        </div>
        {sortedPlayers.map((p) => {
          const rankCls = p.rank === 1 ? "r1" : p.rank === 2 ? "r2" : p.rank === 3 ? "r3" : "";
          const rowCls = p.rank <= 3 ? `rank-${p.rank}` : "";
          return (
            <div
              key={p.player_id}
              className={`goa-row compact ${rowCls}`}
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
                </span>
              </span>
              <span className="goa-cell-mmr">{p.mmr}</span>
              <span className="goa-cell-m">{p.matches_played ?? "—"}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
