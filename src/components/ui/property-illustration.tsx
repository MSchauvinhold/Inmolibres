interface PropertyIllustrationProps {
  seed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PropertyIllustration({ seed = 0, className, style }: PropertyIllustrationProps) {
  const v = seed % 4;

  if (v === 0) return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className={className} style={style}>
      <defs>
        <pattern id="grain0" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--crema-200,#ECE4D6)" />
          <circle cx="1" cy="1" r="0.6" fill="rgba(58,35,18,0.07)" />
        </pattern>
      </defs>
      <rect width="200" height="120" fill="url(#grain0)" />
      <rect y="92" width="200" height="28" fill="var(--crema-300,#DED2BE)" opacity="0.6" />
      <rect x="56" y="58" width="78" height="44" fill="var(--terracota-500,#C1694F)" />
      <polygon points="56,58 95,30 134,58" fill="var(--marron-700,#5C2E14)" />
      <rect x="68" y="68" width="14" height="14" fill="var(--crema-50,#FBF8F2)" />
      <rect x="106" y="68" width="14" height="14" fill="var(--crema-50,#FBF8F2)" />
      <rect x="86" y="84" width="18" height="18" fill="var(--antracita-700,#221E19)" />
      <rect x="138" y="68" width="32" height="34" fill="var(--antracita-700,#221E19)" />
      <rect x="144" y="76" width="8" height="10" fill="var(--dorado-400,#D4A853)" />
      <rect x="156" y="76" width="8" height="10" fill="var(--dorado-400,#D4A853)" />
      <rect x="144" y="90" width="20" height="12" fill="var(--crema-50,#FBF8F2)" />
      <circle cx="34" cy="86" r="14" fill="var(--success-500,#4A7C59)" />
      <rect x="32" y="92" width="4" height="14" fill="var(--marron-700,#5C2E14)" />
    </svg>
  );

  if (v === 1) return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className={className} style={style}>
      <rect width="200" height="120" fill="var(--crema-200,#ECE4D6)" />
      <rect y="100" width="200" height="20" fill="var(--crema-300,#DED2BE)" />
      <rect x="22" y="44" width="64" height="58" fill="var(--marron-700,#5C2E14)" />
      <rect x="92" y="28" width="48" height="74" fill="var(--terracota-500,#C1694F)" />
      <rect x="146" y="56" width="38" height="46" fill="var(--antracita-700,#221E19)" />
      {[0,1,2].map(i => [0,1,2].map(j => (
        <rect key={`a${i}-${j}`} x={30+j*18} y={52+i*16} width="10" height="8"
          fill="var(--dorado-400,#D4A853)" opacity={(i+j)%2===0 ? 1 : 0.5} />
      )))}
      {[0,1,2,3].map(i => [0,1].map(j => (
        <rect key={`b${i}-${j}`} x={100+j*20} y={36+i*16} width="12" height="10"
          fill="var(--crema-50,#FBF8F2)" opacity={(i+j)%2===0 ? 1 : 0.6} />
      )))}
      {[0,1,2].map(i => (
        <rect key={`c${i}`} x="154" y={64+i*12} width="22" height="6"
          fill="var(--terracota-300,#E0A088)" opacity="0.7" />
      ))}
    </svg>
  );

  if (v === 2) return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className={className} style={style}>
      <rect width="200" height="120" fill="var(--crema-200,#ECE4D6)" />
      <path d="M0,80 Q50,60 100,75 T200,72 L200,120 L0,120 Z" fill="var(--terracota-300,#E0A088)" opacity="0.5" />
      <path d="M0,95 Q60,82 120,92 T200,90 L200,120 L0,120 Z" fill="var(--terracota-500,#C1694F)" opacity="0.7" />
      <path d="M104 56 L104 76 L98 70 Z" fill="var(--antracita-700,#221E19)" />
      <circle cx="104" cy="56" r="6" fill="var(--terracota-500,#C1694F)" />
      {[20,46,72,98,124,150,176].map((x,i) => (
        <rect key={i} x={x} y={75-(i%3)} width="3" height="3" fill="var(--marron-700,#5C2E14)" opacity="0.6" />
      ))}
    </svg>
  );

  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className={className} style={style}>
      <rect width="200" height="120" fill="var(--crema-200,#ECE4D6)" />
      <rect y="98" width="200" height="22" fill="var(--crema-300,#DED2BE)" />
      <rect x="14" y="46" width="172" height="56" fill="var(--antracita-700,#221E19)" />
      <rect x="14" y="40" width="172" height="8" fill="var(--terracota-500,#C1694F)" />
      <rect x="26" y="58" width="90" height="40" fill="var(--crema-50,#FBF8F2)" />
      <line x1="71" y1="58" x2="71" y2="98" stroke="var(--antracita-700,#221E19)" strokeWidth="2" />
      <rect x="124" y="58" width="22" height="40" fill="var(--dorado-400,#D4A853)" />
      <rect x="154" y="64" width="20" height="34" fill="var(--terracota-500,#C1694F)" />
      <circle cx="170" cy="82" r="1.5" fill="var(--dorado-400,#D4A853)" />
      <rect x="26" y="50" width="90" height="6" fill="var(--terracota-500,#C1694F)" />
    </svg>
  );
}
