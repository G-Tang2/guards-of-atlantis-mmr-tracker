"use client";

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

  const fontSize = Math.round(size * 0.38);
  const borderWidth = size >= 48 ? 2 : 1.5;
  const ring = borderColor ?? "rgba(201,151,58,0.6)";

  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: `${borderWidth}px solid ${ring}`,
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (avatarUrl) {
    return (
      <span style={base}>
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </span>
    );
  }

  return (
    <span
      style={{
        ...base,
        background: "linear-gradient(135deg, #3A3628, #2A2720)",
        fontFamily: "'Cinzel', serif",
        fontSize,
        fontWeight: 700,
        color: "#C9973A",
        letterSpacing: "0.03em",
        userSelect: "none",
      }}
    >
      {initials}
    </span>
  );
}
