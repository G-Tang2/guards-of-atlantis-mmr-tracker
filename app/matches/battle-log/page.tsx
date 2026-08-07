"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PasswordGate } from "@/components/PasswordGate";
import { Stepper } from "@/components/Stepper";
import { TEAMS_DRAFT_STORAGE_KEY } from "@/lib/teamsDraft";
import {
  BATTLE_LOG_STORAGE_KEY,
  ROUND_STAT_KEYS,
  ROUND_STAT_LABELS,
  ROUND_STAT_ICONS,
  RoundStatKey,
  Round,
  emptyRoundStats,
} from "@/lib/battleLog";
import { ScrollText, Plus, Swords, X, AlertTriangle, ChevronDown } from "lucide-react";

type Player = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

const buildStatsForPlayers = (ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, emptyRoundStats()]));

function BattleLogPageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [atlantis, setAtlantis] = useState<Player[]>([]);
  const [titans, setTitans] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [confirmDeleteRound, setConfirmDeleteRound] = useState(false);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const raw = sessionStorage.getItem(TEAMS_DRAFT_STORAGE_KEY);
      if (!raw) {
        router.replace("/teams");
        return;
      }

      try {
        const saved = JSON.parse(raw) as {
          atlantis: string[];
          titans: string[];
        };
        if (saved.atlantis.length === 0 || saved.titans.length === 0) {
          router.replace("/teams");
          return;
        }

        const { data, error } = await supabaseClient
          .from("players")
          .select("id, name, avatar_url")
          .in("id", [...saved.atlantis, ...saved.titans]);

        if (error || !data) {
          router.replace("/teams");
          return;
        }

        const byId = new Map<string, Player>(data.map((p) => [p.id, p]));
        const atlantisPlayers = saved.atlantis
          .map((id) => byId.get(id))
          .filter((p): p is Player => !!p);
        const titansPlayers = saved.titans
          .map((id) => byId.get(id))
          .filter((p): p is Player => !!p);

        setAtlantis(atlantisPlayers);
        setTitans(titansPlayers);
        setRounds([
          {
            roundNumber: 1,
            stats: buildStatsForPlayers([
              ...atlantisPlayers.map((p) => p.id),
              ...titansPlayers.map((p) => p.id),
            ]),
          },
        ]);
      } catch {
        router.replace("/teams");
        return;
      }

      setLoading(false);
    };
    load();
  }, [router]);

  const setStat = (
    playerId: string,
    key: RoundStatKey,
    value: number,
  ) => {
    setRounds((prev) =>
      prev.map((round, i) =>
        i !== activeRoundIndex
          ? round
          : {
              ...round,
              stats: {
                ...round.stats,
                [playerId]: { ...round.stats[playerId], [key]: value },
              },
            },
      ),
    );
  };

  const addRound = () => {
    const allIds = [...atlantis, ...titans].map((p) => p.id);
    setRounds((prev) => [
      ...prev,
      { roundNumber: prev.length + 1, stats: buildStatsForPlayers(allIds) },
    ]);
    setActiveRoundIndex(rounds.length);
  };

  // Only the most recently added round can be removed — earlier rounds are
  // locked in once a later one exists, so there's never a renumbering gap.
  // Always keeps at least one round.
  const removeLastRound = () => {
    if (rounds.length <= 1) return;
    setRounds((prev) => prev.slice(0, -1));
    setActiveRoundIndex((prev) => Math.min(prev, rounds.length - 2));
    setConfirmDeleteRound(false);
  };

  const togglePlayer = (playerId: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleContinue = () => {
    sessionStorage.setItem(
      BATTLE_LOG_STORAGE_KEY,
      JSON.stringify({ rounds }),
    );
    router.push("/matches/new");
  };

  if (loading) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <ScrollText size={32} />
          </div>
          <p className="goa-loading-text">Preparing the battle log…</p>
        </div>
      </div>
    );
  }

  const activeRound = rounds[activeRoundIndex];

  const hasRoundData = (round: Round) =>
    Object.values(round.stats).some((playerStats) =>
      Object.values(playerStats).some((v) => v > 0),
    );

  const renderTeam = (label: string, labelClass: "atl" | "tit", team: Player[]) => (
    <div className="goa-section">
      <div className={`goa-section-header ${labelClass === "atl" ? "atlantis-header" : "titans-header"}`}>
        <h2 className="goa-section-title">{label}</h2>
      </div>
      <div className="goa-players">
        {team.map((player) => {
          const stats = activeRound.stats[player.id] ?? emptyRoundStats();
          const expanded = expandedPlayers.has(player.id);
          return (
            <div key={player.id} className="goa-player-block">
              <div
                className="goa-player-row clickable"
                onClick={() => togglePlayer(player.id)}
              >
                <span className="goa-player-name">
                  <PlayerAvatar avatarUrl={player.avatar_url} name={player.name} size={22} />
                  {player.name}
                </span>
                <ChevronDown
                  size={15}
                  className={`goa-player-chevron${expanded ? " open" : ""}`}
                />
              </div>
              {!expanded && (
                <div className="goa-player-summary">
                  {ROUND_STAT_KEYS.map((key) => {
                    const Icon = ROUND_STAT_ICONS[key];
                    const value = stats[key];
                    return (
                      <span
                        key={key}
                        className={`goa-player-summary-item${value > 0 ? " active" : ""}`}
                        title={ROUND_STAT_LABELS[key]}
                      >
                        <Icon size={12} />
                        {value}
                      </span>
                    );
                  })}
                </div>
              )}
              {expanded && (
                <div className="goa-stepper-grid">
                  {ROUND_STAT_KEYS.map((key) => (
                    <Stepper
                      key={key}
                      compact
                      icon={ROUND_STAT_ICONS[key]}
                      label={ROUND_STAT_LABELS[key]}
                      value={stats[key]}
                      onChange={(v) => setStat(player.id, key, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <main className="goa-root">
      <header className="goa-header">
        <div className="goa-crown">
          <ScrollText size={30} />
        </div>
        <h1 className="goa-title">Battle Log</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      <div className="goa-round-tabs">
        {rounds.map((round, i) => (
          <div key={i} className="goa-round-tab-wrap">
            <button
              className={`goa-round-tab${i === activeRoundIndex ? " active" : ""}`}
              onClick={() => setActiveRoundIndex(i)}
            >
              Round {round.roundNumber}
            </button>
            {hasRoundData(round) && <span className="goa-round-tab-dot" />}
            {rounds.length > 1 && i === rounds.length - 1 && (
              <button
                className="goa-round-tab-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteRound(true);
                }}
                aria-label={`Remove round ${round.roundNumber}`}
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        <button
          className="goa-round-tab-add"
          onClick={addRound}
          aria-label="Add round"
        >
          <Plus size={16} />
        </button>
      </div>

      {confirmDeleteRound && (
        <div
          className="draft-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeleteRound(false);
          }}
        >
          <div className="draft-sheet">
            <div className="draft-head">
              <span className="draft-head-title inline-flex items-center gap-2">
                <AlertTriangle size={15} color="var(--loss)" />
                Delete Round {rounds.length}?
              </span>
              <button
                className="draft-close"
                onClick={() => setConfirmDeleteRound(false)}
              >
                ✕
              </button>
            </div>
            <div className="draft-body">
              <p className="draft-note" style={{ textAlign: "left" }}>
                This will permanently remove all recorded stats for Round{" "}
                {rounds.length}. This can&apos;t be undone.
              </p>
              <div className="goa-btn-wrap" style={{ margin: 0 }}>
                <button
                  className="goa-btn sm inline-flex items-center justify-center gap-2"
                  onClick={() => setConfirmDeleteRound(false)}
                >
                  Cancel
                </button>
              </div>
              <div className="goa-btn-wrap" style={{ margin: 0 }}>
                <button
                  className="goa-btn danger sm inline-flex items-center justify-center gap-2"
                  onClick={removeLastRound}
                >
                  <X size={15} />
                  Delete Round {rounds.length}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderTeam("Atlantis", "atl", atlantis)}
      {renderTeam("Titans", "tit", titans)}

      <div className="goa-btn-wrap">
        <button
          className="goa-btn inline-flex items-center justify-center gap-2"
          onClick={handleContinue}
        >
          <Swords size={18} />
          Continue to Record of Battle
        </button>
      </div>
    </main>
  );
}

export default function BattleLogPage() {
  return (
    <PasswordGate>
      <BattleLogPageInner />
    </PasswordGate>
  );
}
