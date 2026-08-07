export default function SkillRadarChart({ skills, highlightIds = [] }) {
  const topSkills = skills
    .sort((a, b) => b.weight - a.weight || a.score - b.score)
    .slice(0, 8);

  if (topSkills.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">No skill data yet</p>;
  }

  const size = 240;
  const center = size / 2;
  const radius = 90;
  const angleStep = (2 * Math.PI) / topSkills.length;

  const points = topSkills.map((skill, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (skill.score / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      skill,
      labelX: center + (radius + 22) * Math.cos(angle),
      labelY: center + (radius + 22) * Math.sin(angle),
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={topSkills
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const r = radius * scale;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        <polygon points={polygon} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth="2" />
        {points.map((p, i) => (
          <g key={topSkills[i].skillId}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={highlightIds.includes(topSkills[i].skillId) ? '#f59e0b' : '#6366f1'}
            />
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-400 text-[9px]"
            >
              {topSkills[i].name.split(' ')[0]}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-2 w-full">
        {topSkills.slice(0, 4).map((s) => (
          <div key={s.skillId} className="flex justify-between text-xs">
            <span className="text-slate-400 truncate">{s.name}</span>
            <span className={`font-semibold ${s.score < 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {s.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
