import { HEROES, DIFFICULTY_COLORS, Hero, HeroDifficulty } from "@/lib/heroes";
import { useState } from "react";

export function HeroPicker({
  selected,
  onSelect,
}: {
  selected: Hero | null;
  onSelect: (h: Hero | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<HeroDifficulty | "All">("All");

  const filtered =
    difficultyFilter === "All" ? HEROES : HEROES.filter((h) => h.difficulty === difficultyFilter);

  const renderStars = (n: number) => "★".repeat(n);

  if (!open) {
    return (
      <div className="goa-hero-picker">
        <div className="goa-hero-picker-label">Hero played</div>
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="goa-selected-hero">
              {selected.name}
              <span
                className="goa-hero-chip-role"
              >
                {renderStars(parseInt(selected.difficulty))}
              </span>
            </span>
            <button className="goa-change-hero" onClick={() => setOpen(true)}>
              Change
            </button>
          </div>
        ) : (
          <button
            className="goa-hero-chip"
            onClick={() => setOpen(true)}
            style={{ fontSize: "0.82rem", padding: "0.28rem 0.6rem" }}
          >
            + Select hero
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="goa-hero-picker">
      <div className="goa-hero-picker-label">
        Select hero
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontFamily: "'Cinzel', serif",
            fontSize: "0.55rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginLeft: "0.75rem",
            textDecoration: "underline",
          }}
        >
          Cancel
        </button>
      </div>

      {/* Role filter */}
      <div className="goa-role-bar">
        {["All", ...Object.keys(DIFFICULTY_COLORS)].map((r) => (
          <button
            key={r}
            className={`goa-role-chip ${difficultyFilter === r ? "active" : ""}`}
            onClick={() => setDifficultyFilter(r as HeroDifficulty | "All")}
          >
            {renderStars(parseInt(r)) || "All"}
          </button>
        ))}
      </div>

      {/* Hero chips */}
      <div className="goa-hero-grid">
        {filtered.map((h) => (
          <button
            key={h.id}
            className={`goa-hero-chip ${selected?.id === h.id ? "selected" : ""}`}
            onClick={() => { onSelect(h); setOpen(false); }}
          >
            <span>{h.name}</span>
            <span
              className="goa-hero-chip-role"
              style={{ background: DIFFICULTY_COLORS[h.difficulty] + "33", color: DIFFICULTY_COLORS[h.difficulty] }}
            >
              {renderStars(parseInt(h.difficulty))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}