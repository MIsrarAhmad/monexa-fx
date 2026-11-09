// Frontend/src/pages/TransactionsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Filter, Search, ArrowUpRight, ArrowDownLeft, TrendingUp, DownloadCloud } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Toast from '../components/common/Toast';
import { generateTransactionPDF, generateReceiptPDF } from '../utils/pdfGenerator';

const TransactionsPage = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions', filterType],
    queryFn: async () => {
      const res = await axiosInstance.get(`/wallet/transactions?type=${filterType}`);
      return res.data.data;
    },
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const filteredTransactions = (transactionsData || []).filter((tx) => {
    const matchesSearch =
      tx.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.txHash && tx.txHash.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleDownloadFullStatement = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      showToast('No transaction records available to export');
      return;
    }
    generateTransactionPDF(filteredTransactions, user?.name);
    showToast('Financial statement downloaded as PDF!');
  };

  const handleDownloadSingleReceipt = (tx) => {
    generateReceiptPDF(tx, user?.name);
    showToast(`Receipt downloaded for ${tx.type.replace(/_/g, ' ')}!`);
  };

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
          <div className="relative overflow-hidden rounded-2xl neon-card p-6 mb-6 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
                <FileText className="w-7 h-7 text-cyan-400" /> Financial Audit Ledger
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Complete history of capital deposits and withdrawal cashouts.
              </p>
            </div>

            <button
              onClick={handleDownloadFullStatement}
              className="btn-neon-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Statement (PDF)</span>
            </button>
          </div>

          <div className="neon-card p-5 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search transaction or hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Filter types updated: Only ALL, DEPOSIT, and WITHDRAWAL_REQUEST */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              {['ALL', 'DEPOSIT', 'WITHDRAWAL_REQUEST'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition ${
                    filterType === type
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="neon-card p-6 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Gross Amount</th>
                    <th className="py-3 px-3">Fee Deducted</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Tx Hash / Ref</th>
                    <th className="py-3 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Loading transaction history...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3 text-slate-300">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          {tx.type === 'DEPOSIT' && <ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
                          {tx.type === 'WITHDRAWAL_REQUEST' && <ArrowUpRight className="w-4 h-4 text-amber-400" />}
                          {tx.type === 'YIELD' && <TrendingUp className="w-4 h-4 text-cyan-400" />}
                          <span>{tx.type.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200">
                          ${(tx.amount || 0).toFixed(2)} USDT
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          ${(tx.feeDeducted || 0).toFixed(2)} USDT
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              tx.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : tx.status === 'PENDING'
                                ? 'bg-amber-950 text-amber-400 border-amber-800'
                                : 'bg-rose-950 text-rose-400 border-rose-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {tx.txHash ? `${tx.txHash.substring(0, 8)}...` : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDownloadSingleReceipt(tx)}
                            title="Download Receipt PDF"
                            className="p-1.5 bg-slate-900 hover:bg-cyan-950 hover:text-cyan-400 border border-slate-800 rounded-lg text-slate-300 transition inline-flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
      <Toast message={toastMsg} />
    </div>
  );
};

export default TransactionsPage;