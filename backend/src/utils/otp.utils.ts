import pool from '../config/database';
import nodemailer from 'nodemailer';

export const generateOTP = async (email: string): Promise<string> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    'INSERT INTO otps (email, otp_code, expires_at) VALUES ($1, $2, $3)',
    [email, otp, expiresAt]
  );

  return otp;
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your Job Portal OTP',
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send OTP email:', error);
  }
};
