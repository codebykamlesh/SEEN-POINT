/**
 * Email Service — Nodemailer OTP Delivery
 * ----------------------------------------
 * Sends 6-digit OTP codes via Gmail SMTP.
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,   // Gmail App Password (not account password)
    },
});

/**
 * Send OTP email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit code
 */
const sendOTP = async (to, otp) => {
    const mailOptions = {
        from: `"SEEN POINT" <${process.env.SMTP_EMAIL}>`,
        to,
        subject: `${otp} is your SEEN POINT login code`,
        html: `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
                <div style="padding:40px 32px;text-align:center">
                    <h1 style="color:#00D4FF;font-size:28px;letter-spacing:3px;margin:0 0 8px">SEEN POINT</h1>
                    <p style="color:#666;font-size:13px;margin:0 0 32px">Movie Streaming Platform</p>
                    
                    <p style="color:#e5e5e5;font-size:16px;margin:0 0 24px">Your login verification code:</p>
                    
                    <div style="background:rgba(0,212,255,0.08);border:2px solid rgba(0,212,255,0.3);border-radius:12px;padding:20px;margin:0 0 24px">
                        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#00D4FF;font-family:monospace">${otp}</span>
                    </div>
                    
                    <p style="color:#999;font-size:13px;margin:0 0 8px">This code expires in <strong style="color:#e5e5e5">5 minutes</strong>.</p>
                    <p style="color:#666;font-size:12px;margin:0">If you didn't request this, please ignore this email.</p>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:16px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
                    <p style="color:#444;font-size:11px;margin:0">&copy; ${new Date().getFullYear()} SEEN POINT. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 OTP sent to ${to}: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error('📧 Email send failed:', err.message);
        throw new Error('Failed to send verification email. Please try again.');
    }
};

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { sendOTP, generateOTP };
