"use client";

interface InmoRow {
  id: string;
  nombre: string;
  estado: string;
  createdAt: string;
}

interface Props {
  inmobiliarias: InmoRow[];
}

// Static monthly data — visual indicator of SaaS growth trend
// (real historical tracking would require an audit log table)
const MONTHS = ["JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC", "ENE", "FEB", "MAR", "ABR", "MAY"];
const DATA_ACTIVAS = [1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 7];
const DATA_PRUEBA  = [0, 1, 0, 1, 1, 1, 2, 1, 1, 2, 1, 2];
const DATA_BAJAS   = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];

const ACTIVITY_LABEL: Record<string, string> = {
  ACTIVA:     "Alta confirmada",
  PRUEBA:     "Período de prueba",
  SUSPENDIDA: "Suspendida",
  INACTIVA:   "Inactiva",
};

const ACTIVITY_COLOR: Record<string, string> = {
  ACTIVA:     "var(--success-500)",
  PRUEBA:     "var(--warning-500)",
  SUSPENDIDA: "var(--danger-500)",
  INACTIVA:   "var(--antracita-300)",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7)   return `hace ${d} días`;
  const w = Math.floor(d / 7);
  if (w === 1) return "hace 1 sem.";
  return `hace ${w} sem.`;
}

export function AdminGrowthChart({ inmobiliarias }: Props) {
  const recent = [...inmobiliarias]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // SVG chart dimensions
  const W = 800, H = 200;
  const padL = 36, padR = 12, padT = 16, padB = 28;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const max = 10;
  const xAt = (i: number) => padL + (i / (MONTHS.length - 1)) * cw;
  const yAt = (v: number) => padT + ch - (v / max) * ch;

  const activaPoints = DATA_ACTIVAS.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const pruebaPoints = DATA_PRUEBA.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const bajasPoints  = DATA_BAJAS.map((v, i)  => `${xAt(i)},${yAt(v)}`).join(" ");
  const areaPath = `M${xAt(0)},${yAt(DATA_ACTIVAS[0])} ${DATA_ACTIVAS.map((v, i) => `L${xAt(i)},${yAt(v)}`).join(" ")} L${xAt(MONTHS.length - 1)},${padT + ch} L${xAt(0)},${padT + ch} Z`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 18 }}>

      {/* ── Growth Area Chart ── */}
      <div className="il-card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <h3 className="display" style={{ fontSize: 19, margin: 0, color: "var(--antracita-900)" }}>
              Crecimiento de inmobiliarias
            </h3>
            <p style={{ fontSize: 12, color: "var(--antracita-500)", margin: "2px 0 0" }}>
              Evolución mensual de la plataforma
            </p>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--antracita-500)", alignItems: "center", paddingTop: 2 }}>
            {[
              { color: "var(--terracota-500)", label: "Activas", dash: false },
              { color: "var(--warning-500)",   label: "En prueba", dash: false },
              { color: "var(--danger-500)",    label: "Bajas", dash: true },
            ].map(({ color, label, dash }) => (
              <span key={label} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <span style={{
                  width: dash ? 14 : 8,
                  height: dash ? 2 : 8,
                  borderRadius: 999,
                  background: color,
                  display: "inline-block",
                  borderTop: dash ? `2px dashed ${color}` : "none",
                }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ marginTop: 8 }}>
          <defs>
            <linearGradient id="adminActGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--terracota-500)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--terracota-500)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3].map(i => (
            <line
              key={i}
              x1={padL} x2={W - padR}
              y1={padT + (i / 3) * ch} y2={padT + (i / 3) * ch}
              stroke="var(--border, #E8E0D4)" strokeDasharray="2 4"
            />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#adminActGrad)" />

          {/* Lines */}
          <polyline points={activaPoints} fill="none" stroke="var(--terracota-500)" strokeWidth="2.5" strokeLinejoin="round" />
          <polyline points={pruebaPoints} fill="none" stroke="var(--warning-500)"   strokeWidth="2"   strokeLinejoin="round" />
          <polyline points={bajasPoints}  fill="none" stroke="var(--danger-500)"    strokeWidth="2"   strokeLinejoin="round" strokeDasharray="4 3" />

          {/* Month labels */}
          {MONTHS.map((m, i) => (
            <text
              key={i}
              x={xAt(i)} y={H - 6}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--antracita-300, #A09890)"
              fontFamily="var(--font-jetbrains-mono, monospace)"
            >
              {m}
            </text>
          ))}

          {/* End-of-period label */}
          <g transform={`translate(${xAt(MONTHS.length - 1) - 72}, 20)`}>
            <rect x="0" y="0" width="144" height="46" rx="8" fill="var(--antracita-900)" />
            <text x="10" y="16" fontSize="9.5" fill="var(--crema-300, #C9B99A)" fontFamily="var(--font-jetbrains-mono, monospace)" letterSpacing="0.08em">
              MAY · ACTIVAS
            </text>
            <text x="10" y="36" fontSize="18" fontWeight="600" fill="var(--terracota-300, #E8A888)" fontFamily="var(--font-jetbrains-mono, monospace)">
              {DATA_ACTIVAS[DATA_ACTIVAS.length - 1]}
            </text>
          </g>
        </svg>
      </div>

      {/* ── Actividad reciente ── */}
      <div className="il-card" style={{ padding: 22 }}>
        <h3 className="display" style={{ fontSize: 19, margin: "0 0 16px", color: "var(--antracita-900)" }}>
          Actividad reciente
        </h3>
        {recent.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--antracita-400)", textAlign: "center", padding: "20px 0" }}>
            Sin actividad registrada
          </p>
        ) : (
          recent.map((inmo, i) => (
            <div
              key={inmo.id}
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 0",
                borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: ACTIVITY_COLOR[inmo.estado] ?? "var(--antracita-300)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--antracita-900)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {inmo.nombre}
                </div>
                <div style={{ fontSize: 11, color: "var(--antracita-500)" }}>
                  {ACTIVITY_LABEL[inmo.estado] ?? "Registrada"}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--antracita-300)",
                  fontFamily: "var(--font-jetbrains-mono, monospace)",
                  flexShrink: 0,
                }}
              >
                {timeAgo(inmo.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
