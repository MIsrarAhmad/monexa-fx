// src/pages/UserHomePage.jsx
import React, { useState } from 'react';
import { PlusCircle, ArrowUpRight, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Toast from '../components/common/Toast';
import MarketOverviewWidget from '../components/dashboard/MarketOverviewWidget';
import DepositModal from '../components/modals/DepositModal';
import WithdrawModal from '../components/modals/WithdrawModal';

const UserHomePage = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col relative pb-20 md:pb-6">
      <Navbar
        isMobileSidebarOpen={sidebarOpen}
        onMobileSidebarToggle={() => setSidebarOpen((open) => !open)}
      />

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6 md:px-8 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onLogout={logout}
        />

        <main className="flex-1 min-w-0">
          {/* 1. Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl neon-card p-6 mb-6 border border-cyan-500/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Investor Control Center</span>
                  <span className="bg-cyan-900/50 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full border border-cyan-700">
                    Live Session
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white whitespace-nowrap">
                  Welcome to MonexaFX
                </h1>
                <p className="text-2xl md:text-3xl font-extrabold text-cyan-400 mt-1">
                  {user?.name || 'Investor'} 👋
                </p>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Manage capital deposits, track live market values, and execute instant crypto cashouts.
                </p>
              </div>
            </div>

            {/* 2. Deposit & Withdraw Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setDepositOpen(true)}
                className="btn-neon-primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => setWithdrawOpen(true)}
                className="btn-neon-outline px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          {/* 3. Live Market Value Section */}
          <div className="neon-card p-5 rounded-2xl border border-slate-800">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" /> Live Market Ticker & Liquidity Feeds
            </h3>
            <MarketOverviewWidget />
          </div>
        </main>
      </div>

      <BottomNav />
      <Toast message={toastMsg} />

      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} onShowToast={showToast} />
      <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} onShowToast={showToast} />
    </div>
  );
};

export default UserHomePage;