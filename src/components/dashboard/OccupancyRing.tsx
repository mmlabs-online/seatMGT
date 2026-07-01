/** SVG circular progress used for the occupancy-rate stat. */
export function OccupancyRing({
  pct,
  size = 72,
  stroke = 8,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-container-highest)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent-orange)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .5s cubic-bezier(0.2,0.7,0.2,1)" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="var(--on-surface)"
        style={{
          fontSize: size * 0.24,
          fontWeight: 800,
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pct}%
      </text>
    </svg>
  );
}
