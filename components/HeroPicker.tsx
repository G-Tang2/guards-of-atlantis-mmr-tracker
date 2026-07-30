import { HEROES, DIFFICULTY_COLORS, Hero, HeroComplexity } from "@/lib/heroes";
import { useState } from "react";
import Image from "next/image";
import { renderStars } from "@/lib/match";

export function HeroPicker({
  selected,
  onSelect,
}: {
  selected: Hero | null;
  onSelect: (h: Hero | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [complexityFilter, setComplexityFilter] = useState<
    HeroComplexity | "All"
  >("All");

  const sortedHeroes = [...HEROES].sort((a, b) => a.name.localeCompare(b.name));

  const filtered =
    complexityFilter === "All"
      ? sortedHeroes
      : sortedHeroes.filter((h) => h.complexity === complexityFilter);

  if (!open) {
    return (
      <div className="goa-hero-picker">
        <div className="goa-hero-picker-label">Hero played</div>
        {selected ? (
          <div className="goa-hero-picker-selected-row">
            <span className="goa-selected-hero">
              {selected.name}
              <span className="goa-hero-chip-role">
                {renderStars(selected.complexity)}
              </span>
            </span>
            <button className="goa-change-hero" onClick={() => setOpen(true)}>
              Change
            </button>
          </div>
        ) : (
          <button
            className="goa-hero-chip goa-hero-chip-add"
            onClick={() => setOpen(true)}
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
          className="goa-hero-picker-cancel"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>

      {/* Role filter */}
      <div className="goa-role-bar">
        {["All", ...Object.keys(DIFFICULTY_COLORS)].map((r) => (
          <button
            key={r}
            className={`goa-role-chip ${complexityFilter === r ? "active" : ""}`}
            onClick={() => setComplexityFilter(r as HeroComplexity | "All")}
          >
            {renderStars(r) || "All"}
          </button>
        ))}
      </div>

      {/* Hero chips */}
      <div className="goa-hero-grid">
        {filtered.map((h) => (
          <button
            key={h.id}
            className={`goa-hero-chip ${selected?.id === h.id ? "selected" : ""}`}
            onClick={() => {
              onSelect(h);
              setOpen(false);
            }}
          >
            <Image
              src={h.icon}
              alt={h.name}
              width={18}
              height={18}
              className="goa-hero-chip-icon"
            />
            <span>{h.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
