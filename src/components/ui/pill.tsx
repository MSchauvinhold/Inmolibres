import { cn } from "@/lib/utils";

type PillTone =
  | "neutral"
  | "terra"
  | "dark"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "outline";

interface PillProps {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
  style?: React.CSSProperties;
}

const TONES: Record<PillTone, { bg: string; fg: string; border?: string }> = {
  neutral: { bg: "var(--crema-200, #ECE4D6)",    fg: "var(--antracita-700, #221E19)" },
  terra:   { bg: "var(--terracota-100, #F4D8C9)", fg: "var(--terracota-700, #7E3F26)" },
  dark:    { bg: "var(--antracita-700, #221E19)", fg: "var(--crema-50, #FBF8F2)" },
  accent:  { bg: "var(--il-accent-soft, #DEE5ED)",fg: "var(--il-accent-deep, #1B3149)" },
  success: { bg: "var(--success-100, #DCEAE0)",   fg: "var(--success-500, #4A7C59)" },
  danger:  { bg: "var(--danger-100, #F5DBD6)",    fg: "var(--danger-500, #B23A2D)" },
  warning: { bg: "var(--warning-100, #F4E4C5)",   fg: "var(--warning-500, #C58B2F)" },
  info:    { bg: "var(--info-100, #D7E3EB)",      fg: "var(--info-500, #3A6B89)" },
  outline: { bg: "transparent", fg: "var(--antracita-700, #221E19)", border: "var(--border-strong, #D6C8AF)" },
};

export function Pill({ children, tone = "neutral", className, style }: PillProps) {
  const t = TONES[tone];
  return (
    <span
      className={cn("il-pill", className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        background: t.bg,
        color: t.fg,
        border: t.border ? `1px solid ${t.border}` : "none",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
