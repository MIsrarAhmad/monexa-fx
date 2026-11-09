// src/components/dashboard/ProjectCard.jsx
import React, { memo } from 'react';

const ProjectCard = memo(({ title, category, fundedPercent, description, poolAllocated, totalTarget, dailyYield, icon: Icon, iconBg }) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-800/60 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            {title}
            <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-800 font-semibold">
              {fundedPercent}% Funded
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="w-full md:w-64">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Pool Allocation</span>
          <span className="text-cyan-400 font-semibold">{poolAllocated} / {totalTarget}</span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${fundedPercent}%` }}
          ></div>
        </div>
      </div>

      <div className="text-left md:text-right shrink-0">
        <span className="block text-xs text-slate-400">Est. Daily Yield</span>
        <span className="text-sm font-extrabold text-emerald-400">+{dailyYield}% Daily</span>
      </div>
    </div>
  );
});

ProjectCard.displayName = 'ProjectCard';
export default ProjectCard;