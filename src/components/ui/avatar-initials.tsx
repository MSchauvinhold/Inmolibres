interface AvatarInitialsProps {
  name: string;
  size?: number;
  bg?: string;
  fg?: string;
  className?: string;
}

export function AvatarInitials({
  name,
  size = 32,
  bg = "var(--terracota-500, #C1694F)",
  fg = "#fff",
  className,
}: AvatarInitialsProps) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-fraunces-display), Georgia, serif",
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initial}
    </span>
  );
}
