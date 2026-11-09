// src/components/dashboard/LedgerTable.jsx
import React, { memo } from 'react';
import { ArrowDownLeft, Users, Plus, Clock } from 'lucide-react';

const LedgerTable = memo(({ transactions }) => {
  return (
    <div className="neon-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Audit Ledger & History
        </h3>
        <span className="text-xs text-slate-400">Live Transaction Logs</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Transaction ID / Note</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {!transactions || transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500">
                  No recorded transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx._id || tx.id} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 px-3 font-semibold flex items-center gap-2">
                    {tx.type === 'YIELD' && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ArrowDownLeft className="w-4 h-4" /> Daily Yield
                      </span>
                    )}
                    {tx.type === 'REFERRAL' && (
                      <span className="text-blue-400 flex items-center gap-1">
                        <Users className="w-4 h-4" /> Referral Commission
                      </span>
                    )}
                    {tx.type === 'DEPOSIT' && (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Deposit
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{tx.txHash || tx.note || 'LEDGER-LOG'}</td>
                  <td className="py-3 px-3 font-bold text-white">+${tx.amount?.toFixed(2)} USDT</td>
                  <td className="py-3 px-3 text-slate-400">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Today'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 text-[11px] font-semibold">
                      {tx.status || 'Completed'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

LedgerTable.displayName = 'LedgerTable';
export default LedgerTable;