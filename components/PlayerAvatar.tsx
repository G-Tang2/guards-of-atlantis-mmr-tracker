"use client";

import { CSSProperties } from "react";

type Props = {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  borderColor?: string;
};

export function PlayerAvatar({
  avatarUrl,
  name,
  size = 28,
  borderColor,
}: Props) {
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const vars = {
    "--avatar-size": `${size}px`,
    "--avatar-border-width": `${size >= 48 ? 2 : 1.5}px`,
    "--avatar-font-size": `${Math.round(size * 0.38)}px`,
    ...(borderColor ? { "--avatar-ring": borderColor } : {}),
  } as CSSProperties;

  if (avatarUrl) {
    return (
      <span className="goa-avatar" style={vars}>
        <img src={avatarUrl} alt={name} className="goa-avatar-img" />
      </span>
    );
  }

  return (
    <span className="goa-avatar goa-avatar-initials" style={vars}>
      {initials}
    </span>
  );
}
