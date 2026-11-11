// src/pages/AboutUsPage.jsx
import React, { useState } from 'react';
import {
  Globe,
  Target,
  Coins,
  Users,
  Award,
  DollarSign,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';

const AboutUsPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
          {/* Main Hero Header */}
          <div className="relative overflow-hidden rounded-2xl neon-card p-6 mb-6 border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                MONEXA FX
              </span>
              <span className="bg-cyan-900/50 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full border border-cyan-700">
                Official Corporate Profile
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              <Globe className="w-7 h-7 text-cyan-400" /> About MONEXA FX
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              MONEXA FX — Your Gateway to Digital Financial Markets. Professional multi-asset trading, automated yields, and secure account management.
            </p>
          </div>

          <div className="space-y-6 text-xs">
            {/* Section 1: Who We Are & Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neon-card p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" /> Who We Are
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  MONEXA FX is a digital trading and investment platform focused on Forex, Gold (XAUUSD), Currency Pairs, and Cryptocurrencies. Our platform aims to provide users with a simple and accessible way to manage their accounts, explore financial market services, and participate in our investment program.
                </p>
              </div>

              <div className="neon-card p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" /> Our Mission
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Our mission is to make digital financial services accessible through an organized platform, professional trading operations, and convenient account management.
                </p>
              </div>

              <div className="neon-card p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" /> Our Vision
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Our vision is to develop MONEXA FX into a recognized digital financial platform by providing accessible trading services, organized investment management, and a user-friendly experience.
                </p>
              </div>
            </div>

            {/* Section 2: Trading Services & Professional Team */}
            <div className="neon-card p-6 rounded-2xl border border-purple-500/20">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Coins className="w-5 h-5 text-purple-400" /> Trading Services & Professional Team
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Our platform works with experienced trading professionals who conduct market research and manage trading activities according to the platform's trading strategies across four core financial markets:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block text-sm mb-1">Forex Trading</span>
                  <span className="text-slate-400 text-xs">Major global currency pairs execution</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block text-sm mb-1">Gold Trading (XAUUSD)</span>
                  <span className="text-slate-400 text-xs">Spot gold market strategies</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block text-sm mb-1">Currency Pairs</span>
                  <span className="text-slate-400 text-xs">Multi-currency portfolio trading</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block text-sm mb-1">Bitcoin & Cryptocurrencies</span>
                  <span className="text-slate-400 text-xs">Digital assets execution</span>
                </div>
              </div>
            </div>

            {/* Section 3: Investment Program & Payment System */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="neon-card p-6 rounded-2xl border border-cyan-500/20">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" /> Investment Program
                </h3>
                <p className="text-slate-300 leading-relaxed mb-3">
                  MONEXA FX offers a Professional Trading Investment Program with a stated daily return of 1% on qualifying main investment balance. Returns are not compounded and are credited in 24-hour cycles after activation.
                </p>
                <div className="space-y-2 text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span><strong>Minimum Investment:</strong> $300</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Stated Daily Return:</strong> 1% of qualifying main investment balance (not compounded)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span><strong>Activation Period:</strong> 24 hours after deposit confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span><strong>Minimum Qualifying Account Balance:</strong> $300</span>
                  </div>
                </div>
                <p className="text-amber-400 text-[11px] mt-3">
                  * If the main investment balance falls below $300, payments pause. Restoring it starts a new 24-hour period; paused payments are not backdated.
                </p>
              </div>

              <div className="neon-card p-6 rounded-2xl border border-emerald-500/20">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" /> Payment System
                </h3>
                <p className="text-slate-300 leading-relaxed mb-3">
                  MONEXA FX uses USDT through the TRON (TRC20) network for deposits and withdrawals. Users can send and receive payments through compatible external cryptocurrency wallets.
                </p>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                  <div>• <strong>Accepted Currency:</strong> USDT</div>
                  <div>• <strong>Supported Network:</strong> TRC20</div>
                  <div>• <strong>Deposit Confirmation:</strong> TXID and proof reviewed by admin; credit occurs after approval</div>
                  <div>• <strong>Transaction ID (TXID):</strong> Required for deposit verification</div>
                </div>
              </div>
            </div>

            {/* Section 4: Withdrawal Policy */}
            <div className="neon-card p-6 rounded-2xl border border-amber-500/20">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-400" /> Withdrawal Policy
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                MONEXA FX provides a structured withdrawal system with the following conditions:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300">
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">1. Initial 24-Hour Grace</span>
                  <span className="text-[11px] text-slate-400">Investors can request a withdrawal of their investment during the initial 24 hours after deposit confirmation.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">2. Profit Target Lock</span>
                  <span className="text-[11px] text-slate-400">If not withdrawn during the initial 24 hours, withdrawals are restricted until accumulated profit reaches $50.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">3. Eligibility</span>
                  <span className="text-[11px] text-slate-400">Once accumulated profit reaches $50, the investor becomes eligible to request a withdrawal.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">4. Payment Network</span>
                  <span className="text-[11px] text-slate-400">All withdrawals are processed in USDT through the TRC20 network.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">5. Platform Fee</span>
                  <span className="text-[11px] text-slate-400">A 20% withdrawal fee applies to all processed cashout requests.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">6. Processing Speed</span>
                  <span className="text-[11px] text-slate-400">Requests enter the admin review queue. Processing time depends on verification and payout review; no fixed completion time is guaranteed.</span>
                </div>
              </div>
            </div>

            {/* Section 5: Referral Program */}
            <div className="neon-card p-6 rounded-2xl border border-blue-500/20">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Direct Referral Program
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                MONEXA FX offers a direct referral reward program that allows users to earn rewards by inviting new qualifying investors:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-300 mb-3">
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-blue-400 block text-sm mb-1">$50 One-Time Bonus</span>
                  <span className="text-xs text-slate-400">For each qualifying direct referral who deposits at least $300.</span>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-emerald-400 block text-sm mb-1">$0.20 Daily Reward</span>
                  <span className="text-xs text-slate-400">Daily reward for each qualifying direct referral.</span>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-purple-400 block text-sm mb-1">24-Hour Activation</span>
                  <span className="text-xs text-slate-400">Referral rewards become active after the required 24-hour activation period.</span>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-cyan-400 block text-sm mb-1">Direct Referrals Only</span>
                  <span className="text-xs text-slate-400">Rewards are paid only to the user's direct referrer.</span>
                </div>
              </div>
              <p className="text-slate-400 text-[11px]">
                * No Indirect Rewards: Higher generations do not receive rewards from indirect referrals.
              </p>
            </div>

            {/* Section 6: Core Values */}
            <div className="neon-card p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Our Core Values
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-center">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-200 font-semibold">
                  Efficient Trading System
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-200 font-semibold">
                  Security-Focused Operations
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-200 font-semibold">
                  Quality Customer Support
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-200 font-semibold">
                  Transparent Policies
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-200 font-semibold">
                  Convenient Payment Services
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default AboutUsPage;