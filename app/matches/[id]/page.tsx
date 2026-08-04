"use client";

import { CSSProperties, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  match_players: MatchPlayer[];
};

type RawMatchPlayer = {
  player_id: string;
  team: string;
  mmr_before: number;
  mmr_after: number;
  hero_id?: string;
  is_bounty?: boolean;
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
  match_players (
    player_id,
    team,
    mmr_before,
    mmr_after,
    hero_id,
    is_bounty,
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
    match_players: normalizedMatchPlayers,
  };
};

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

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

  const atlantis = match.match_players.filter((p) => p.team === "atlantis");
  const titans = match.match_players.filter((p) => p.team === "titans");
  const atlantisOdds =
    match.expected_atlantis_win === null
      ? null
      : Math.round(match.expected_atlantis_win * 100);

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

      {match.draft_method && (
        <div className="goa-draft-method-wrap">
          <span className="goa-draft-method-tag">
            <span className="goa-draft-method-label">Draft Method</span>
            <span className="goa-draft-method-value">
              {draftMethodLabel[match.draft_method]}
            </span>
          </span>
        </div>
      )}

      {atlantisOdds !== null && (
        <div className="goa-section">
          <div className="goa-sec-head">Pre-Match Odds</div>
          <div className="goa-odds-wrap">
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
        </div>
      )}

      <div className="goa-matches">
        <div className="goa-match-card">
          <div className="goa-teams">
            <TeamPanel
              label="Atlantis"
              labelClass="atl"
              players={atlantis}
              avgMmr={match.atlantis_avg_mmr}
              mmrChange={match.atlantis_mmr_change}
              onSelectPlayer={goToProfile}
            />
            <TeamPanel
              label="Titans"
              labelClass="tit"
              players={titans}
              avgMmr={match.titans_avg_mmr}
              mmrChange={match.titans_mmr_change}
              onSelectPlayer={goToProfile}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
