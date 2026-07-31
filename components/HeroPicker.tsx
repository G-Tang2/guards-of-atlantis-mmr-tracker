import { HEROES, Hero } from "@/lib/heroes";
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
  const [search, setSearch] = useState("");

  const sortedHeroes = [...HEROES].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = search
    ? sortedHeroes.filter((h) =>
        h.name.toLowerCase().includes(search.toLowerCase()),
      )
    : sortedHeroes;

  const closeAndReset = () => {
    setOpen(false);
    setSearch("");
  };

  if (!open) {
    return (
      <div className="goa-hero-picker">
        <div className="goa-hero-picker-label">Hero played</div>
        {selected ? (
          <div className="goa-hero-picker-selected-row">
            <span className="goa-selected-hero">
              <Image
                src={selected.icon}
                alt={selected.name}
                width={14}
                height={14}
                className="goa-selected-hero-icon"
              />
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
          onClick={closeAndReset}
        >
          Cancel
        </button>
      </div>

      <input
        className="goa-search goa-hero-search"
        placeholder="Search heroes…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div className="goa-hero-search-results">
        {filtered.map((h) => (
          <button
            key={h.id}
            className={`goa-hero-result ${selected?.id === h.id ? "selected" : ""}`}
            onClick={() => {
              onSelect(h);
              closeAndReset();
            }}
          >
            <Image
              src={h.icon}
              alt={h.name}
              width={22}
              height={22}
              className="goa-hero-chip-icon"
            />
            <span className="goa-hero-result-name">{h.name}</span>
            <span className="goa-hero-result-stars">
              {renderStars(h.complexity)}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="goa-pool-empty">No heroes found</p>
        )}
      </div>
    </div>
  );
}
