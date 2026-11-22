import { WITHDRAWAL_FEE_PERCENTAGE } from '../config/constants.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const money = (value) => Number(value).toFixed(2);

export const transactionEmailTemplate = (name, transaction, event) => {
  const withdrawal = transaction.type === 'WITHDRAWAL_REQUEST';
  const descriptions = {
    requested: withdrawal
      ? 'Your withdrawal request has been received and is awaiting admin review. The requested funds are reserved in your account.'
      : 'Your deposit proof has been received and is awaiting admin review. Your balance has not yet been credited.',
    completed: withdrawal
      ? 'An administrator has marked your withdrawal request as completed. This status does not independently confirm an on-chain transfer.'
      : 'Your deposit was approved and credited to your account.',
    rejected: withdrawal
      ? 'Your withdrawal request was not approved. The reserved funds have been restored to your wallet.'
      : 'Your deposit proof was not approved. Your balance was not credited. Please check the submitted details or contact support.',
  };
  const label = withdrawal ? 'Withdrawal' : 'Deposit';
  const titles = { requested: 'request received', completed: withdrawal ? 'marked completed' : 'credited', rejected: 'not approved' };
  const title = `${label} ${titles[event]}`;
  const rows = [
    ['Status', event === 'requested' ? 'PENDING REVIEW' : event === 'rejected' ? 'REJECTED' : 'COMPLETED'],
    [withdrawal ? 'Requested amount' : 'Deposit amount', `$${money(transaction.amount)} USDT`],
  ];
  if (withdrawal) {
    const feeMatchesCurrentRate = Number(transaction.feeDeducted) === Number((transaction.amount * WITHDRAWAL_FEE_PERCENTAGE).toFixed(2));
    const rate = feeMatchesCurrentRate ? ` (${WITHDRAWAL_FEE_PERCENTAGE * 100}%)` : '';
    const feeLabel = event === 'completed' ? `Platform fee${rate}` : `Proposed fee${rate} (not charged)`;
    rows.push([feeLabel, `$${money(transaction.feeDeducted)} USDT`]);
    rows.push([event === 'completed' ? 'Net amount' : 'Proposed net amount', `$${money(transaction.netAmount)} USDT`]);
    if (transaction.receiverAddress) rows.push(['TRC20 receiving address', transaction.receiverAddress]);
    if (event === 'completed' && transaction.txHash) rows.push(['Payout reference', transaction.txHash]);
  }
  rows.push(['Reference', transaction._id]);
  const details = rows.map(([key, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#526174;vertical-align:top;">${escapeHtml(key)}</td><td style="padding:6px 0;color:#10243a;word-break:break-all;">${escapeHtml(value)}</td></tr>`).join('');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#334155;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dbe3ee;border-radius:12px;">
<tr><td style="padding:24px;background:#0b1525;color:#fff;font-size:23px;font-weight:bold;letter-spacing:1px;">MONEXA <span style="color:#22d3ee;">FX</span></td></tr>
<tr><td style="padding:30px 32px;font-size:15px;line-height:1.6;"><h1 style="margin:0 0 16px;color:#10243a;font-size:23px;">${escapeHtml(title)}</h1>
<p>Hello ${escapeHtml(name || 'there')},</p><p>${escapeHtml(descriptions[event])}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:20px 0;padding:14px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;font-size:14px;">${details}</table>
<p style="margin-bottom:0;">You can review your transactions in your account. Contact support if you have questions.</p></td></tr>
<tr><td style="padding:20px 24px;background:#f8fafc;color:#526174;font-size:12px;">Automated account notification. Please do not reply directly to this email.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: `${title} - Monexa FX`, html };
};
