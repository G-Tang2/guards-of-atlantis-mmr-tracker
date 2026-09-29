// The read-only side of a shared Battle Board sequence (see
// app/board/sequence/[id]) — renders one step's worth of tokens over the
// map's own photo/grid, reusing HexBoard's own piece art, team colors, and
// per-map grid geometry so a shared plan looks identical to the board it
// was built on. Deliberately much smaller than HexBoard itself: no
// dragging, no palette, no pinch/zoom — just the board, as a picture, plus
// (via HeroDrawer below) a tap-to-view for a placed hero's own cards,
// since a viewer following along still wants to check what a hero's
// abilities actually do.
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { HEROES } from "@/lib/heroes";
import { HERO_CARDS } from "@/lib/heroCards";
import { HeroActionCard } from "@/components/HeroActionCard";
import { IMAGE_WIDTH, IMAGE_HEIGHT, createHexGrid } from "@/lib/hexGrid";
import { MAPS, PlacedToken, PieceThumb, resolvePieceVisual, MINION_TEAMS } from "@/components/HexBoard";

export function BoardSequenceViewer({
  mapId,
  tokens,
  showGrid,
}: {
  mapId: string;
  tokens: PlacedToken[];
  showGrid: boolean;
}) {
  const map = MAPS.find((m) => m.id === mapId) ?? MAPS[0];
  // Memoized like HexBoard's own — createHexGrid does a full pass over
  // every cell to compute its bounds.
  const grid = useMemo(() => createHexGrid(map.gridCols, map.gridRows), [map.gridCols, map.gridRows]);
  const [openHeroId, setOpenHeroId] = useState<string | null>(null);
  const [enlargedCardIndex, setEnlargedCardIndex] = useState<number | null>(null);

  return (
    <>
      <div className="goa-board-wrap" style={{ aspectRatio: `${IMAGE_WIDTH} / ${IMAGE_HEIGHT}` }}>
        <div className="goa-board-frame">
          <Image
            key={map.id}
            src={map.image}
            alt={`Guards of Atlantis II battle board — ${map.label}`}
            fill
            className="goa-board-bg-img"
            sizes="(max-width: 480px) 100vw, 480px"
            priority
          />
          <div className="goa-board-grid-frame">
            <div
              className="goa-board-grid-rotate"
              style={{
                transform: `translate(${map.gridOffsetX}%, ${map.gridOffsetY}%) rotate(${map.gridRotationDeg}deg) scale(${map.gridCoverScale})`,
              }}
            >
              <svg
                viewBox={`0 0 ${grid.boardWidth} ${grid.boardHeight}`}
                className="goa-board-svg"
                preserveAspectRatio="none"
                style={{ opacity: showGrid ? 1 : 0 }}
              >
                {grid.allCells.map(({ col, row }) => {
                  const { x, y } = grid.hexCenter(col, row);
                  return <polygon key={`${col}-${row}`} points={grid.hexPoints(x, y)} className="goa-board-hex" />;
                })}
              </svg>

              {tokens.map((t) => {
                const visual = resolvePieceVisual(t.pieceId);
                if (!visual) return null;
                const { x, y } = grid.hexCenter(t.col, t.row);
                const ringColor = MINION_TEAMS.find((team) => team.team === t.team)?.color;
                return (
                  <div
                    key={t.id}
                    className={`goa-board-token${visual.hero ? " clickable" : ""}`}
                    style={{
                      left: `${(x / grid.boardWidth) * 100}%`,
                      top: `${(y / grid.boardHeight) * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${-map.gridRotationDeg}deg) scale(${1 / map.gridCoverScale})`,
                    }}
                    onClick={() => visual.hero && setOpenHeroId((prev) => (prev === t.pieceId ? null : t.pieceId))}
                  >
                    <PieceThumb pieceId={t.pieceId} size={15} className="goa-board-token-img" ringColor={ringColor} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {openHeroId &&
        (() => {
          const hero = HEROES.find((h) => h.id === openHeroId);
          if (!hero) return null;
          const cards = HERO_CARDS[openHeroId] ?? [];
          return (
            <div className="goa-board-drawer">
              <div className="goa-board-drawer-header">
                <span className="goa-board-drawer-title">{hero.name}</span>
                <button
                  type="button"
                  className="goa-board-drawer-close"
                  onClick={() => {
                    setOpenHeroId(null);
                    setEnlargedCardIndex(null);
                  }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="goa-board-drawer-cards">
                {cards.map((card, i) => (
                  <button
                    key={i}
                    type="button"
                    className="goa-board-drawer-card-btn"
                    onClick={() => setEnlargedCardIndex(i)}
                    aria-label={`Enlarge ${typeof card.name === "string" ? card.name : "card"}`}
                  >
                    <HeroActionCard heroId={openHeroId} card={card} className="goa-board-drawer-card" />
                  </button>
                ))}
              </div>
              {enlargedCardIndex !== null && cards[enlargedCardIndex] && (
                <div className="goa-board-card-lightbox" onClick={() => setEnlargedCardIndex(null)}>
                  <HeroActionCard
                    heroId={openHeroId}
                    card={cards[enlargedCardIndex]}
                    className="goa-board-card-lightbox-img"
                  />
                </div>
              )}
            </div>
          );
        })()}
    </>
  );
}
