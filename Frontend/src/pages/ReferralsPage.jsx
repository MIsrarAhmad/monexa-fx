// src/pages/ReferralsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Share2,
  Copy,
  Check,
  DollarSign,
  Award,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Toast from '../components/common/Toast';

const ReferralsPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await axiosInstance.get('/wallet/me');
      return res.data.data;
    },
  });

  const { data: referralData } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const res = await axiosInstance.get('/referrals/my-tree');
      return res.data.data;
    },
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleCopyReferral = () => {
    const link = `https://tradeyield.io/register?ref=${referralData?.referralCode || user?.referralCode || ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Referral invitation link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const referralBalance = wallet?.referralBalance || 0;

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col relative pb-20 md:pb-6">
      <Navbar
        onMobileSidebarToggle={() => setSidebarOpen(true)}
        onOpenNotifications={() => showToast('No new notifications')}
      />

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6 md:px-8 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onLogout={logout}
        />

        <main className="flex-1 min-w-0">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl neon-card p-6 mb-6 border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Direct Referral Program
              </span>
              <span className="bg-cyan-900/50 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full border border-cyan-700">
                Flat $50 Bonus
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-cyan-400" /> Direct Sponsor Referral Program
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Earn a flat $50 USDT bonus plus $0.20 daily passive rewards for every qualifying direct investor you refer.
            </p>
          </div>

          {/* Invitation Link & Earnings Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 neon-card p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" /> Share Your Referral Link
              </h3>
              <p className="text-xs text-slate-300 mb-4">
                Invite friends and investors using your unique URL. Bonuses auto-credit to your account once your direct referral completes a $300+ deposit and maintains it for 24 hours.
              </p>

              <div className="flex items-center gap-2 mb-6">
                <input
                  type="text"
                  readOnly
                  value={`https://tradeyield.io/register?ref=${referralData?.referralCode || user?.referralCode || ''}`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyReferral}
                  className="btn-neon-primary px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>Copy Link</span>
                </button>
              </div>

              {/* Reward Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-semibold">One-Time Direct Bonus</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800 font-bold">
                      Flat Payout
                    </span>
                  </div>
                  <span className="text-xl font-extrabold text-emerald-400">$50.00 USDT</span>
                  <span className="text-[11px] text-slate-400 block mt-1">On minimum $300 deposit after 24h</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-semibold">Daily Passive Reward</span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800 font-bold">
                      Recurring
                    </span>
                  </div>
                  <span className="text-xl font-extrabold text-cyan-400">$0.20 USDT / day</span>
                  <span className="text-[11px] text-slate-400 block mt-1">Per active referred client</span>
                </div>
              </div>
            </div>

            {/* Network Earnings Counter */}
            <div className="neon-card p-6 rounded-2xl flex flex-col justify-between border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> Referral Earnings
                </h3>
                <div className="space-y-3">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total Direct Referrals</span>
                    <span className="text-base font-bold text-white">{referralData?.totalReferredUsers || 0} Investors</span>
                  </div>
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Earned Referral Commission</span>
                    <span className="text-base font-bold text-emerald-400">${referralBalance.toFixed(2)} USDT</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Referral earnings accumulate directly into your withdrawable wallet balance.</span>
              </div>
            </div>
          </div>

          {/* Program Rules & Qualification Criteria */}
          <div className="space-y-4 text-xs">
            {/* Qualification Rules */}
            <div className="neon-card p-6 rounded-2xl border border-cyan-500/20">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" /> Qualification & Reward Criteria
              </h3>

              <div className="space-y-3 text-slate-300">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-800">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs">Minimum Deposit Requirement</span>
                    <span className="text-slate-400 text-[11px]">
                      The referred investor (User B) must deposit a minimum of <strong>$300 USDT</strong> using your referral link.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-800">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs">24-Hour Holding Period</span>
                    <span className="text-slate-400 text-[11px]">
                      The referred user must maintain their deposit without making a withdrawal for <strong>at least 24 hours</strong> before the $50 bonus is credited.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-800">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs">Daily $0.20 Reward Credit</span>
                    <span className="text-slate-400 text-[11px]">
                      Once qualified, you automatically receive <strong>$0.20 USDT every 24 hours</strong> for as long as your direct referral maintains an active investment.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Sponsor Rule Example (User A -> User B -> User C) */}
            <div className="neon-card p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" /> How Referral Payouts Work (Example Breakdown)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User A -> User B Case */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Direct Referral Payout (User A ➔ User B)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    If <strong>User B</strong> registers under <strong>User A</strong>, deposits $300+, and holds for 24 hours:
                  </p>
                  <ul className="text-[11px] text-emerald-300 space-y-1 font-semibold pl-2">
                    <li>• User A gets <strong>$50 USDT</strong> one-time bonus.</li>
                    <li>• User A gets <strong>$0.20 USDT</strong> daily recurring reward.</li>
                  </ul>
                </div>

                {/* User B -> User C Case (No override for User A) */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-rose-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <XCircle className="w-4 h-4" />
                    <span>Indirect Generation Rule (User B ➔ User C)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    If <strong>User C</strong> registers under <strong>User B</strong>:
                  </p>
                  <ul className="text-[11px] text-slate-300 space-y-1 pl-2">
                    <li>• <strong>User B</strong> receives the $50 bonus & $0.20 daily reward.</li>
                    <li className="text-rose-400 font-bold">• <strong>User A receives NOTHING</strong> from User C's deposit.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
      <Toast message={toastMsg} />
    </div>
  );
};

export default ReferralsPage;