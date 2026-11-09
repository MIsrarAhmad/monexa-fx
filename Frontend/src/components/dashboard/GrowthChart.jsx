// src/components/dashboard/GrowthChart.jsx
import React, { memo } from 'react';
import { TrendingUp } from 'lucide-react';
import { Line } from 'react-chartjs-2';

const GrowthChart = memo(({ chartData, activeFilter, onFilterChange }) => {
  return (
    <div className="lg:col-span-2 neon-card p-5 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Performance & Growth Trajectory
          </h3>
          <p className="text-xs text-slate-400">Weekly compound interest and daily ledger logs.</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {['7D', '1M', 'ALL'].map((tf) => (
            <button
              key={tf}
              onClick={() => onFilterChange(tf)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === tf ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="h-60 w-full">
        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>
    </div>
  );
});

GrowthChart.displayName = 'GrowthChart';
export default GrowthChart;