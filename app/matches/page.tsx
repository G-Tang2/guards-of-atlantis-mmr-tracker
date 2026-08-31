"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { TeamPanel } from "@/components/TeamPanel";
import { useRouter } from "next/navigation";
import {
  formatDate,
  formatWinCondition,
  Player,
  MatchPlayer,
  Team,
  WinCondition,
} from "@/lib/match";
import { ScrollText, Swords } from "lucide-react";
import {
  buildFirstHeroWinMap,
  isFirstHeroWinMatch,
  buildBadgeCompletionMap,
  getBadgeEarnedInMatch,
  buildCompletedBadgesMap,
} from "@/lib/heroWinBonus";
import { Badge } from "@/lib/badges";
import {
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
} from "recharts";

type Match = {
  id: string;
  match_number: number;
  winner: Team;
  win_condition: WinCondition | null;
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: MatchPlayer[];
};

const MATCHES_PER_PAGE = 5;

const MATCH_SELECT = `
  id,
  match_number,
  winner,
  win_condition,
  created_at,
  atlantis_avg_mmr,
  titans_avg_mmr,
  atlantis_mmr_change,
  titans_mmr_change,
  match_players (
    player_id,
    team,
    mmr_before,
    mmr_after,
    hero_id,
    is_bounty,
    action_time_seconds,
    players (
      id,
      name,
      mmr,
      avatar_url
    )
  )
`;

// Supabase returns the embedded `players` relation as an array when it
// can't infer a one-to-one cardinality from the foreign key, and as a
// single object when it can — normalize both shapes here.
type RawMatchPlayer = {
  player_id: string;
  team: string;
  mmr_before: number;
  mmr_after: number;
  hero_id?: string;
  is_bounty?: boolean;
  action_time_seconds?: number | null;
  players: Player | Player[] | null;
};

type RawMatch = {
  id: string;
  match_number: number;
  winner: string;
  win_condition: string | null;
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: RawMatchPlayer[] | null;
};

const normalizeMatch = (match: RawMatch): Match => {
  const normalizedMatchPlayers: MatchPlayer[] = (match.match_players ?? [])
    .map((mp): MatchPlayer | null => {
      const player = Array.isArray(mp.players) ? mp.players[0] : mp.players;
      if (!player) return null;
      return {
        player_id: mp.player_id,
        team: mp.team as Team,
        mmr_before: mp.mmr_before,
        mmr_after: mp.mmr_after,
        hero_id: mp.hero_id,
        is_bounty: mp.is_bounty ?? false,
        action_time_seconds: mp.action_time_seconds ?? null,
        players: {
          id: player.id,
          name: player.name,
          mmr: player.mmr,
          avatar_url: player.avatar_url,
        },
      };
    })
    .filter((mp: MatchPlayer | null): mp is MatchPlayer => mp !== null);

  return {
    id: match.id,
    match_number: match.match_number,
    winner: match.winner as Team,
    win_condition: match.win_condition as WinCondition,
    created_at: match.created_at,
    atlantis_avg_mmr: match.atlantis_avg_mmr,
    titans_avg_mmr: match.titans_avg_mmr,
    atlantis_mmr_change: match.atlantis_mmr_change,
    titans_mmr_change: match.titans_mmr_change,
    match_players: normalizedMatchPlayers,
  };
};

const WIN_CONDITION_ORDER = ["THRONE", "LAST_PUSH", "LIFE_COUNTER"] as const;

const WIN_CONDITION_LABELS: Record<string, string> = {
  THRONE: "Throne",
  LAST_PUSH: "Last Push",
  LIFE_COUNTER: "Life Counter",
};

// Hex values, not CSS custom properties — recharts renders these as SVG
// `fill` attributes, which don't reliably resolve var() references.
const WIN_CONDITION_COLORS: Record<string, string> = {
  THRONE: "#b8860b",
  LAST_PUSH: "#2f6b73",
  LIFE_COUNTER: "#7a1f28",
};

type PieSlice = { label: string; value: number; color: string };

function VictoryPieChart({
  slices,
  size = 120,
}: {
  slices: PieSlice[];
  size?: number;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const data = slices.filter((s) => s.value > 0);

  return (
    <div className="goa-pie-ring" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="100%"
            stroke="var(--stone)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((s) => (
              <Cell key={s.label} fill={s.color} />
            ))}
          </Pie>
        </RePieChart>
      </ResponsiveContainer>
      <div className="goa-pie-center">
        <div className="goa-pie-center-val">{total}</div>
        <div className="goa-pie-center-lbl">Battles</div>
      </div>
    </div>
  );
}

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [winConditionCounts, setWinConditionCounts] = useState<
    Record<string, number>
  >({});
  const [firstHeroWinMap, setFirstHeroWinMap] = useState<Map<string, number>>(
    new Map(),
  );
  const [badgeCompletionMap, setBadgeCompletionMap] = useState<
    Map<string, Badge>
  >(new Map());
  const [completedBadgesMap, setCompletedBadgesMap] = useState<
    Map<string, Badge[]>
  >(new Map());

  // Archive-wide win condition breakdown, independent of match pagination —
  // covers every recorded match.
  useEffect(() => {
    const loadWinConditions = async () => {
      const { data, error } = await supabaseClient
        .from("matches")
        .select("win_condition");
      if (error) {
        console.error(error);
        return;
      }
      const counts: Record<string, number> = {};
      (data ?? []).forEach((row) => {
        if (!row.win_condition) return;
        counts[row.win_condition] = (counts[row.win_condition] ?? 0) + 1;
      });
      setWinConditionCounts(counts);
    };
    loadWinConditions();
  }, []);

  // Archive-wide first-hero-win lookup, independent of match pagination —
  // covers every recorded match so the icon lands on the right one even
  // when that match isn't on the currently loaded page.
  useEffect(() => {
    const loadFirstHeroWins = async () => {
      const { data, error } = await supabaseClient
        .from("match_players")
        .select("player_id, hero_id, team, match_number, matches!inner(winner)")
        .not("hero_id", "is", null);
      if (error) {
        console.error(error);
        return;
      }
      setFirstHeroWinMap(buildFirstHeroWinMap(data ?? []));
      setBadgeCompletionMap(buildBadgeCompletionMap(data ?? []));
      setCompletedBadgesMap(buildCompletedBadgesMap(data ?? []));
    };
    loadFirstHeroWins();
  }, []);

  // Fetches one page of matches, either replacing or appending to the list.
  const fetchMatches = async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    const { data, error, count } = await supabaseClient
      .from("matches")
      .select(MATCH_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + MATCHES_PER_PAGE - 1);

    if (error) {
      console.error(error);
    } else {
      const normalized = (data ?? []).map(normalizeMatch);
      setMatches((prev) => (append ? [...prev, ...normalized] : normalized));
      setTotalCount(count ?? 0);
    }

    if (append) setLoadingMore(false);
    else setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMatches(0, false);
  }, []);

  const handleLoadMore = () => {
    fetchMatches(matches.length, true);
  };

  const router = useRouter();
  const goToProfile = (id: string) => router.push(`/players/${id}`);

  const hasMore = matches.length < totalCount;

  const winConditionSlices: PieSlice[] = WIN_CONDITION_ORDER.map((wc) => ({
    label: WIN_CONDITION_LABELS[wc],
    value: winConditionCounts[wc] ?? 0,
    color: WIN_CONDITION_COLORS[wc],
  }));
  const winConditionTotal = winConditionSlices.reduce(
    (sum, s) => sum + s.value,
    0,
  );

  if (loading) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <ScrollText size={32} />
          </div>
          <p className="goa-loading-text">Consulting the archives…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <header className="goa-header">
        <div className="goa-crown">
          <ScrollText size={30} />
        </div>
        <h1 className="goa-title">Battle Archives</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Victory conditions overview */}
      {winConditionTotal > 0 && (
        <div className="goa-stats-card">
          <div className="goa-stats-head">Victory Conditions</div>
          <div className="goa-pie-wrap">
            <VictoryPieChart slices={winConditionSlices} />
            <ul className="goa-pie-legend">
              {winConditionSlices
                .filter((s) => s.value > 0)
                .map((s) => (
                  <li key={s.label}>
                    <span
                      className="goa-pie-swatch"
                      style={{ background: s.color }}
                    />
                    <span className="goa-pie-legend-label">{s.label}</span>
                    <span className="goa-pie-legend-count">
                      {s.value} (
                      {((s.value / winConditionTotal) * 100).toFixed(0)}%)
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {/* Match list */}
      <div className="goa-matches">
        {matches.length === 0 && (
          <div className="goa-empty">
            <div className="goa-empty-icon">
              <Swords size={34} />
            </div>
            <p>No battles recorded</p>
          </div>
        )}

        {matches.map((match) => {
          const withFirstWinFlag = (list: MatchPlayer[]) =>
            list.map((p) => ({
              ...p,
              is_first_hero_win: isFirstHeroWinMatch(
                firstHeroWinMap,
                p.player_id,
                p.hero_id,
                match.match_number,
              ),
              badge_earned: getBadgeEarnedInMatch(
                badgeCompletionMap,
                p.player_id,
                match.match_number,
              ),
              badges_completed: completedBadgesMap.get(p.player_id) ?? [],
            }));
          const atlantis = withFirstWinFlag(
            match.match_players.filter((p) => p.team === "atlantis"),
          );
          const titans = withFirstWinFlag(
            match.match_players.filter((p) => p.team === "titans"),
          );

          return (
            <div
              key={match.id}
              className="goa-match-card clickable"
              onClick={() => router.push(`/matches/${match.id}`)}
            >
              <div className="goa-match-header">
                <span className="goa-match-date">
                  <span className="goa-match-number">
                    #{match.match_number}
                  </span>
                  · {formatDate(match.created_at)}
                </span>
                <span className="goa-match-winner">
                  <span className={`goa-winner-badge ${match.winner}`}>
                    {match.winner === "none"
                      ? "DRAW"
                      : `${match.winner.toUpperCase()} VICTORY`}{" "}
                    {formatWinCondition(match.win_condition)}
                  </span>
                </span>
              </div>

              <div className="goa-teams">
                <TeamPanel
                  label="Atlantis"
                  labelClass="atl"
                  players={atlantis}
                  avgMmr={match.atlantis_avg_mmr}
                  onSelectPlayer={goToProfile}
                  showAllBadges
                />
                <TeamPanel
                  label="Titans"
                  labelClass="tit"
                  players={titans}
                  avgMmr={match.titans_avg_mmr}
                  onSelectPlayer={goToProfile}
                  showAllBadges
                />
              </div>
            </div>
          );
        })}
      </div>

      {matches.length > 0 && (
        <div className="goa-pagination">
          <p className="goa-pagination-count">
            Showing {matches.length} of {totalCount} battles
          </p>
          {hasMore && (
            <button
              className="goa-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load More Battles"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
