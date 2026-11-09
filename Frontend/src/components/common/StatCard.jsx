// src/components/common/StatCard.jsx
import React, { memo } from 'react';

const StatCard = memo(({
  title,
  value,
  unit,
  icon: Icon,
  subText,
  badgeText,
  accentColor = 'cyan', // 'cyan', 'emerald', 'blue', or 'purple'
  highlight = false,
}) => {
  // Theme styling based on accent color
  const colorMap = {
    cyan: {
      bgIcon: 'bg-cyan-950/80 border-cyan-800/60 text-cyan-400',
      badge: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      valueText: 'text-white',
    },
    emerald: {
      bgIcon: 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      valueText: 'text-emerald-400',
    },
    blue: {
      bgIcon: 'bg-blue-950/80 border-blue-800/60 text-blue-400',
      badge: 'bg-blue-950 text-blue-300 border-blue-800',
      valueText: 'text-white',
    },
    purple: {
      bgIcon: 'bg-purple-950/80 border-purple-800/60 text-purple-400',
      badge: 'bg-purple-950 text-purple-300 border-purple-800',
      valueText: 'text-purple-300',
    },
  };

  const style = colorMap[accentColor] || colorMap.cyan;

  return (
    <div
      className={`neon-card p-5 rounded-2xl relative overflow-hidden transition-all duration-300 ${
        highlight ? 'bg-gradient-to-br from-cyan-950/30 to-slate-900/60 border-cyan-500/50' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-slate-400">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${style.bgIcon}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-extrabold ${style.valueText}`}>{value}</span>
        {unit && <span className="text-xs text-cyan-400 font-semibold ml-1">{unit}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
        <span className="text-slate-400">{subText}</span>
        {badgeText && (
          <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${style.badge}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
export default StatCard;