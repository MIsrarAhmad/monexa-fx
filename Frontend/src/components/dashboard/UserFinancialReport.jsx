const formatUsdt = (amount) => amount == null ? 'Unavailable' : `$${Number(amount).toFixed(2)} USDT`;
const formatMonth = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
  month: 'short', year: 'numeric', timeZone: 'UTC',
});
const countsText = (counts) => `${counts.completed} completed · ${counts.pending} pending · ${counts.rejected} rejected${counts.approved ? ` · ${counts.approved} approved` : ''}`;
const eligibilityLabels = {
  ELIGIBLE: 'Eligible to request',
  EMAIL_VERIFICATION_REQUIRED: 'Email verification required',
  KYC_REQUIRED: 'KYC approval required',
  WALLET_MISSING: 'Wallet unavailable',
  BALANCE_UNAVAILABLE: 'Balance unavailable',
  PROFIT_LOCKED: 'Profit target locked',
};

const ReportMetric = ({ label, value, note, accent = 'text-white' }) => (
  <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
    <p className="text-[11px] font-medium text-slate-400">{label}</p>
    <p className={`mt-2 text-lg font-bold tabular-nums ${accent}`}>{value}</p>
    {note && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{note}</p>}
  </div>
);

const UserFinancialReport = ({ report }) => {
  const { summary, user, referrals, investmentForecast } = report;
  if (!summary.withdrawal || !referrals || !investmentForecast) {
    return <p role="alert" className="rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">The detailed report is unavailable until the updated backend is deployed.</p>;
  }
  const { withdrawal, balances } = summary;
  const availableBalance = summary.balancesValid ? balances.investment + balances.profit + balances.referral : null;
  const passive = referrals.forecast;
  const months = [
    { month: investmentForecast.current.month, investment: investmentForecast.current.estimatedTotal, passive: passive.current.estimatedTotal, direct: summary.currentMonthDirectReferral, current: true },
    ...investmentForecast.nextMonths.map((month, index) => ({
      month: month.month, investment: month.estimated, passive: passive.nextMonths[index]?.estimated ?? null, direct: 0, current: false,
    })),
  ];
  const link = user.referralCode ? `https://monexafx.com/register?ref=${encodeURIComponent(user.referralCode)}` : null;

  return (
    <div className="space-y-7">
      <section aria-label="Past financial activity">
        <div className="mb-3 flex items-baseline gap-3"><span className="text-xs font-bold tracking-widest text-cyan-400">01</span><h4 className="text-sm font-bold text-white">Past activity</h4></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetric label="Completed deposits" value={formatUsdt(summary.totalDeposited)} note={countsText(summary.depositCounts)} accent="text-cyan-300" />
          <ReportMetric label="Investment profit credited" value={formatUsdt(summary.totalProfit)} accent="text-emerald-300" />
          <ReportMetric label="Direct referral bonuses" value={formatUsdt(summary.totalDirectReferral)} note="Recorded $50 qualification bonuses" accent="text-amber-300" />
          <ReportMetric label="Daily referral rewards" value={formatUsdt(summary.totalPassiveReferral)} note="Recorded $0.20 passive credits" accent="text-amber-300" />
          <ReportMetric label="Total referral income" value={formatUsdt(summary.totalReferralEarned)} note="Direct bonuses + passive credits" accent="text-amber-300" />
          <ReportMetric label="Completed withdrawals · gross" value={formatUsdt(summary.totalWithdrawn)} note={countsText(summary.withdrawalCounts)} accent="text-rose-300" />
          <ReportMetric label="Net amount recorded" value={formatUsdt(summary.totalPaidOut)} note={`Recorded fees ${formatUsdt(summary.totalWithdrawalFees)}`} />
          <ReportMetric label="Pending withdrawal requests" value={formatUsdt(summary.withdrawalPendingAmount)} note="Reserved from the available wallet balance" />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Completed withdrawal figures reflect the admin-recorded status, not independent confirmation of an on-chain transfer.</p>
      </section>

      <section aria-label="Present balances and withdrawal">
        <div className="mb-3 flex items-baseline gap-3"><span className="text-xs font-bold tracking-widest text-cyan-400">02</span><h4 className="text-sm font-bold text-white">Present balance &amp; withdrawal</h4></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetric label="Main balance" value={formatUsdt(summary.balancesValid ? balances.investment : null)} accent="text-cyan-300" />
          <ReportMetric label="Retained profit" value={formatUsdt(summary.balancesValid ? balances.profit : null)} accent="text-emerald-300" />
          <ReportMetric label="Referral balance" value={formatUsdt(summary.balancesValid ? balances.referral : null)} accent="text-amber-300" />
          <ReportMetric label="Available wallet balance" value={formatUsdt(availableBalance)} note="After pending reservations" />
        </div>
        <div className="mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Maximum requestable · gross</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{formatUsdt(withdrawal.requestableGross)}</p>
            </div>
            <span className="rounded-full border border-emerald-800 px-3 py-1 text-xs text-emerald-200">{eligibilityLabels[withdrawal.eligibility] || 'Eligibility unavailable'}</span>
          </div>
          <p className="mt-3 text-xs text-slate-300">Estimated 20% fee: {formatUsdt(withdrawal.estimatedFee)} · Net: {formatUsdt(withdrawal.estimatedNet)}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Estimate only; a valid TRC20 address and admin review are required. Withdrawing principal below $300 pauses investment profit.</p>
        </div>
      </section>

      <section aria-label="Referral network">
        <div className="mb-3 flex items-baseline gap-3"><span className="text-xs font-bold tracking-widest text-cyan-400">03</span><h4 className="text-sm font-bold text-white">Referral network</h4></div>
        <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-400">Referral link</p>
          {link ? <a href={link} className="mt-1 block break-all text-sm text-cyan-300 underline decoration-cyan-700 underline-offset-4">{link}</a> : <p className="mt-1 text-sm text-amber-300">Referral code unavailable</p>}
          <p className="mt-3 text-xs text-slate-300">{referrals.members.length} direct referrals · {passive.eligibleCount == null ? 'Eligibility unavailable' : `${passive.eligibleCount} currently qualifying for passive estimates`}</p>
          {referrals.members.length > 0 && (
            <details className="mt-3 text-xs text-slate-300">
              <summary className="cursor-pointer font-semibold text-cyan-300">View direct referrals</summary>
              <ul className="mt-2 divide-y divide-slate-800">
                {referrals.members.map((member, index) => (
                  <li key={`${member.email || 'unavailable'}-${index}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{member.name || 'User unavailable'}{member.email ? ` · ${member.email}` : ''}</span>
                    <span className="text-slate-400">{!Number.isFinite(member.mainBalance) ? 'Balance unavailable' : !member.hasTriggeredInitialBonus ? 'Bonus not yet qualified' : member.mainBalance < 300 ? 'Passive paused' : member.isPassiveEligible ? 'Passive active' : 'Passive restarting'}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      <section aria-label="Future financial planning">
        <div className="mb-3 flex flex-wrap items-baseline gap-3"><span className="text-xs font-bold tracking-widest text-cyan-400">04</span><h4 className="text-sm font-bold text-white">Future financial planning</h4><span className="text-[11px] text-amber-300">Estimate, not a confirmed payment</span></div>
        <p className="mb-3 text-xs leading-relaxed text-slate-400">UTC calendar months. Current month includes amounts already credited; later months are projected only. Investment follows the $100-step rule. Passive estimates assume qualifying referrals remain eligible. No new referrals, direct bonuses, deposits, withdrawals, fees or schedule changes are projected; delays can change results.</p>
        <div className="overflow-x-auto rounded-xl border border-slate-700/70">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-slate-900 text-slate-400"><tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Investment</th><th className="px-4 py-3">Passive referral</th><th className="px-4 py-3">Direct bonus credited</th><th className="px-4 py-3">Total estimate</th></tr></thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              {months.map((month) => (
                <tr key={month.month}>
                  <th scope="row" className="px-4 py-3 font-semibold text-white">{formatMonth(month.month)}{month.current && <span className="ml-2 text-[10px] text-cyan-400">CURRENT</span>}</th>
                  <td className="px-4 py-3 text-emerald-300">{formatUsdt(month.investment)}</td>
                  <td className="px-4 py-3 text-amber-300">{formatUsdt(month.passive)}</td>
                  <td className="px-4 py-3 text-slate-300">{month.current ? formatUsdt(month.direct) : 'Not projected'}</td>
                  <td className="px-4 py-3 font-bold text-white">{formatUsdt(month.investment == null || month.passive == null ? null : month.investment + month.passive + month.direct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(investmentForecast.status !== 'AVAILABLE' || passive.status !== 'AVAILABLE') && <p role="status" className="mt-2 text-xs text-amber-300">A balance or payment schedule is unavailable; affected estimates cannot be calculated.</p>}
        <p className="mt-2 text-[11px] text-slate-500">Current month credited: investment {formatUsdt(investmentForecast.current.credited)} · passive referral {formatUsdt(passive.current.credited)} · direct bonuses {formatUsdt(summary.currentMonthDirectReferral)}.</p>
        <p className="mt-2 text-xs font-semibold text-cyan-300">Next 3 months combined estimate: {formatUsdt(investmentForecast.nextThreeTotal == null || passive.nextThreeTotal == null ? null : investmentForecast.nextThreeTotal + passive.nextThreeTotal)}</p>
      </section>
    </div>
  );
};

export default UserFinancialReport;
