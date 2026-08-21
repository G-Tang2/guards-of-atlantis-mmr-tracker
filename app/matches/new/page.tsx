"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase/client";
import { calculateMMR, PlayerResult } from "@/lib/mmr";
import { HeroPicker } from "@/components/HeroPicker";
import { Hero, HEROES } from "@/lib/heroes";
import { computeBountyHeroIds, BOUNTY_MMR_BONUS } from "@/lib/bounty";
import { computeHeroWinBonus, applyHeroWinBonus } from "@/lib/heroWinBonus";
import { DraftMethod, didWin } from "@/lib/match";
import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import { TIMER_LOG_STORAGE_KEY } from "@/lib/timerLog";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PasswordGate } from "@/components/PasswordGate";
import { BadgeEarnedOverlay, EarnedBadgeInfo } from "@/components/BadgeEarnedOverlay";
import { Swords } from "lucide-react";

type Player = {
  id: string;
  name: string;
  mmr: number;
  rank: number;
  avatar_url?: string | null;
  last_played_match_number: number;
};

type PoolEntry = {
  player: Player;
  hero: Hero | null;
};

enum WinCondition {
  LAST_PUSH = "LAST_PUSH",
  THRONE = "THRONE",
  LIFE_COUNTER = "LIFE_COUNTER",
}

type Team = "atlantis" | "titans";
type Winner = "" | "atlantis" | "titans" | "none";

const INACTIVE_GAME_THRESHOLD = 5;

// 0, 1, …, max — the remaining counter can't exceed what the match started with.
const zeroToMax = (max: number) => Array.from({ length: max + 1 }, (_, i) => i);

function NewMatchPageInner() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [atlantisSearch, setAtlantisSearch] = useState("");
  const [titansSearch, setTitansSearch] = useState("");
  const [atlantis, setAtlantis] = useState<PoolEntry[]>([]);
  const [titans, setTitans] = useState<PoolEntry[]>([]);
  const [winner, setWinner] = useState<Winner>("");
  const [winCondition, setWinCondition] = useState<WinCondition | null>(null);
  const [draftMethod, setDraftMethod] = useState<DraftMethod>("custom");
  // Life counter remaining for each team at match end — per team, since
  // each team's life total is its own. Independent of win condition, and
  // left unset (empty string) unless the user picks one.
  const [atlantisLifeCounter, setAtlantisLifeCounter] = useState("");
  const [titansLifeCounter, setTitansLifeCounter] = useState("");
  // Wave counter remaining is NOT per team — both teams share the same
  // lane(s). One remaining input if the match used one lane, two if it
  // used two (set on Divide the Host); neither is "Atlantis's" or
  // "Titans's".
  const [waveCounterRemaining1, setWaveCounterRemaining1] = useState("");
  const [waveCounterRemaining2, setWaveCounterRemaining2] = useState("");
  // The starting wave/life counter chosen on Divide the Host — handed off
  // (not re-entered here), and recorded alongside the remaining counters
  // above so the match record shows both ends. Empty if that step was
  // skipped. Both are one shared starting value; twoWaveLanes just decides
  // whether one or two remaining-wave inputs render above.
  const [startingWaveCounter, setStartingWaveCounter] = useState("");
  const [startingLifeCounter, setStartingLifeCounter] = useState("");
  const [twoWaveLanes, setTwoWaveLanes] = useState(false);
  // Upper bound for the remaining-wave dropdown(s) above — remaining can
  // only be 0..starting. Falls back to the largest possible starting value
  // if that step was skipped, so the field still offers a sensible range.
  const maxWaveCounter = [3, 5, 7].includes(Number(startingWaveCounter))
    ? Number(startingWaveCounter)
    : 7;
  const maxLifeCounter =
    Number(startingLifeCounter) >= 4 && Number(startingLifeCounter) <= 8
      ? Number(startingLifeCounter)
      : 8;
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeInfo[]>([]);

  useEffect(() => {
    const loadPlayers = async () => {
      const result = await supabaseClient
        .from("players")
        .select("*")
        .order("name");
      const { data, error } = await result;
      if (!error && data) {
        setPlayers(data);

        // Handed off from /teams via sessionStorage rather than the URL —
        // one source of truth, and it survives a refresh just as well.
        try {
          const raw = sessionStorage.getItem(TEAMS_DRAFT_STORAGE_KEY);
          if (raw) {
            const saved = JSON.parse(raw) as {
              pool: string[];
              atlantis: string[];
              titans: string[];
              method: DraftMethod;
              waveCounter?: string;
              lifeCounter?: string;
              twoWaveLanes?: boolean;
            };
            const byId = new Map<string, Player>(data.map((p) => [p.id, p]));
            const resolve = (ids: string[]): PoolEntry[] =>
              ids
                .map((id) => byId.get(id))
                .filter((p): p is Player => !!p)
                .map((player) => ({ player, hero: null }));

            const atlantisEntries = resolve(saved.atlantis);
            const titansEntries = resolve(saved.titans);
            if (atlantisEntries.length > 0) setAtlantis(atlantisEntries);
            if (titansEntries.length > 0) setTitans(titansEntries);

            const validDraftMethods: DraftMethod[] = [
              "captains_draft",
              "random",
              "balanced",
              "ranked_balanced",
              "custom",
            ];
            if (validDraftMethods.includes(saved.method)) {
              setDraftMethod(saved.method);
            }

            if ([3, 5, 7].includes(Number(saved.waveCounter))) {
              setStartingWaveCounter(saved.waveCounter!);
            }
            setTwoWaveLanes(saved.twoWaveLanes ?? false);
            const startingLife = Number(saved.lifeCounter);
            if (startingLife >= 4 && startingLife <= 8) {
              setStartingLifeCounter(saved.lifeCounter!);
            }
          }
        } catch {
          // Corrupt/stale entry — ignore and start empty.
        }
      }

      setLoading(false);
    };
    loadPlayers();
  }, []);

  const showToast = (msg: string, isError = false) => {
    setToast(msg);
    setToastError(isError);
    setTimeout(() => setToast(null), 3000);
  };

  const availablePlayers = players.filter(
    (p) =>
      !atlantis.some((e) => e.player.id === p.id) &&
      !titans.some((e) => e.player.id === p.id),
  );

  const upsertPlayer = async (name: string): Promise<Player> => {
    const res = await supabaseClient
      .from("players")
      .upsert({ name }, { onConflict: "name" })
      .select()
      .single();
    const { data, error } = await res;
    if (error) throw error;
    return data;
  };

  const addPlayer = async (name: string, team: Team) => {
    if (!name.trim()) return;
    const player = await upsertPlayer(name.trim());
    const entry: PoolEntry = { player, hero: null };

    if (team === "atlantis") {
      setAtlantis((prev) =>
        prev.find((e) => e.player.id === player.id) ? prev : [...prev, entry],
      );
      setAtlantisSearch("");
    } else {
      setTitans((prev) =>
        prev.find((e) => e.player.id === player.id) ? prev : [...prev, entry],
      );
      setTitansSearch("");
    }

    setPlayers((prev) =>
      prev.find((p) => p.id === player.id) ? prev : [...prev, player],
    );
  };

  const removePlayer = (id: string, team: Team) => {
    if (team === "atlantis")
      setAtlantis((prev) => prev.filter((e) => e.player.id !== id));
    else setTitans((prev) => prev.filter((e) => e.player.id !== id));
  };

  const filterPlayers = (list: Player[], query: string): Player[] =>
    list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const setHero = (playerId: string, team: Team, hero: Hero | null) => {
    if (team === "atlantis") {
      setAtlantis((prev) =>
        prev.map((e) => (e.player.id === playerId ? { ...e, hero } : e)),
      );
    } else {
      setTitans((prev) =>
        prev.map((e) => (e.player.id === playerId ? { ...e, hero } : e)),
      );
    }
  };

  // A team's life counter hitting 0 means the other team just won by life
  // counter — fill in the victor and win condition as a convenience, since
  // that's always the correct call the moment this is entered. Both teams
  // can never be at 0 simultaneously, so block the second one.
  const handleAtlantisLifeChange = (value: string) => {
    if (value === "0" && titansLifeCounter === "0") {
      showToast("Both teams can't be at 0 life remaining", true);
      return;
    }
    setAtlantisLifeCounter(value);
    if (value === "0") {
      setWinner("titans");
      setWinCondition(WinCondition.LIFE_COUNTER);
    }
  };

  const handleTitansLifeChange = (value: string) => {
    if (value === "0" && atlantisLifeCounter === "0") {
      showToast("Both teams can't be at 0 life remaining", true);
      return;
    }
    setTitansLifeCounter(value);
    if (value === "0") {
      setWinner("atlantis");
      setWinCondition(WinCondition.LIFE_COUNTER);
    }
  };

  const handleSave = async () => {
    if (!winner || atlantis.length === 0 || titans.length === 0 || saving)
      return;
    setSaving(true);

    try {
      const atlPlayers = atlantis.map((e) => e.player);
      const titPlayers = titans.map((e) => e.player);
      const result = calculateMMR(atlPlayers, titPlayers, winner);

      const heroIdFor = (playerId: string, team: Team) =>
        (team === "atlantis" ? atlantis : titans).find(
          (e) => e.player.id === playerId,
        )?.hero?.id ?? null;

      // A bounty hero is one nobody has played in the last several matches —
      // picking one awards a flat bonus on top of the normal Elo delta,
      // regardless of whether the match was won or lost.
      const { data: priorMatches } = await supabaseClient
        .from("matches")
        .select("id, match_players ( hero_id )")
        .order("created_at", { ascending: false });
      const bountyHeroIds = computeBountyHeroIds(
        priorMatches ?? [],
        HEROES.map((h) => h.id),
      );

      const applyBounty = (list: PlayerResult[], team: Team): PlayerResult[] =>
        list.map((p) => {
          const heroId = heroIdFor(p.id, team);
          if (!heroId || !bountyHeroIds.has(heroId)) return p;
          return {
            ...p,
            mmrChange: p.mmrChange + BOUNTY_MMR_BONUS,
            newMmr: p.newMmr + BOUNTY_MMR_BONUS,
          };
        });

      const atlantisResults = applyBounty(result.atlantis, "atlantis");
      const titansResults = applyBounty(result.titans, "titans");

      // First win with a hero grants a 30% MMR boost (on top of any bounty
      // bonus already folded in above); if that win also completes a badge
      // (a win with every hero in the badge), a flat +50 replaces the 30%
      // boost rather than stacking with it. "Won" uses the same team===winner
      // || winner==="none" rule the rest of the app uses for hero/badge
      // progress, so a draw counts here too.
      const eligiblePlayers = [
        ...atlantis.map((e) => ({ ...e, team: "atlantis" as Team })),
        ...titans.map((e) => ({ ...e, team: "titans" as Team })),
      ].filter((e) => e.hero && didWin(e.team, winner));

      const heroWonByPlayer = new Map<string, Set<string>>();
      if (eligiblePlayers.length > 0) {
        const { data: heroHistory } = await supabaseClient
          .from("match_players")
          .select("player_id, hero_id, team, matches!inner(winner)")
          .in(
            "player_id",
            eligiblePlayers.map((e) => e.player.id),
          )
          .not("hero_id", "is", null);

        (heroHistory ?? []).forEach((row) => {
          const matchInfo = Array.isArray(row.matches)
            ? row.matches[0]
            : row.matches;
          if (!matchInfo || !row.hero_id) return;
          if (!didWin(row.team, matchInfo.winner)) return;
          const set = heroWonByPlayer.get(row.player_id) ?? new Set<string>();
          set.add(row.hero_id);
          heroWonByPlayer.set(row.player_id, set);
        });
      }

      const newlyEarnedBadges: EarnedBadgeInfo[] = [];
      const applyHeroBonus = (
        list: PlayerResult[],
        team: Team,
      ): PlayerResult[] =>
        list.map((p) => {
          const entry = eligiblePlayers.find(
            (e) => e.player.id === p.id && e.team === team,
          );
          const heroId = entry?.hero?.id;
          if (!heroId) return p;

          const bonus = computeHeroWinBonus(
            heroId,
            heroWonByPlayer.get(p.id) ?? new Set(),
          );
          if (!bonus) return p;

          if (bonus.type === "badge") {
            newlyEarnedBadges.push({
              playerId: p.id,
              playerName: p.name,
              playerAvatar: entry?.player.avatar_url,
              badge: bonus.badge,
            });
          }

          const boostedChange = applyHeroWinBonus(p.mmrChange, bonus);
          return {
            ...p,
            newMmr: p.newMmr + (boostedChange - p.mmrChange),
            mmrChange: boostedChange,
          };
        });

      const atlantisFinal = applyHeroBonus(atlantisResults, "atlantis");
      const titansFinal = applyHeroBonus(titansResults, "titans");

      const { data: match, error } = await supabaseClient
        .from("matches")
        .insert({
          winner,
          win_condition: winCondition,
          atlantis_avg_mmr: result.meta.atlantisAvg,
          titans_avg_mmr: result.meta.titansAvg,
          atlantis_mmr_change: result.meta.atlantisDelta,
          titans_mmr_change: result.meta.titansDelta,
          expected_atlantis_win: result.meta.expectedA,
          draft_method: draftMethod,
          starting_wave_counter: startingWaveCounter
            ? Number(startingWaveCounter)
            : null,
          starting_life_counter: startingLifeCounter
            ? Number(startingLifeCounter)
            : null,
          wave_counter_remaining_1: waveCounterRemaining1
            ? Number(waveCounterRemaining1)
            : null,
          wave_counter_remaining_2:
            twoWaveLanes && waveCounterRemaining2
              ? Number(waveCounterRemaining2)
              : null,
          atlantis_life_counter: atlantisLifeCounter
            ? Number(atlantisLifeCounter)
            : null,
          titans_life_counter: titansLifeCounter
            ? Number(titansLifeCounter)
            : null,
        })
        .select("id, match_number")
        .single();

      if (error) throw error;

      const newMatchNumber = match.match_number;
      const matchParticipantIds = new Set([
        ...atlantisFinal.map((p) => p.id),
        ...titansFinal.map((p) => p.id),
      ]);
      const teamByPlayerId = new Map<string, Team>([
        ...atlantis.map((e): [string, Team] => [e.player.id, "atlantis"]),
        ...titans.map((e): [string, Team] => [e.player.id, "titans"]),
      ]);

      // Optional — only present when the user opted into the /matches/timer
      // clock from /teams rather than skipping straight to this page.
      let timerLog: Record<string, number> = {};
      try {
        const timerLogRaw = sessionStorage.getItem(TIMER_LOG_STORAGE_KEY);
        if (timerLogRaw) timerLog = JSON.parse(timerLogRaw) as Record<string, number>;
      } catch {
        // Corrupt/stale entry — ignore, action times just come back null.
      }

      // Denormalize match_number onto every match_player row
      const matchPlayers = [
        ...atlantisFinal.map((p) => {
          const heroId = heroIdFor(p.id, "atlantis");
          return {
            match_id: match.id,
            match_number: newMatchNumber,
            player_id: p.id,
            team: "atlantis",
            mmr_before: atlPlayers.find((x) => x.id === p.id)?.mmr,
            mmr_after: p.newMmr,
            hero_id: heroId,
            is_bounty: heroId ? bountyHeroIds.has(heroId) : false,
            action_time_seconds: timerLog[p.id] ?? null,
          };
        }),
        ...titansFinal.map((p) => {
          const heroId = heroIdFor(p.id, "titans");
          return {
            match_id: match.id,
            match_number: newMatchNumber,
            player_id: p.id,
            team: "titans",
            mmr_before: titPlayers.find((x) => x.id === p.id)?.mmr,
            mmr_after: p.newMmr,
            hero_id: heroId,
            is_bounty: heroId ? bountyHeroIds.has(heroId) : false,
            action_time_seconds: timerLog[p.id] ?? null,
          };
        }),
      ];

      const { error: mpError } = await supabaseClient
        .from("match_players")
        .insert(matchPlayers);
      if (mpError) throw mpError;
      sessionStorage.removeItem(TIMER_LOG_STORAGE_KEY);

// Combine updated match participants with non-participating players
      const updatedParticipantsMap = new Map(
        [...atlantisFinal, ...titansFinal].map((p) => [
          p.id,
          Math.round(p.newMmr),
        ]),
      );

      const allPlayersPostMatch = players.map((p) => {
        const isParticipant = matchParticipantIds.has(p.id);
        const postMatchMmr = updatedParticipantsMap.get(p.id) ?? p.mmr;
        return {
          ...p,
          postMatchMmr,
          lostMmr: isParticipant && postMatchMmr < p.mmr,
          last_played_match_number: isParticipant
            ? newMatchNumber
            : (p.last_played_match_number ?? 0),
          isParticipant,
        };
      });

      // Baseline order = current standings (existing rank), so protection
      // is evaluated against who was actually ranked above whom.
      const workingOrder = [...allPlayersPostMatch].sort((a, b) => {
        const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
        const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return b.postMatchMmr - a.postMatchMmr;
      });

      // Best (lowest) pre-match rank on the losing side of this match —
      // winning against a team that included this player proves the
      // winners beat someone ranked at least that high.
      const losingPool =
        winner === "atlantis" ? titans : winner === "titans" ? atlantis : [];
      const losingTeamBestRank = losingPool.reduce<number | undefined>(
        (best, e) =>
          best === undefined || e.player.rank < best ? e.player.rank : best,
        undefined,
      );

      // Player A can overtake player B only if A's post-match MMR is higher
      // AND either: A's team won this match against a losing side that
      // included someone ranked at least as high as B (B doesn't need to
      // have played, or even be on the losing team — a teammate of A works
      // too); or A sat out this match while B played it and lost MMR; or B
      // has been inactive for at least INACTIVE_GAME_THRESHOLD games.
      const canOvertake = (
        a: (typeof workingOrder)[number],
        b: (typeof workingOrder)[number],
      ) => {
        if (a.postMatchMmr <= b.postMatchMmr) return false;

        const aBeatSomeoneAboveB =
          a.isParticipant &&
          winner !== "none" &&
          teamByPlayerId.get(a.id) === winner &&
          losingTeamBestRank !== undefined &&
          losingTeamBestRank <= b.rank;
        const aSatOutBLost = !a.isParticipant && b.isParticipant && b.lostMmr;
        const bInactive =
          newMatchNumber > 0 &&
          b.last_played_match_number <= newMatchNumber - INACTIVE_GAME_THRESHOLD;

        return aBeatSomeoneAboveB || aSatOutBLost || bInactive;
      };

      // Let each player climb past the player directly above them in the
      // working order for as long as the overtake rule permits it.
      for (let i = 1; i < workingOrder.length; i++) {
        let j = i;
        while (j > 0 && canOvertake(workingOrder[j], workingOrder[j - 1])) {
          [workingOrder[j - 1], workingOrder[j]] = [
            workingOrder[j],
            workingOrder[j - 1],
          ];
          j--;
        }
      }

      const computedRanks = new Map<string, number>(
        workingOrder.map((p, idx) => [p.id, idx + 1]),
      );

      // Pass 1: Temporarily clear ranks to prevent Supabase 409 Unique Constraint errors
      await supabaseClient
        .from("players")
        .update({ rank: null })
        .in("id", allPlayersPostMatch.map((p) => p.id));

      // Pass 2: Update final MMR, last_played_match_number, and computed ranks
      await Promise.all(
        allPlayersPostMatch.map((p) =>
          supabaseClient
            .from("players")
            .update({
              mmr: p.postMatchMmr,
              rank: computedRanks.get(p.id),
              last_played_match_number: p.last_played_match_number,
            })
            .eq("id", p.id),
        ),
      );

      // Refresh the co-played materialized view so protected ranking is current
      await supabaseClient.rpc("refresh_player_co_played");

      showToast("Victory inscribed in the archives");
      setAtlantis([]);
      setTitans([]);
      setWinner("");
      setAtlantisLifeCounter("");
      setTitansLifeCounter("");
      setWaveCounterRemaining1("");
      setWaveCounterRemaining2("");
      setStartingWaveCounter("");
      setStartingLifeCounter("");
      sessionStorage.removeItem(TEAMS_DRAFT_STORAGE_KEY);

      if (newlyEarnedBadges.length > 0) {
        // Redirect is deferred to the overlay's dismissal instead of firing
        // on a timer, so the celebration isn't cut off mid-animation.
        setEarnedBadges(newlyEarnedBadges);
      } else {
        setTimeout(() => {
          router.push("/matches");
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to save match", err);
      showToast("✦ Record cannot be saved. Try again.", true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="goa-root goa-bg goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <Swords size={30} />
          </div>
          <p className="goa-loading-text xl">Loading existing players…</p>
        </div>
      </div>
    );
  }

  const canSave = winner && atlantis.length > 0 && titans.length > 0;

  return (
    <div className="goa-root goa-bg">
      {/* Header */}
      <header className="goa-header">
        <h1 className="goa-title">Record of Battle</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Atlantis */}
      <div className="goa-section">
        <div className="goa-section-header atlantis-header">
          <h2 className="goa-section-title">Atlantis</h2>
        </div>
        <div className="goa-search-wrap">
          <input
            className="goa-search"
            placeholder="Summon an Atlantean…"
            value={atlantisSearch}
            onChange={(e) => setAtlantisSearch(e.target.value)}
          />
        </div>
        {atlantisSearch && (
          <div className="goa-splitter-dropdown">
            {filterPlayers(availablePlayers, atlantisSearch).map((p) => (
              <button
                key={p.id}
                className="goa-battle-option"
                onClick={() => addPlayer(p.name, "atlantis")}
              >
                <Swords size={14} className="inline-block align-text-bottom" />{" "}
                {p.name}
              </button>
            ))}
            {filterPlayers(availablePlayers, atlantisSearch).length === 0 && (
              <button
                className="goa-battle-option goa-battle-option-new"
                onClick={() => addPlayer(atlantisSearch, "atlantis")}
              >
                ✦ Recruit &quot;{atlantisSearch}&quot;
              </button>
            )}
          </div>
        )}
        <div className="goa-players">
          {atlantis.length === 0 && (
            <p className="empty-state">No Atlanteans assembled</p>
          )}
          {atlantis.map((p) => (
            <div key={p.player.id} className="goa-player-block">
              <div key={p.player.id} className="goa-player-row">
                <span className="goa-player-name">
                  <PlayerAvatar
                    avatarUrl={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                  />
                  {p.player.name}
                  {p.player.mmr && (
                    <span className="goa-player-mmr">{p.player.mmr}</span>
                  )}
                </span>
                <button
                  className="goa-remove"
                  onClick={() => removePlayer(p.player.id, "atlantis")}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <HeroPicker
                selected={p.hero}
                onSelect={(h) => setHero(p.player.id, "atlantis", h)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Titans */}
      <div className="goa-section">
        <div className="goa-section-header titans-header">
          <h2 className="goa-section-title">Titans</h2>
        </div>
        <div className="goa-search-wrap">
          <input
            className="goa-search"
            placeholder="Summon a Titan…"
            value={titansSearch}
            onChange={(e) => setTitansSearch(e.target.value)}
          />
        </div>
        {titansSearch && (
          <div className="goa-splitter-dropdown">
            {filterPlayers(availablePlayers, titansSearch).map((p) => (
              <button
                key={p.id}
                className="goa-battle-option"
                onClick={() => addPlayer(p.name, "titans")}
              >
                <Swords size={14} className="inline-block align-text-bottom" />{" "}
                {p.name}
              </button>
            ))}
            {filterPlayers(availablePlayers, titansSearch).length === 0 && (
              <button
                className="goa-battle-option goa-battle-option-new"
                onClick={() => addPlayer(titansSearch, "titans")}
              >
                ✦ Recruit &quot;{titansSearch}&quot;
              </button>
            )}
          </div>
        )}
        <div className="goa-players">
          {titans.length === 0 && (
            <p className="empty-state">No Titans assembled</p>
          )}
          {titans.map((p) => (
            <div key={p.player.id} className="goa-player-block">
              <div className="goa-player-row">
                <span className="goa-player-name">
                  <PlayerAvatar
                    avatarUrl={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                  />
                  {p.player.name}
                  {p.player.mmr && (
                    <span className="goa-player-mmr">{p.player.mmr}</span>
                  )}
                </span>
                <button
                  className="goa-remove"
                  onClick={() => removePlayer(p.player.id, "titans")}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="goa-hero-wrap">
                <HeroPicker
                  selected={p.hero}
                  onSelect={(h) => setHero(p.player.id, "titans", h)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Remaining counters — wave counter is shared by both teams (not
          per-team), life counter is per-team, so they're grouped together
          in one place instead of wave living alone and life being buried
          inside each team's roster. No heading — each field's own label
          carries the context. */}
      <div className="goa-card">
        <div className="goa-game-settings">
          <div className={`goa-counter-field${twoWaveLanes ? "" : " full"}`}>
            <label className="goa-counter-label">
              <Image
                src="/icons/wave_counters.png"
                alt=""
                width={14}
                height={14}
                className="goa-label-icon"
              />
              {twoWaveLanes ? "Lane 1 Wave Counter(s) Remaining" : "Wave Counter(s) Remaining"}
            </label>
            <select
              className="goa-select"
              value={waveCounterRemaining1}
              onChange={(e) => setWaveCounterRemaining1(e.target.value)}
            >
              <option value="">—</option>
              {zeroToMax(maxWaveCounter).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {twoWaveLanes && (
            <div className="goa-counter-field">
              <label className="goa-counter-label">
                <Image
                  src="/icons/wave_counters.png"
                  alt=""
                  width={14}
                  height={14}
                  className="goa-label-icon"
                />
                Lane 2 Wave Counter(s) Remaining
              </label>
              <select
                className="goa-select"
                value={waveCounterRemaining2}
                onChange={(e) => setWaveCounterRemaining2(e.target.value)}
              >
                <option value="">—</option>
                {zeroToMax(maxWaveCounter).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="goa-counter-field">
            <label className="goa-counter-label atl">
              <Image
                src="/icons/life_counter_orange_front.png"
                alt=""
                width={14}
                height={14}
                className="goa-label-icon"
              />
              Atlantis Life Counter(s) Remaining
            </label>
            <select
              className="goa-select"
              value={atlantisLifeCounter}
              onChange={(e) => handleAtlantisLifeChange(e.target.value)}
            >
              <option value="">—</option>
              {zeroToMax(maxLifeCounter).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="goa-counter-field">
            <label className="goa-counter-label tit">
              <Image
                src="/icons/life_counter_blue_front.png"
                alt=""
                width={14}
                height={14}
                className="goa-label-icon"
              />
              Titans Life Counter(s) Remaining
            </label>
            <select
              className="goa-select"
              value={titansLifeCounter}
              onChange={(e) => handleTitansLifeChange(e.target.value)}
            >
              <option value="">—</option>
              {zeroToMax(maxLifeCounter).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Winner */}
      <p className="winner-label">Declare the victor</p>
      <div className="goa-winner-section">
        <button
          className={`goa-faction-btn goa-faction-btn-a ${winner === "atlantis" ? "selected" : ""}`}
          onClick={() => {
            setWinner(winner === "atlantis" ? "" : "atlantis");
          }}
        >
          <span className="goa-faction-label">Atlantis</span>
        </button>
        <button
          className={`goa-faction-btn goa-faction-btn-t ${winner === "titans" ? "selected" : ""}`}
          onClick={() => {
            setWinner(winner === "titans" ? "" : "titans");
          }}
        >
          <span className="goa-faction-label">Titans</span>
        </button>
        <button
          className={`goa-faction-btn goa-faction-btn-d ${winner === "none" ? "selected" : ""}`}
          onClick={() => {
            setWinner(winner === "none" ? "" : "none");
            setWinCondition(null);
          }}
        >
          <span className="goa-faction-label">Draw</span>
        </button>
      </div>

      {/* Win condition */}
      <p className="winner-label">Victory Condition</p>
      <div className="goa-win-condition-section">
        <button
          disabled={winner === "none"}
          className={`goa-win-condition-btn ${winCondition === WinCondition.THRONE ? "selected" : ""}`}
          onClick={() =>
            setWinCondition(
              winCondition === WinCondition.THRONE ? null : WinCondition.THRONE,
            )
          }
        >
          <span className="goa-faction-label">Throne</span>
        </button>
        <button
          disabled={winner === "none"}
          className={`goa-win-condition-btn ${winCondition === WinCondition.LAST_PUSH ? "selected" : ""}`}
          onClick={() =>
            setWinCondition(
              winCondition === WinCondition.LAST_PUSH
                ? null
                : WinCondition.LAST_PUSH,
            )
          }
        >
          <span className="goa-faction-label">Last Push</span>
        </button>
        <button
          disabled={winner === "none"}
          className={`goa-win-condition-btn ${winCondition === WinCondition.LIFE_COUNTER ? "selected" : ""}`}
          onClick={() =>
            setWinCondition(
              winCondition === WinCondition.LIFE_COUNTER
                ? null
                : WinCondition.LIFE_COUNTER,
            )
          }
        >
          <span className="goa-faction-label">Life Counter</span>
        </button>
      </div>

      <div className="goa-divider" />

      {/* Save */}
      <div className="goa-btn-wrap">
        <button
          className="goa-btn inline-flex items-center justify-center gap-2"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? (
            "✦ Inscribing…"
          ) : (
            <>
              <Swords size={18} />
              Inscribe to the Archives
            </>
          )}
        </button>
      </div>

      {toast && (
        <div className={`goa-toast${toastError ? " error" : ""}`}>{toast}</div>
      )}

      {earnedBadges.length > 0 && (
        <BadgeEarnedOverlay
          badges={earnedBadges}
          onDone={() => {
            setEarnedBadges([]);
            router.push("/matches");
          }}
        />
      )}
    </div>
  );
}

export default function NewMatchPage() {
  return (
    <PasswordGate>
      <NewMatchPageInner />
    </PasswordGate>
  );
}