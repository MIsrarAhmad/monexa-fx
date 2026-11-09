// src/components/common/MaintenanceOverlay.jsx
import React from 'react';
import { Wrench, ShieldAlert } from 'lucide-react';

const MaintenanceOverlay = () => {
  return (
    <div className="fixed inset-0 z-50 bg-[#050811] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-[#0b1222] border border-amber-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-500 animate-pulse" />

        <div className="w-16 h-16 bg-amber-950/80 border border-amber-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-400">
          <Wrench className="w-8 h-8 animate-bounce" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
            System Maintenance
          </span>
        </div>

        <h1 className="text-2xl font-black text-white mb-3">Dashboard Under Maintenance</h1>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          TradeYield is undergoing scheduled upgrades to optimize algorithm yields and execution speeds. Access is temporarily paused for non-admin accounts.
        </p>

        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300">
          Status: <span className="text-emerald-400 font-bold">Services Expected Back Online Shortly</span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;