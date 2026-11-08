"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ScrollText } from "lucide-react";
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
function formatSnapshotDate(dateString: string) {
  const [year, month] = dateString.split("-").map(Number);
  return `${MONTH_NAMES[(month ?? 1) - 1] ?? ""} ${year}`;
}

// The "Chronicles" tab on /leaderboard — a read-only history of the
// monthly leaderboard snapshots taken automatically by the Vercel Cron
// job (see app/api/cron/leaderboard-snapshot and vercel.json). Fetches its
// own data, independently of the Rankings/Legends tabs, since
// leaderboard_snapshots is an entirely separate table.
export function ChroniclesPanel() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);

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

  return (
    <>
      {snapshots.map((snapshot) => (
        <details key={snapshot.id} className="goa-section">
          <summary className="goa-sec-head clickable goa-ranked-result-summary">
            <span>{formatSnapshotDate(snapshot.snapshot_date)}</span>
            <ChevronDown size={16} className="goa-ranked-result-chevron" />
          </summary>
          <div>
            {[...snapshot.players]
              .sort((a, b) => a.rank - b.rank)
              .map((p) => (
                <div
                  key={p.player_id}
                  className="goa-funstat-row"
                  onClick={() => goToProfile(p.player_id)}
                >
                  <span className="goa-funstat-who">
                    <span className="goa-funstat-rank">#{p.rank}</span>
                    <PlayerAvatar avatarUrl={p.avatar_url} name={p.name} size={28} />
                    <span className="goa-funstat-name">{p.name}</span>
                  </span>
                  <span className="goa-funstat-value">{p.mmr} MMR</span>
                </div>
              ))}
          </div>
        </details>
      ))}
    </>
  );
}
