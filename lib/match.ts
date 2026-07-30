import { HEROES } from "@/lib/heroes";

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

export const renderStars = (n: number | string | undefined | null) =>
  "★".repeat(Number(n) || 0);

export const getHero = (heroId?: string | null) =>
  HEROES.find((h) => h.id === heroId);

// Draws award a win to both sides rather than a loss to either.
export const didWin = (team: string, winner: string) =>
  team === winner || winner === "none";
