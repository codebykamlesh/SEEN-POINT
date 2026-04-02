/**
 * Email Service — Nodemailer + Gmail SMTP
 * ----------------------------------------
 * Sends OTP verification emails with a premium HTML template.
 * 
 * Required .env:
 *   SMTP_EMAIL=your@gmail.com
 *   SMTP_PASSWORD=your_app_password  (use Gmail App Password, NOT regular password)
 *   SMTP_HOST=smtp.gmail.com  (optional, defaults to Gmail)
 *   SMTP_PORT=587  (optional)
 */

'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

/**
 * Verify transporter connection (called on startup)
 */
async function verifyConnection() {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.warn('  ⚠️  SMTP not configured — OTP emails will be logged to console');
        return false;
    }
    try {
        await transporter.verify();
        console.log('  ✅ SMTP email connection verified');
        return true;
    } catch (err) {
        console.warn('  ⚠️  SMTP verification failed:', err.message);
        return false;
    }
}

/**
 * Generate a 6-digit OTP code
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP verification email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 */
async function sendOTPEmail(to, otp) {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;">
            <tr>
                <td align="center" style="padding:40px 20px;">
                    <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#111 0%,#1a1a2e 100%);border-radius:16px;border:1px solid #333;overflow:hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding:32px 40px 24px;text-align:center;">
                                <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:2px;">
                                    <span style="color:#00d4ff;">SEEN</span>
                                    <span style="color:#ffffff;"> POINT</span>
                                </h1>
                                <p style="margin:8px 0 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Movie Streaming Platform</p>
                            </td>
                        </tr>
                        <!-- Divider -->
                        <tr>
                            <td style="padding:0 40px;">
                                <div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div>
                            </td>
                        </tr>
                        <!-- OTP Content -->
                        <tr>
                            <td style="padding:32px 40px;">
                                <h2 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:600;">Verify Your Email</h2>
                                <p style="margin:0 0 24px;color:#aaa;font-size:15px;line-height:1.6;">
                                    Enter the code below to sign in to your SEEN POINT account.
                                    This code expires in <strong style="color:#00d4ff;">5 minutes</strong>.
                                </p>
                                <!-- OTP Code -->
                                <div style="text-align:center;padding:20px 0;">
                                    <div style="display:inline-block;background:#000;border:2px solid #00d4ff;border-radius:12px;padding:16px 40px;letter-spacing:12px;">
                                        <span style="font-size:36px;font-weight:800;color:#00d4ff;font-family:'Courier New',monospace;">${otp}</span>
                                    </div>
                                </div>
                                <p style="margin:24px 0 0;color:#666;font-size:13px;line-height:1.6;">
                                    If you didn't request this code, please ignore this email.
                                    Someone might have entered your email by mistake.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding:24px 40px;background:rgba(0,0,0,0.3);text-align:center;">
                                <p style="margin:0;color:#555;font-size:12px;">
                                    © ${new Date().getFullYear()} SEEN POINT — Stream Unlimited Movies & TV Shows
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;

    // If SMTP is not configured, log to console (dev mode)
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.log(`\n  📧 [DEV] OTP for ${to}: ${otp}\n`);
        return { messageId: 'dev-mode', accepted: [to] };
    }

    const info = await transporter.sendMail({
        from: `"SEEN POINT" <${process.env.SMTP_EMAIL}>`,
        to,
        subject: `${otp} — Your SEEN POINT Verification Code`,
        html: htmlTemplate,
    });

    console.log(`  📧 OTP email sent to ${to} (${info.messageId})`);
    return info;
}

module.exports = {
    generateOTP,
    sendOTPEmail,
    verifyConnection,
};
