// Backend/src/services/emailService.js
import nodemailer from 'nodemailer';

// Helper function to lazily initialize or create transporter dynamically
const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465, // Automatically true if port is 465, false for 587
    auth: user && pass ? { user, pass } : undefined, // Ensures PLAIN credentials load correctly
  });
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Safety check: Skip attempting to send if SMTP credentials aren't set in environment
    if (!user || !pass) {
      console.warn(`[SMTP Warning] Email sending skipped for ${to}: SMTP_USER or SMTP_PASS missing in environment variables.`);
      return false;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.FROM_EMAIL || `"MONEXA FX" <${user}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Email delivery failed to ${to}: ${error.message}`);
    return false; // Returns false safely without crashing the registration flow or breaking Express
  }
};