// src/utils/emailTemplates.js

// Wrapper layout with dark theme styling
const baseLayout = (content) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0B0E14; color: #E2E8F0; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background-color: #151D2A; border: 1px solid #1E293B; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1E293B; }
      .brand { font-size: 24px; font-weight: bold; color: #00F0FF; text-transform: uppercase; letter-spacing: 1px; }
      .content { padding: 20px 0; line-height: 1.6; font-size: 15px; }
      .highlight-box { background-color: #0F172A; border-left: 4px solid #00F0FF; padding: 15px; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; padding-top: 20px; border-top: 1px solid #1E293B; font-size: 12px; color: #64748B; }
      .btn { display: inline-block; padding: 12px 24px; background-color: #00F0FF; color: #0B0E14; font-weight: bold; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="brand">MONEXA FX</div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} MONEXA FX Managed Funds. All rights reserved.</p>
        <p>Automated security notification. Please do not reply directly to this email.</p>
      </div>
    </div>
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

// 1. Registration Welcome Email
export const welcomeEmailTemplate = (name, referralCode) => {
  const content = `
    <h2>Welcome to MONEXA FX, ${name}!</h2>
    <p>Your account has been created successfully and is now active.</p>
    <div class="highlight-box">
      <strong>Your Unique Referral Code:</strong> <span style="color: #00F0FF; font-size: 18px; font-weight: bold;">${referralCode}</span>
    </div>
    <p>Share your link with friends to earn direct deposit bonuses ($50 USDT) and daily passive yield rewards ($0.20/day) when they invest $300 USDT or more.</p>
    <p>Minimum required deposit to activate your 1% daily yield is <strong>$300 USDT</strong>.</p>
  `;
  return baseLayout(content);
};

export const passwordResetEmailTemplate = (name, resetUrl) => {
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);
  const content = `
    <h2>Password reset request</h2>
    <p>Hello ${safeName},</p>
    <p>We received a request to reset the password for your MONEXA FX account. This link expires in 30 minutes and can only be used once.</p>
    <p><a class="btn" href="${safeResetUrl}">Reset password</a></p>
    <p>If you did not request this, you can ignore this email. Your password will remain unchanged.</p>
  `;
  return baseLayout(content);
};

// 2. Deposit Approval Email
export const depositApprovedTemplate = (name, amount) => {
  const content = `
    <h2>Deposit Confirmed!</h2>
    <p>Hello ${name},</p>
    <p>Your deposit order of <strong>$${amount} USDT</strong> has been verified and credited to your MONEXA FX account balance.</p>
    <div class="highlight-box">
      <p style="margin: 0;"><strong>Status:</strong> <span style="color: #22C55E; font-weight: bold;">APPROVED</span></p>
      <p style="margin: 5px 0 0 0;"><strong>Active Balance:</strong> $${amount} USDT</p>
    </div>
    <p>Your daily 1% compounding returns will activate after the 24-hour setup period and credit automatically every 24 hours.</p>
  `;
  return baseLayout(content);
};

// 3. Withdrawal Request Confirmation Email
export const withdrawalRequestedTemplate = (name, amount, fee, netAmount, trc20Address) => {
  const content = `
    <h2>Withdrawal Request Received</h2>
    <p>Hello ${name},</p>
    <p>We have received your cashout request. Here is the transaction breakdown:</p>
    <div class="highlight-box">
      <p style="margin: 0;"><strong>Requested Amount:</strong> $${amount} USDT</p>
      <p style="margin: 5px 0;"><strong>Platform Fee (20%):</strong> -$${fee} USDT</p>
      <p style="margin: 5px 0 0 0; font-size: 16px;"><strong>Net Payout Amount:</strong> <span style="color: #00F0FF; font-weight: bold;">$${netAmount} USDT</span></p>
      <p style="margin: 5px 0 0 0;"><strong>USDT TRC20 Destination Address:</strong> ${escapeHtml(trc20Address)}</p>
    </div>
    <p>Our admin queue is reviewing your payment. You will receive an email once the funds are transferred (stated processing time: 1–30 minutes).</p>
  `;
  return baseLayout(content);
};