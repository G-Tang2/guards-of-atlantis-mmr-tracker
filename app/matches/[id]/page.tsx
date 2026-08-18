"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase/client";
import { TeamPanel } from "@/components/TeamPanel";
import {
  formatDate,
  formatWinCondition,
  draftMethodLabel,
  DraftMethod,
  Player,
  MatchPlayer,
  Team,
  WinCondition,
} from "@/lib/match";
import { ScrollText, Swords } from "lucide-react";
import { buildFirstHeroWinMap, isFirstHeroWinMatch } from "@/lib/heroWinBonus";

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
  expected_atlantis_win: number | null;
  draft_method: DraftMethod | null;
  starting_wave_counter: number | null;
  starting_life_counter: number | null;
  wave_counter_remaining_1: number | null;
  wave_counter_remaining_2: number | null;
  atlantis_life_counter: number | null;
  titans_life_counter: number | null;
  match_players: MatchPlayer[];
};

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
  expected_atlantis_win: number | null;
  draft_method: string | null;
  starting_wave_counter: number | null;
  starting_life_counter: number | null;
  wave_counter_remaining_1: number | null;
  wave_counter_remaining_2: number | null;
  atlantis_life_counter: number | null;
  titans_life_counter: number | null;
  match_players: RawMatchPlayer[] | null;
};

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
  expected_atlantis_win,
  draft_method,
  starting_wave_counter,
  starting_life_counter,
  wave_counter_remaining_1,
  wave_counter_remaining_2,
  atlantis_life_counter,
  titans_life_counter,
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
    expected_atlantis_win: match.expected_atlantis_win,
    draft_method: match.draft_method as DraftMethod | null,
    starting_wave_counter: match.starting_wave_counter,
    starting_life_counter: match.starting_life_counter,
    wave_counter_remaining_1: match.wave_counter_remaining_1,
    wave_counter_remaining_2: match.wave_counter_remaining_2,
    atlantis_life_counter: match.atlantis_life_counter,
    titans_life_counter: match.titans_life_counter,
    match_players: normalizedMatchPlayers,
  };
};

type DetailRow = {
  label: string;
  value: ReactNode;
  labelClass?: "atl" | "tit";
  icon?: string;
};

// One icon per starting life counter — "front" (still up) for however many
// remain, "back" (flipped/spent) for the rest. Falls back to just the
// remaining count in front icons if the starting total wasn't recorded.
function LifeCounterIcons({
  starting,
  remaining,
  team,
}: {
  starting: number | null;
  remaining: number;
  team: "atl" | "tit";
}) {
  const color = team === "atl" ? "orange" : "blue";
  const total = starting ?? remaining;
  const frontCount = Math.min(remaining, total);
  const backCount = Math.max(0, total - remaining);
  return (
    <div className="goa-life-icon-row">
      {Array.from({ length: frontCount }).map((_, i) => (
        <Image
          key={`front-${i}`}
          src={`/icons/life_counter_${color}_front.png`}
          alt=""
          width={30}
          height={30}
        />
      ))}
      {Array.from({ length: backCount }).map((_, i) => (
        <Image
          key={`back-${i}`}
          src={`/icons/life_counter_${color}_back.png`}
          alt=""
          width={30}
          height={30}
        />
      ))}
    </div>
  );
}

function DetailTable({ rows }: { rows: DetailRow[] }) {
  if (rows.length === 0) return null;
  return (
    <table className="goa-detail-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" className={row.labelClass}>
              {row.icon && (
                <Image
                  src={row.icon}
                  alt=""
                  width={14}
                  height={14}
                  className="goa-label-icon"
                />
              )}
              {row.label}
            </th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstHeroWinMap, setFirstHeroWinMap] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    if (!matchId) return;

    const load = async () => {
      const { data, error } = await supabaseClient
        .from("matches")
        .select(MATCH_SELECT)
        .eq("id", matchId)
        .single();

      if (!error && data) {
        setMatch(normalizeMatch(data as unknown as RawMatch));
      }
      setLoading(false);
    };

    load();
  }, [matchId]);

  // Archive-wide first-hero-win lookup — a player's earliest win with a
  // hero may have happened in a different match than this one, so the
  // icon only needs to appear here if this match number is that match.
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
    };
    loadFirstHeroWins();
  }, []);

  const goToProfile = (id: string) => router.push(`/players/${id}`);

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

  if (!match) {
    return (
      <main className="goa-root">
        <div className="goa-empty">
          <div className="goa-empty-icon">
            <Swords size={34} />
          </div>
          <p>Battle not found</p>
        </div>
      </main>
    );
  }

  const withFirstWinFlag = (list: MatchPlayer[]) =>
    list.map((p) => ({
      ...p,
      is_first_hero_win: isFirstHeroWinMatch(
        firstHeroWinMap,
        p.player_id,
        p.hero_id,
        match.match_number,
      ),
    }));
  const atlantis = withFirstWinFlag(
    match.match_players.filter((p) => p.team === "atlantis"),
  );
  const titans = withFirstWinFlag(
    match.match_players.filter((p) => p.team === "titans"),
  );
  const atlantisOdds =
    match.expected_atlantis_win === null
      ? null
      : Math.round(match.expected_atlantis_win * 100);

  // Wave counter remaining is shown with lane numbering only when a second
  // lane was actually recorded — otherwise it's just one neutral value,
  // not owned by either team.
  const hasSecondWaveLane = match.wave_counter_remaining_2 !== null;

  const preMatchRows: DetailRow[] = [];
  if (match.draft_method) {
    preMatchRows.push({
      label: "Draft Method",
      value: draftMethodLabel[match.draft_method],
    });
  }
  if (match.starting_wave_counter !== null) {
    preMatchRows.push({
      label: "Wave Counters",
      value: match.starting_wave_counter,
      icon: "/icons/wave_counters.png",
    });
  }
  if (match.starting_life_counter !== null) {
    preMatchRows.push({
      label: "Life Counters",
      value: match.starting_life_counter,
      icon: "/icons/life_counters.png",
    });
  }

  const postMatchRows: DetailRow[] = [];
  if (match.wave_counter_remaining_1 !== null) {
    postMatchRows.push({
      label: hasSecondWaveLane ? "Wave Counter(s) Lane 1 Remaining" : "Wave Counter(s) Remaining",
      value: match.wave_counter_remaining_1,
      icon: "/icons/wave_counters.png",
    });
  }
  if (match.wave_counter_remaining_2 !== null) {
    postMatchRows.push({
      label: "Wave Counter(s) Lane 2 Remaining",
      value: match.wave_counter_remaining_2,
      icon: "/icons/wave_counters.png",
    });
  }
  return (
    <main className="goa-root">
      <header className="goa-header">
        <div className="goa-crown">
          <ScrollText size={30} />
        </div>
        <h1 className="goa-title">Battle #{match.match_number}</h1>
        <p className="goa-subtitle">{formatDate(match.created_at)}</p>
      </header>

      <div className={`goa-match-banner ${match.winner}`}>
        <div className="goa-match-banner-title">
          {match.winner === "none"
            ? "Draw"
            : `${match.winner === "atlantis" ? "Atlantis" : "Titans"} Victory`}
        </div>
        {match.win_condition && (
          <div className="goa-match-banner-sub">
            {formatWinCondition(match.win_condition)}
          </div>
        )}
      </div>

      {/* Pre-Match — everything known/decided before the battle started:
          how teams were built, the starting counters, and the Elo odds. */}
      {(match.draft_method ||
        match.starting_wave_counter !== null ||
        match.starting_life_counter !== null ||
        atlantisOdds !== null) && (
        <div className="goa-section">
          <div className="goa-sec-head">Pre-Match</div>

          <DetailTable rows={preMatchRows} />

          {atlantisOdds !== null && (
            <div className="goa-odds-wrap">
              <div className="goa-odds-title">Win Probability</div>
              <div className="goa-odds-labels">
                <span className="atl">Atlantis {atlantisOdds}%</span>
                <span className="tit">Titans {100 - atlantisOdds}%</span>
              </div>
              <div className="goa-odds-track">
                <div
                  className="goa-odds-seg atl"
                  style={
                    { "--bar-width": `${atlantisOdds}%` } as CSSProperties
                  }
                />
                <div
                  className="goa-odds-seg tit"
                  style={
                    {
                      "--bar-width": `${100 - atlantisOdds}%`,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post-Match — what was left of the shared wave counter and each
          team's life counter. The life counters aren't a label/value pair
          like the rest of this table — no heading of their own, just the
          icon strip laid horizontally, since the icon colour alone
          already says which team it's showing. */}
      {(postMatchRows.length > 0 ||
        match.atlantis_life_counter !== null ||
        match.titans_life_counter !== null) && (
        <div className="goa-section">
          <div className="goa-sec-head">Post-Match</div>

          <DetailTable rows={postMatchRows} />

          {match.atlantis_life_counter !== null && (
            <div className="goa-life-icon-strip">
              <LifeCounterIcons
                starting={match.starting_life_counter}
                remaining={match.atlantis_life_counter}
                team="atl"
              />
            </div>
          )}
          {match.titans_life_counter !== null && (
            <div className="goa-life-icon-strip">
              <LifeCounterIcons
                starting={match.starting_life_counter}
                remaining={match.titans_life_counter}
                team="tit"
              />
            </div>
          )}
        </div>
      )}

      {/* Teams — each team's roster, hero picks, and MMR change. */}
      <div className="goa-section">
        <div className="goa-sec-head">Teams</div>

        <div className="goa-teams">
          <TeamPanel
            label="Atlantis"
            labelClass="atl"
            players={atlantis}
            avgMmr={match.atlantis_avg_mmr}
            onSelectPlayer={goToProfile}
          />
          <TeamPanel
            label="Titans"
            labelClass="tit"
            players={titans}
            avgMmr={match.titans_avg_mmr}
            onSelectPlayer={goToProfile}
          />
        </div>
      </div>
    </main>
  );
}
