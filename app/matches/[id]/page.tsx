"use client";

import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
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
import { ScrollText, Swords, MessageCircle, Loader2, RotateCw, ChevronDown, Star, Ban, Pencil, X } from "lucide-react";
import { RankedBalanceResult, RankedBalanceResultPlayer } from "@/lib/rankedBalanceResult";
import { OptionCard } from "@/components/RankedVoteUI";
import { VoteSessionPlayer } from "@/lib/rankedVoteSession";
import {
  buildFirstHeroWinMap,
  isFirstHeroWinMatch,
  buildBadgeCompletionMap,
  getBadgeEarnedInMatch,
  buildCompletedBadgesMap,
  buildWonHeroesByPlayer,
} from "@/lib/heroWinBonus";
import { Badge } from "@/lib/badges";
import { sharedAuthHeaders } from "@/lib/apiAuth";
import { renderSimpleMarkdown } from "@/lib/simpleMarkdown";
import { CardReference, findMentionedCards } from "@/lib/heroCardContext";
import { CardDetailModal } from "@/components/CardDetail";
import { PasswordGate } from "@/components/PasswordGate";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { HeroPicker } from "@/components/HeroPicker";
import { Hero, HEROES } from "@/lib/heroes";
import { computeBountyHeroIds, ARCANE_BOUNTY_THRESHOLD } from "@/lib/bounty";
import { getOwnedBadgeIds } from "@/lib/badgeRewards";
import { computeMatchOutcome, RosterPlayer } from "@/lib/matchRecording";
import { BadgeEarnedOverlay, EarnedBadgeInfo } from "@/components/BadgeEarnedOverlay";

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
  draft_analysis: string | null;
  ranked_balance_result: RankedBalanceResult | null;
  match_players: MatchPlayer[];
};

type RawMatchPlayer = {
  player_id: string;
  team: string;
  mmr_before: number;
  mmr_after: number;
  hero_id?: string;
  is_bounty?: boolean;
  bounty_bonus?: number | null;
  devoted_bonus?: number | null;
  renowned_bonus?: number | null;
  defiant_bonus?: number | null;
  rookie_bonus?: number | null;
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
  draft_analysis: string | null;
  ranked_balance_result: RankedBalanceResult | null;
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
  draft_analysis,
  ranked_balance_result,
  match_players (
    player_id,
    team,
    mmr_before,
    mmr_after,
    hero_id,
    is_bounty,
    bounty_bonus,
    devoted_bonus,
    renowned_bonus,
    defiant_bonus,
    rookie_bonus,
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
        bounty_bonus: mp.bounty_bonus ?? null,
        devoted_bonus: mp.devoted_bonus ?? null,
        renowned_bonus: mp.renowned_bonus ?? null,
        defiant_bonus: mp.defiant_bonus ?? null,
        rookie_bonus: mp.rookie_bonus ?? null,
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
    draft_analysis: match.draft_analysis,
    ranked_balance_result: match.ranked_balance_result,
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

// Collapsed by default (a plain <details>, no `open`) — the full vote
// breakdown is useful to dig into but not something most visits to a
// match's own detail page need to see right away, unlike the outcome
// itself further up. See lib/rankedBalanceResult.ts for what's captured.
function RankedBalanceResultSection({ result }: { result: RankedBalanceResult }) {
  const summaryNote = result.skippedVoting
    ? "Only one balanced split was possible for this group — it was applied automatically, with no vote held."
    : result.chooseRoundSkipped
      ? "Options were banned first; only one option survived, so it was applied automatically."
      : `${result.totalVotes} vote${result.totalVotes === 1 ? "" : "s"} cast${
          result.wantsBan ? ", after a ban round" : ""
        }.`;

  // Same card the vote page renders (OptionCard) whenever every player's
  // MMR was captured — older saved results predate that and fall back to
  // a plain name list instead, since their average MMR/gain can't be
  // reconstructed honestly.
  const hasFullPlayerData = result.options.every((option) =>
    [...option.atlantis, ...option.titans].every((p) => typeof p.mmr === "number"),
  );
  const votesCast = result.options.reduce((sum, o) => sum + o.votes, 0);
  const wasForced =
    !result.skippedVoting && !result.chooseRoundSkipped && votesCast < result.totalVotes;
  const toVotePlayer = (p: RankedBalanceResultPlayer): VoteSessionPlayer => ({
    id: p.id,
    name: p.name,
    mmr: p.mmr ?? 0,
    avatar_url: p.avatar_url ?? null,
  });

  return (
    <details className="goa-section">
      <summary className="goa-sec-head clickable goa-ranked-result-summary">
        <Star size={13} />
        Ranked Balance Vote
        <ChevronDown size={14} className="goa-ranked-result-chevron" />
      </summary>
      <div className="draft-body">
        <p className="draft-note" style={{ textAlign: "left" }}>
          {summaryNote}
          {wasForced && " The match creator picked the winning option directly."}
        </p>
        <div className="goa-vote-options">
          {result.options.map((option, i) => {
            const className = `ranked-option${i === result.winnerIndex ? " winner" : ""}${
              option.banned ? " banned" : ""
            }`;
            const headExtra = (
              <>
                {!result.skippedVoting && !result.chooseRoundSkipped && !option.banned && !wasForced && (
                  <span className="vote-results-count">
                    {option.votes} of {result.totalVotes} votes
                  </span>
                )}
                {result.wantsBan && option.banVotes !== undefined && (
                  <span className="vote-results-count">
                    {option.banVotes} of {result.totalVotes} ban votes
                  </span>
                )}
              </>
            );
            if (hasFullPlayerData) {
              return (
                <OptionCard
                  key={i}
                  index={i}
                  split={{
                    atlantis: option.atlantis.map(toVotePlayer),
                    titans: option.titans.map(toVotePlayer),
                  }}
                  className={className}
                  banned={option.banned}
                  headExtra={headExtra}
                />
              );
            }
            return (
              <div key={i} className={className}>
                <div className="ranked-option-head">
                  <span className="ranked-option-head-left">
                    Option {i + 1}
                    {option.banned && (
                      <span className="goa-vote-banned-tag">
                        <Ban size={11} /> Banned
                      </span>
                    )}
                  </span>
                  {headExtra}
                </div>
                <div className="draft-live-teams">
                  {(
                    [
                      ["atl", "Atlantis", option.atlantis],
                      ["tit", "Titans", option.titans],
                    ] as const
                  ).map(([faction, label, players]) => (
                    <div key={faction} className="draft-live-team">
                      <span className={`draft-faction-label ${faction}`}>{label}</span>
                      {players.map((p) => (
                        <div key={p.id} className="draft-live-row">
                          <span className="draft-live-name">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </details>
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
  const [badgeCompletionMap, setBadgeCompletionMap] = useState<
    Map<string, Badge>
  >(new Map());
  const [completedBadgesMap, setCompletedBadgesMap] = useState<
    Map<string, Badge[]>
  >(new Map());
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardReference | null>(null);

  // Editing is only ever offered for the single most-recently-recorded
  // match in the whole archive — see the edit section's own comment for
  // why that scope is what keeps a correction safe to apply directly
  // (no cascading recompute of anything after it, since nothing is).
  const [latestMatchNumber, setLatestMatchNumber] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editWinner, setEditWinner] = useState<Team | "">("");
  const [editWinCondition, setEditWinCondition] = useState<WinCondition | null>(null);
  const [editHeroByPlayer, setEditHeroByPlayer] = useState<Record<string, Hero | null>>({});
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeInfo[]>([]);

  useEffect(() => {
    supabaseClient
      .from("matches")
      .select("match_number")
      .order("match_number", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLatestMatchNumber(data?.match_number ?? null));
  }, []);

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
      setBadgeCompletionMap(buildBadgeCompletionMap(data ?? []));
      setCompletedBadgesMap(buildCompletedBadgesMap(data ?? []));
    };
    loadFirstHeroWins();
  }, []);

  // Lets a card named in the Oracle's own generated analysis text be
  // tapped to view its exact stats (see goa-card-mention in
  // lib/simpleMarkdown.tsx), same as a card mentioned in an Oracle chat
  // reply — scoped to only the heroes actually in this match, same
  // reasoning as findMentionedCards' own comment (avoids false-positive
  // matches from short/generic names against heroes with nothing to do
  // with this match). Recomputed from the plain stored text rather than
  // a separate persisted column, since it's cheap and always stays in
  // sync with whatever text is actually shown.
  const draftAnalysisHeroIds = useMemo(
    () => Array.from(new Set((match?.match_players ?? []).map((p) => p.hero_id).filter((id): id is string => !!id))),
    [match],
  );
  const draftAnalysisCardReferences = useMemo(
    () => (match?.draft_analysis ? findMentionedCards(match.draft_analysis, draftAnalysisHeroIds) : []),
    [match, draftAnalysisHeroIds],
  );

  const goToProfile = (id: string) => router.push(`/players/${id}`);

  const isLatestMatch = !!match && match.match_number === latestMatchNumber;

  const startEdit = () => {
    if (!match) return;
    setEditWinner(match.winner);
    setEditWinCondition(match.win_condition);
    const heroMap: Record<string, Hero | null> = {};
    match.match_players.forEach((p) => {
      heroMap[p.player_id] = p.hero_id ? HEROES.find((h) => h.id === p.hero_id) ?? null : null;
    });
    setEditHeroByPlayer(heroMap);
    setEditError(null);
    setEditMode(true);
  };

  // Every hero already assigned to a *different* participant in the edit
  // form, so HeroPicker can hide it the same way the original recording
  // form does — a hero can only be played by one player per match.
  const otherEditAssignedHeroIds = (playerId: string): string[] =>
    Object.entries(editHeroByPlayer)
      .filter(([id, hero]) => id !== playerId && hero)
      .map(([, hero]) => hero!.id);

  // Recomputes this match's result through the exact same pipeline a
  // fresh recording uses (see lib/matchRecording.ts) and overwrites it in
  // place — safe only because this is the single latest match in the
  // whole archive (enforced by isLatestMatch/the Edit button's own
  // guard): nothing recorded after it depends on its numbers, so there's
  // no cascade to replay. "Before this match" context (hero-win history,
  // bounty eligibility, matches played) is rebuilt by excluding this
  // match's own rows from the same queries a fresh recording would run —
  // this match already exists in the DB, unlike a genuinely new one.
  const handleSaveEdit = async () => {
    if (!match || !editWinner || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const pickedHeroIds = Object.values(editHeroByPlayer)
        .filter((h): h is Hero => !!h)
        .map((h) => h.id);
      if (new Set(pickedHeroIds).size !== pickedHeroIds.length) {
        throw new Error("The same hero can't be assigned to two players.");
      }

      const allParticipantIds = match.match_players.map((p) => p.player_id);

      const [{ data: heroHistory }, { data: priorMatches }, { data: participantRows }] = await Promise.all([
        supabaseClient
          .from("match_players")
          .select("player_id, hero_id, team, match_number, matches!inner(winner)")
          .in("player_id", allParticipantIds)
          .not("hero_id", "is", null)
          .neq("match_id", match.id),
        supabaseClient
          .from("matches")
          .select("id, match_number, winner, match_players ( hero_id )")
          .neq("id", match.id)
          .order("created_at", { ascending: false }),
        supabaseClient.from("players").select("id, matches_played, rookie_eligible").in("id", allParticipantIds),
      ]);

      const wonHeroesByPlayer = buildWonHeroesByPlayer(heroHistory ?? []);
      const ownedBadgesByPlayer = new Map<string, Set<string>>(
        allParticipantIds.map((id) => [id, getOwnedBadgeIds(wonHeroesByPlayer.get(id) ?? new Set())]),
      );
      const allHeroIds = HEROES.map((h) => h.id);
      const bountyHeroIds = computeBountyHeroIds(priorMatches ?? [], allHeroIds);
      const arcaneBountyHeroIds = computeBountyHeroIds(priorMatches ?? [], allHeroIds, ARCANE_BOUNTY_THRESHOLD);
      const heroIdByPlayer = new Map<string, string | null>(
        match.match_players.map((p) => [p.player_id, editHeroByPlayer[p.player_id]?.id ?? null]),
      );
      // This is each participant's latest match, so their matches_played
      // already includes it — "before" is one less.
      const rookieInputByPlayer = new Map(
        (participantRows ?? []).map((p) => [
          p.id,
          { matchesPlayedBefore: Math.max(0, (p.matches_played ?? 1) - 1), rookieEligible: p.rookie_eligible ?? false },
        ]),
      );

      const toRoster = (list: MatchPlayer[]): RosterPlayer[] =>
        list.map((p) => ({ id: p.player_id, name: p.players.name, mmr: p.mmr_before, avatarUrl: p.players.avatar_url }));

      const computed = computeMatchOutcome({
        atlantis: toRoster(match.match_players.filter((p) => p.team === "atlantis")),
        titans: toRoster(match.match_players.filter((p) => p.team === "titans")),
        winner: editWinner,
        heroIdByPlayer,
        wonHeroesByPlayer,
        ownedBadgesByPlayer,
        bountyHeroIds,
        arcaneBountyHeroIds,
        rookieInputByPlayer,
      });

      const { error: matchError } = await supabaseClient
        .from("matches")
        .update({
          winner: editWinner,
          win_condition: editWinner === "none" ? null : editWinCondition,
          atlantis_mmr_change: computed.meta.atlantisDelta,
          titans_mmr_change: computed.meta.titansDelta,
          expected_atlantis_win: computed.meta.expectedA,
        })
        .eq("id", match.id);
      if (matchError) throw matchError;

      const allFinal = [...computed.atlantisFinal, ...computed.titansFinal];
      const mpUpdateError = (
        await Promise.all(
          allFinal.map((p) => {
            const bonuses = computed.badgeBonusesByPlayer.get(p.id);
            return supabaseClient
              .from("match_players")
              .update({
                hero_id: heroIdByPlayer.get(p.id) ?? null,
                mmr_after: Math.round(p.newMmr),
                is_bounty: computed.bountyBonusByPlayer.has(p.id),
                bounty_bonus: computed.bountyBonusByPlayer.get(p.id) ?? null,
                devoted_bonus: bonuses?.devoted ?? null,
                renowned_bonus: bonuses?.renowned ?? null,
                defiant_bonus: bonuses?.defiant ?? null,
                rookie_bonus: computed.rookieBonusByPlayer.get(p.id) ?? null,
              })
              .eq("match_id", match.id)
              .eq("player_id", p.id);
          }),
        )
      ).find((r) => r.error)?.error;
      if (mpUpdateError) throw mpUpdateError;

      // Propagate each participant's corrected MMR to their *current*
      // mmr — safe because this is their latest match (nothing later has
      // happened for them since).
      await Promise.all(
        allFinal.map((p) => supabaseClient.from("players").update({ mmr: Math.round(p.newMmr) }).eq("id", p.id)),
      );

      // Resync every player's rank to a plain descending-mmr order —
      // same "fresh baseline" approach supabase/migrations/0009_resync_ranks.sql
      // already established for a correction like this, rather than
      // replaying the full protected-rank/overtake algorithm a second
      // time outside the one place (a fresh recording) it's meant for.
      const { data: allPlayers } = await supabaseClient.from("players").select("id, mmr, rank, name");
      if (allPlayers) {
        const ordered = [...allPlayers].sort((a, b) => {
          if (b.mmr !== a.mmr) return b.mmr - a.mmr;
          const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
          const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name);
        });
        await supabaseClient
          .from("players")
          .update({ rank: null })
          .in("id", ordered.map((p) => p.id));
        await Promise.all(
          ordered.map((p, idx) => supabaseClient.from("players").update({ rank: idx + 1 }).eq("id", p.id)),
        );
      }

      const { data: refreshed } = await supabaseClient
        .from("matches")
        .select(MATCH_SELECT)
        .eq("id", match.id)
        .single();
      if (refreshed) setMatch(normalizeMatch(refreshed as unknown as RawMatch));

      setEditMode(false);
      if (computed.newlyEarnedBadges.length > 0) setEarnedBadges(computed.newlyEarnedBadges);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes. Try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const generateDraftAnalysis = async (regenerate: boolean) => {
    if (!matchId || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/draft-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...sharedAuthHeaders() },
        body: JSON.stringify({ regenerate }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to generate the draft analysis");
      }
      setMatch((prev) => (prev ? { ...prev, draft_analysis: data.analysis } : prev));
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to generate the draft analysis");
    } finally {
      setAnalysisLoading(false);
    }
  };

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

  // Editing is its own full screen (rather than an inline panel on the
  // normal view) so it can sit behind PasswordGate the same way
  // /matches/new does — only someone who knows the shared password ever
  // sees the form itself, not just a disabled "Edit" button.
  if (editMode) {
    const winConditionOptions: { value: WinCondition; label: string }[] = [
      { value: WinCondition.THRONE, label: "Throne" },
      { value: WinCondition.LAST_PUSH, label: "Last Push" },
      { value: WinCondition.LIFE_COUNTER, label: "Life Counter" },
    ];
    return (
      <PasswordGate>
        <main className="goa-root goa-bg">
          <header className="goa-header">
            <h1 className="goa-title">Edit Battle #{match.match_number}</h1>
            <p className="goa-subtitle">Guards of Atlantis II</p>
          </header>

          {(
            [
              ["atlantis", "Atlantis", "atlantis-header"],
              ["titans", "Titans", "titans-header"],
            ] as const
          ).map(([team, label, headerClass]) => (
            <div className="goa-section" key={team}>
              <div className={`goa-section-header ${headerClass}`}>
                <h2 className="goa-section-title">{label}</h2>
              </div>
              <div className="goa-players">
                {match.match_players
                  .filter((p) => p.team === team)
                  .map((p) => (
                    <div key={p.player_id} className="goa-player-block">
                      <div className="goa-player-row">
                        <span className="goa-player-name">
                          <PlayerAvatar avatarUrl={p.players.avatar_url} name={p.players.name} size={22} />
                          {p.players.name}
                        </span>
                      </div>
                      <HeroPicker
                        selected={editHeroByPlayer[p.player_id] ?? null}
                        onSelect={(h) =>
                          setEditHeroByPlayer((prev) => ({ ...prev, [p.player_id]: h }))
                        }
                        excludeHeroIds={otherEditAssignedHeroIds(p.player_id)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}

          <p className="winner-label">Declare the victor</p>
          <div className="goa-winner-section">
            <button
              type="button"
              className={`goa-faction-btn goa-faction-btn-a ${editWinner === "atlantis" ? "selected" : ""}`}
              onClick={() => setEditWinner(editWinner === "atlantis" ? "" : "atlantis")}
            >
              <span className="goa-faction-label">Atlantis</span>
            </button>
            <button
              type="button"
              className={`goa-faction-btn goa-faction-btn-t ${editWinner === "titans" ? "selected" : ""}`}
              onClick={() => setEditWinner(editWinner === "titans" ? "" : "titans")}
            >
              <span className="goa-faction-label">Titans</span>
            </button>
            <button
              type="button"
              className={`goa-faction-btn goa-faction-btn-d ${editWinner === "none" ? "selected" : ""}`}
              onClick={() => {
                setEditWinner(editWinner === "none" ? "" : "none");
                setEditWinCondition(null);
              }}
            >
              <span className="goa-faction-label">Draw</span>
            </button>
          </div>

          <p className="winner-label">Victory Condition</p>
          <div className="goa-win-condition-section">
            {winConditionOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={editWinner === "none"}
                className={`goa-win-condition-btn ${editWinCondition === value ? "selected" : ""}`}
                onClick={() => setEditWinCondition(editWinCondition === value ? null : value)}
              >
                <span className="goa-faction-label">{label}</span>
              </button>
            ))}
          </div>

          <div className="goa-divider" />

          {editError && (
            <p className="goa-password-gate-error" style={{ textAlign: "center" }}>
              {editError}
            </p>
          )}

          <div className="goa-btn-wrap">
            <button
              type="button"
              className="goa-btn inline-flex items-center justify-center gap-2"
              onClick={handleSaveEdit}
              disabled={!editWinner || editSaving}
            >
              {editSaving ? (
                "✦ Saving…"
              ) : (
                <>
                  <Pencil size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
          <div className="goa-btn-wrap">
            <button
              type="button"
              className="goa-btn outline inline-flex items-center justify-center gap-2"
              onClick={() => setEditMode(false)}
              disabled={editSaving}
            >
              <X size={18} />
              Cancel
            </button>
          </div>

          {earnedBadges.length > 0 && (
            <BadgeEarnedOverlay badges={earnedBadges} onDone={() => setEarnedBadges([])} />
          )}
        </main>
      </PasswordGate>
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

      {/* Only the single most-recently-recorded match in the whole
          archive is ever editable — see startEdit/handleSaveEdit's own
          comment for why editing anything earlier isn't offered here. */}
      {isLatestMatch && (
        <div className="goa-btn-wrap">
          <button
            type="button"
            className="goa-btn outline sm inline-flex items-center justify-center gap-2"
            onClick={startEdit}
          >
            <Pencil size={14} />
            Edit This Battle
          </button>
        </div>
      )}

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

      {match.ranked_balance_result && (
        <RankedBalanceResultSection result={match.ranked_balance_result} />
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
            showActionTime
            showAllBadges
          />
          <TeamPanel
            label="Titans"
            labelClass="tit"
            players={titans}
            avgMmr={match.titans_avg_mmr}
            onSelectPlayer={goToProfile}
            showActionTime
            showAllBadges
          />
        </div>
      </div>

      {/* Draft Analysis — an Oracle-generated (Gemini) read on which team
          drafted the stronger composition. Generated once on demand and
          cached on the match row (see draft_analysis in MATCH_SELECT
          above) rather than regenerated on every page view. */}
      <div className="goa-section">
        <div className="goa-sec-head goa-draft-analysis-head">
          <span className="goa-draft-analysis-head-title">
            <MessageCircle size={14} />
            Draft Analysis
          </span>
          {match.draft_analysis && !analysisLoading && (
            <button
              type="button"
              className="goa-draft-analysis-regen-btn"
              onClick={() => generateDraftAnalysis(true)}
              aria-label="Regenerate draft analysis"
              title="Regenerate"
            >
              <RotateCw size={13} />
            </button>
          )}
        </div>

        {match.draft_analysis ? (
          <div className="goa-draft-analysis-text">
            {renderSimpleMarkdown(match.draft_analysis, draftAnalysisCardReferences, setSelectedCard)}
          </div>
        ) : analysisLoading ? (
          <p className="goa-draft-analysis-hint">
            The Oracle is analyzing the draft… this can take up to 45 seconds.
          </p>
        ) : (
          <>
            <p className="goa-draft-analysis-hint">
              Let the Oracle judge which team drafted the stronger composition.
            </p>
            <button
              type="button"
              className="goa-draft-analysis-btn"
              onClick={() => generateDraftAnalysis(false)}
            >
              Generate Draft Analysis
            </button>
          </>
        )}
        {analysisLoading && (
          <div className="goa-draft-analysis-loading">
            <Loader2 size={16} className="goa-spin" />
          </div>
        )}
        {analysisError && <p className="goa-chat-error">{analysisError}</p>}
      </div>

      {selectedCard && (
        <CardDetailModal reference={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </main>
  );
}
