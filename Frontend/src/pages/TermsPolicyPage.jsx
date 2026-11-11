// src/pages/TermsPolicyPage.jsx
import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Lock,
  DollarSign,
  Globe,
  Target,
  Users,
  Coins,
  Wallet,
  Award,
  CheckCircle2,
  Clock,
  ArrowDownCircle,
  ArrowUpRight,
  PauseCircle,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Toast from '../components/common/Toast';

const TermsPolicyPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        onOpenNotifications={() => showToast('No new notifications')}
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
                Official Investment & Policy Terms
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              <FileText className="w-7 h-7 text-cyan-400" /> Platform Terms & Investment Policy
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              MONEXA FX — Your Gateway to Digital Financial Markets. Complete rules for deposits, daily returns, withdrawals, and direct referrals.
            </p>
          </div>

          <div className="space-y-6 text-xs">
            {/* 1. Professional Trading Investment Program & Investment Rules */}
            <div className="neon-card p-6 rounded-2xl border border-cyan-500/20">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Coins className="w-5 h-5 text-cyan-400" /> 1. Investment Program & Rules
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                <strong>Title:</strong> Professional Trading Investment Program<br />
                MONEXA FX provides an investment platform focused on Forex, Gold (XAUUSD), Currency Pairs, and Cryptocurrencies. Our platform operates with a professional trading team and offers an investment program with a stated daily return of 1% on qualifying investments.
              </p>

              {/* Investment Rules Matrix Table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Policy Parameter</th>
                      <th className="py-2.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Minimum Investment</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">$300</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Daily Return</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">1% of qualifying main investment balance; not compounded</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Activation Period</td>
                      <td className="py-2.5 px-3 text-slate-300">24 Hours</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Payment Currency</td>
                      <td className="py-2.5 px-3 text-slate-300">USDT</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Deposit Network</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-semibold">TRC20</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Admin Wallet</td>
                      <td className="py-2.5 px-3 text-amber-400 font-semibold">USDT TRC20 Wallet</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Minimum Main Investment Balance</td>
                      <td className="py-2.5 px-3 text-white font-bold">$300</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Profit Payment</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">Every 24 hours after activation, while eligible</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Investment Conditions Bullet Points */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                <p className="font-bold text-white text-xs mb-1">Investment Conditions:</p>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>1. The minimum investment amount is $300.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>2. After the deposit is verified and credited, a 24-hour activation period begins.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>3. The stated daily return is 1% of the qualifying main investment balance and is not compounded.</span>
                </div>
                <div className="flex items-start gap-2 text-amber-300">
                  <PauseCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>4. Minimum Balance Rule:</strong> If the main investment balance falls below $300, daily payments pause. When it is restored to at least $300, a new 24-hour period begins. No payments are backdated for the paused period.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>5. All investment transactions must be recorded in the user's account.</span>
                </div>
              </div>
            </div>

            {/* 2. Deposit Policy */}
            <div className="neon-card p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-emerald-400" /> 2. Deposit Policy
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                <strong>Title:</strong> Secure USDT Deposit System<br />
                MONEXA FX accepts deposits in USDT through the TRON (TRC20) network. Users can send payments from their personal cryptocurrency wallets to the platform's designated USDT TRC20 admin wallet.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">1. Network Standard</span>
                  <span className="text-[11px] text-slate-400">Only USDT TRC20 deposits are accepted.</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">2. Minimum Deposit</span>
                  <span className="text-[11px] text-slate-400">Each deposit must be at least $300 USDT. Daily yield activates when the main balance is at least $300 USDT.</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">3. Official Address</span>
                  <span className="text-[11px] text-slate-400">Users must send funds to the official USDT TRC20 deposit address displayed in the application.</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">4. Transaction ID (TXID)</span>
                  <span className="text-[11px] text-slate-400">Users must submit their transaction ID (TXID).</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">5. Payment Verification</span>
                  <span className="text-[11px] text-slate-400">Users submit the transaction ID and payment proof. Deposits are credited after admin review and approval; blockchain verification is not automatic.</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">6. Unsupported Networks</span>
                  <span className="text-[11px] text-slate-400">Payments sent through unsupported networks are not accepted.</span>
                </div>
              </div>
            </div>

            {/* 3. Withdrawal Policy */}
            <div className="neon-card p-6 rounded-2xl border border-amber-500/20">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-400" /> 3. Withdrawal Policy
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                <strong>Title:</strong> Admin-Reviewed Withdrawals<br />
                MONEXA FX provides USDT withdrawals through the TRON (TRC20) network. Withdrawal requests are processed through the platform's designated USDT TRC20 wallet.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-300 mb-4">
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">1. Payment Currency</span>
                  <span className="text-[11px] text-slate-400">Withdrawals are paid in USDT TRC20.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">2. Withdrawal Fee</span>
                  <span className="text-[11px] text-slate-400">The withdrawal fee is 20%.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">3. Processing Time</span>
                  <span className="text-[11px] text-slate-400">Requests enter the admin review queue. Processing depends on verification and payout review; no fixed completion time is guaranteed.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">4. Wallet Address</span>
                  <span className="text-[11px] text-slate-400">Users must provide a valid USDT TRC20 wallet address.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">5. Verification</span>
                  <span className="text-[11px] text-slate-400">Every withdrawal request is subject to verification.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">6. Initial 24-Hour Period</span>
                  <span className="text-[11px] text-slate-400">Investors have the first 24 hours after deposit confirmation to request a withdrawal of their investment.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">7. $50 Profit Threshold</span>
                  <span className="text-[11px] text-slate-400">If an investor does not withdraw during the initial 24 hours, withdrawals remain restricted until accumulated profit reaches $50.</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">8. Eligibility</span>
                  <span className="text-[11px] text-slate-400">Once accumulated profit reaches $50, the user becomes eligible to request a withdrawal (subject to 20% fee & verification).</span>
                </div>
              </div>
            </div>

            {/* 4. Referral Policy */}
            <div className="neon-card p-6 rounded-2xl border border-blue-500/20">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> 4. Referral Policy
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                <strong>Title:</strong> Direct Referral Reward Program<br />
                MONEXA FX offers a referral program that rewards users for bringing new qualifying investors through their personal referral links.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Minimum Referral Deposit</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">$300</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">One-Time Referral Bonus</td>
                      <td className="py-2.5 px-3 text-blue-400 font-bold">$50</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Daily Referral Reward</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">$0.20</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Bonus Activation</td>
                      <td className="py-2.5 px-3 text-slate-300">After the 24-hour holding period</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <p className="font-bold text-white text-xs mb-1">Generation Rules:</p>
                <p>1. <strong>First Generation:</strong> The direct referrer receives a $50 one-time bonus after the referred investor maintains at least $300 for 24 hours without a withdrawal. The $0.20 reward starts after qualification and is paid every 24 hours while eligible.</p>
                <p>2. <strong>Second Generation:</strong> Only the Second Generation investor's direct referrer receives the $50 bonus and $0.20 daily reward.</p>
                <p>3. <strong>Generation Exclusion:</strong> First Generation users do not receive rewards from Second Generation investors.</p>
                <p>4. <strong>Direct Qualification:</strong> Referral rewards are provided only for qualifying direct referrals. If the referred investor's main balance drops below $300, recurring rewards pause and restart after another 24-hour qualifying period once restored.</p>
                <p className="text-amber-400 font-semibold text-[11px]">5. Note: The previous $25 bonus has been completely removed.</p>
              </div>
            </div>

            {/* 5. Important Policy Notice */}
            <div className="bg-rose-950/20 border border-rose-900/40 p-6 rounded-2xl">
              <h3 className="text-base font-bold text-rose-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" /> 5. Important Policy Notice
              </h3>
              <p className="text-slate-300 leading-relaxed mb-3">
                All investment amounts, return calculations, referral rewards, deposit records, and withdrawal transactions must be clearly displayed in the user's account.
              </p>
              <p className="text-slate-300 leading-relaxed mb-3">
                The 1% daily return is a stated financial commitment of the platform. Its payment must be supported by verified funding and a legally authorized operating structure.
              </p>
              <p className="text-slate-300 leading-relaxed">
                All investment terms, fees, withdrawal restrictions, and other applicable conditions must be clearly disclosed to users before they deposit funds.
              </p>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
      <Toast message={toastMsg} />
    </div>
  );
};

export default TermsPolicyPage;