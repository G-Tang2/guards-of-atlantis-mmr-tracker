"use client";

import React, { useEffect, useState } from "react";

type Player = {
  id: string;
  name: string;
  mmr: number;
};

type Winner = "" | "atlantis" | "titans";
import { supabaseClient } from "@/lib/supabase/client";
import { calculateMMR } from "@/lib/mmr";

export default function NewMatchPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [atlantisSearch, setAtlantisSearch] = useState("");
  const [titansSearch, setTitansSearch] = useState("");
  const [atlantis, setAtlantis] = useState<Player[]>([]);
  const [titans, setTitans] = useState<Player[]>([]);
  const [winner, setWinner] = useState<Winner>("");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      const result = await supabaseClient
        .from("players")
        .select("*")
        .order("name");
      const { data, error } = await result;
      if (!error) setPlayers(data ?? []);
      setLoading(false);
    };
    loadPlayers();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const availablePlayers = players.filter(
    (p) =>
      !atlantis.some((a) => a.id === p.id) &&
      !titans.some((t) => t.id === p.id),
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

  const addPlayer = async (name: string, team: "atlantis" | "titans") => {
    if (!name.trim()) return;
    const player = await upsertPlayer(name.trim());
    if (team === "atlantis") {
      setAtlantis((prev) =>
        prev.find((p) => p.id === player.id) ? prev : [...prev, player],
      );
      setAtlantisSearch("");
    } else {
      setTitans((prev) =>
        prev.find((p) => p.id === player.id) ? prev : [...prev, player],
      );
      setTitansSearch("");
    }
    setPlayers((prev) =>
      prev.find((p) => p.id === player.id) ? prev : [...prev, player],
    );
  };

  const removePlayer = (id: string, team: "atlantis" | "titans") => {
    if (team === "atlantis")
      setAtlantis((prev) => prev.filter((p) => p.id !== id));
    else setTitans((prev) => prev.filter((p) => p.id !== id));
  };

  const filterPlayers = (list: Player[], query: string): Player[] =>
    list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const handleSave = async () => {
    if (!winner || atlantis.length === 0 || titans.length === 0 || saving)
      return;
    setSaving(true);
    try {
      const result = calculateMMR(atlantis, titans, winner);
      const matchRes = await supabaseClient
        .from("matches")
        .insert({
          winner,
          atlantis_avg_mmr: result.meta.atlantisAvg,
          titans_avg_mmr: result.meta.titansAvg,
          atlantis_mmr_change: result.meta.atlantisDelta,
          titans_mmr_change: result.meta.titansDelta,
          expected_atlantis_win: result.meta.expectedA,
        })
        .select()
        .single();
      const { data: match, error } = await matchRes;
      if (error) throw error;

      const matchPlayers = [
        ...result.atlantis.map((p) => ({
          match_id: match.id,
          player_id: p.id,
          team: "atlantis",
          mmr_before: atlantis.find((x) => x.id === p.id)?.mmr,
          mmr_after: p.newmmr,
        })),
        ...result.titans.map((p) => ({
          match_id: match.id,
          player_id: p.id,
          team: "titans",
          mmr_before: titans.find((x) => x.id === p.id)?.mmr,
          mmr_after: p.newmmr,
        })),
      ];
      await supabaseClient.from("match_players").insert(matchPlayers);
      await Promise.all(
        [...result.atlantis, ...result.titans].map((p) =>
          supabaseClient
            .from("players")
            .update({ mmr: Math.round(p.newmmr) })
            .eq("id", p.id),
        ),
      );

      showToast("⚔ Victory inscribed in the archives");
      setAtlantis([]);
      setTitans([]);
      setWinner("");
    } catch (e) {
      showToast("✦ An error darkened the records");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="goa-root goa-bg"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚔️</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.8rem",
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Loading existing players…
          </p>
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
          <div className="goa-dropdown">
            {filterPlayers(availablePlayers, atlantisSearch).map((p) => (
              <button
                key={p.id}
                className="goa-option"
                onClick={() => addPlayer(p.name, "atlantis")}
              >
                ⚔ {p.name}
              </button>
            ))}
            {filterPlayers(availablePlayers, atlantisSearch).length === 0 && (
              <button
                className="goa-option goa-option-new"
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
            <div key={p.id} className="goa-player-row">
              <span className="goa-player-name">
                <span
                  style={{
                    color: "var(--atlantis-light)",
                    fontSize: "0.75rem",
                  }}
                >
                  ◆
                </span>
                {p.name}
                {p.mmr && <span className="goa-player-mmr">{p.mmr}</span>}
              </span>
              <button
                className="goa-remove"
                onClick={() => removePlayer(p.id, "atlantis")}
                aria-label="Remove"
              >
                ✕
              </button>
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
          <div className="goa-dropdown">
            {filterPlayers(availablePlayers, titansSearch).map((p) => (
              <button
                key={p.id}
                className="goa-option"
                onClick={() => addPlayer(p.name, "titans")}
              >
                ⚔ {p.name}
              </button>
            ))}
            {filterPlayers(availablePlayers, titansSearch).length === 0 && (
              <button
                className="goa-option goa-option-new"
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
            <div key={p.id} className="goa-player-row">
              <span className="goa-player-name">
                <span
                  style={{ color: "var(--titans-light)", fontSize: "0.75rem" }}
                >
                  ◆
                </span>
                {p.name}
                {p.mmr && <span className="goa-player-mmr">{p.mmr}</span>}
              </span>
              <button
                className="goa-remove"
                onClick={() => removePlayer(p.id, "titans")}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Winner */}
      <p className="winner-label">Declare the victor</p>
      <div className="goa-winner-section">
        <button
          className={`goa-faction-btn goa-faction-btn-a ${winner === "atlantis" ? "selected" : ""}`}
          onClick={() => setWinner(winner === "atlantis" ? "" : "atlantis")}
        >
          <span className="goa-faction-label">Atlantis</span>
        </button>
        <button
          className={`goa-faction-btn goa-faction-btn-t ${winner === "titans" ? "selected" : ""}`}
          onClick={() => setWinner(winner === "titans" ? "" : "titans")}
        >
          <span className="goa-faction-label">Titans</span>
        </button>
      </div>

      <div className="goa-divider" />

      {/* Save */}
      <div className="goa-save-wrap">
        <button
          className="goa-save-btn"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? "✦ Inscribing…" : "⚔ Inscribe to the Archives"}
        </button>
      </div>

      {toast && <div className="goa-toast">{toast}</div>}
    </div>
  );
}
