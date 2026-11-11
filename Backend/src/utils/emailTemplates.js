const baseLayout = (content, preheader = '') => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Monexa FX</title>
  </head>
  <body style="margin:0;padding:0;background-color:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="display:none;font-size:1px;color:#eef2f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:25px 24px;background-color:#0b1525;border-bottom:3px solid #06b6d4;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;font-weight:700;letter-spacing:1px;color:#ffffff;">MONEXA <span style="color:#22d3ee;">FX</span></div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px;background-color:#ffffff;color:#1e293b;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;">
                ${content}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;color:#526174;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 6px;color:#526174;">&copy; ${new Date().getFullYear()} Monexa FX. All rights reserved.</p>
                <p style="margin:0;color:#526174;">Automated account notification. Please do not reply directly to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const headingStyle = 'margin:0 0 12px;color:#10243a;font-family:Arial,Helvetica,sans-serif;font-size:23px;line-height:1.3;font-weight:700;';
const paragraphStyle = 'margin:0 0 14px;color:#334155;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;';
const highlightStyle = 'margin:20px 0;padding:16px 18px;background-color:#ecfeff;border:1px solid #a5f3fc;border-left:4px solid #0891b2;border-radius:8px;color:#164e63;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;';

export const welcomeEmailTemplate = (name, referralCode) => {
  const content = `
    <h1 style="${headingStyle}">Welcome to Monexa FX, ${escapeHtml(name)}!</h1>
    <p style="${paragraphStyle}">Your account has been created successfully and is ready to use. We’re glad you’re here.</p>
    <div style="${highlightStyle}">
      <div style="margin-bottom:5px;color:#164e63;font-size:13px;font-weight:600;">YOUR REFERRAL CODE</div>
      <div style="color:#087e9d;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:1px;">${escapeHtml(referralCode)}</div>
    </div>
    <p style="${paragraphStyle}">Share your referral code with friends to introduce them to Monexa FX. Referral rewards are subject to the program’s eligibility and holding rules.</p>
    <p style="margin:0;color:#334155;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;">The minimum qualifying main balance for daily yield eligibility is <strong style="color:#10243a;">$300 USDT</strong>. Please review the Terms &amp; Policy in your account for full details.</p>
  `;
  return baseLayout(content, `Welcome to Monexa FX, ${escapeHtml(name)}. Your account is ready.`);
};

export const passwordResetEmailTemplate = (name, resetUrl) => {
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);
  const content = `
    <h1 style="${headingStyle}">Password reset request</h1>
    <p style="${paragraphStyle}">Hello ${safeName},</p>
    <p style="${paragraphStyle}">We received a request to reset the password for your Monexa FX account. This link expires in 30 minutes and can only be used once.</p>
    <p style="margin:20px 0;"><a href="${safeResetUrl}" style="display:inline-block;padding:12px 22px;background-color:#087e9d;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;font-weight:700;text-decoration:none;border-radius:6px;">Reset password</a></p>
    <p style="margin:0;color:#334155;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;">If you did not request this, you can ignore this email. Your password will remain unchanged.</p>
  `;
  return baseLayout(content, 'Use the secure link to reset your Monexa FX password.');
};

export const depositApprovedTemplate = (name, amount) => {
  const content = `
    <h1 style="${headingStyle}">Deposit confirmed</h1>
    <p style="${paragraphStyle}">Hello ${escapeHtml(name)},</p>
    <p style="${paragraphStyle}">Your deposit of <strong style="color:#10243a;">$${escapeHtml(amount)} USDT</strong> has been verified and credited to your Monexa FX account.</p>
    <div style="${highlightStyle}">
      <p style="margin:0 0 5px;color:#164e63;"><strong>Status:</strong> <span style="color:#15803d;font-weight:700;">APPROVED</span></p>
      <p style="margin:0;color:#164e63;"><strong>Credited amount:</strong> $${escapeHtml(amount)} USDT</p>
    </div>
    <p style="margin:0;color:#334155;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;">The stated daily return is 1% of qualifying investment balance after activation and is not compounded. Eligibility pauses if the main balance falls below $300; restoring it starts a new 24-hour period, with no backdated payments.</p>
  `;
  return baseLayout(content, `Your deposit of $${escapeHtml(amount)} USDT has been credited.`);
};

export const withdrawalRequestedTemplate = (name, amount, fee, netAmount, trc20Address) => {
  const content = `
    <h1 style="${headingStyle}">Withdrawal request received</h1>
    <p style="${paragraphStyle}">Hello ${escapeHtml(name)},</p>
    <p style="${paragraphStyle}">We’ve received your withdrawal request. Here is the current breakdown:</p>
    <div style="${highlightStyle}">
      <p style="margin:0 0 6px;color:#164e63;"><strong>Requested amount:</strong> $${escapeHtml(amount)} USDT</p>
      <p style="margin:0 0 6px;color:#164e63;"><strong>Platform fee (20%):</strong> -$${escapeHtml(fee)} USDT</p>
      <p style="margin:0 0 8px;color:#164e63;font-size:16px;"><strong>Net payout:</strong> <span style="color:#087e9d;font-weight:700;">$${escapeHtml(netAmount)} USDT</span></p>
      <p style="margin:0;color:#164e63;word-break:break-all;"><strong>USDT TRC20 destination:</strong> ${escapeHtml(trc20Address)}</p>
    </div>
    <p style="margin:0;color:#334155;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;">Your request is in the admin review queue. Processing time depends on verification and payout review; no fixed completion time is guaranteed.</p>
  `;
  return baseLayout(content, `Your Monexa FX withdrawal request has been received.`);
};
