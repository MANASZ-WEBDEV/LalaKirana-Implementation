import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const emailService = {
  sendOTPEmail: async (email: string, otp: string): Promise<boolean> => {
    const mailOptions = {
      from: `"LalaKirana Admin" <${process.env.SMTP_USER || 'no-reply@lalakirana.in'}>`,
      to: email,
      subject: 'LalaKirana Password Reset OTP',
      text: `Your One-Time Password (OTP) for password reset is: ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #171c1f; background-color: #f6fafd;">
          <h2 style="color: #006763;">LalaKirana Password Reset</h2>
          <p>You requested a password reset. Use the following 6-digit One-Time Password (OTP) to reset your password:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 15px; background-color: #eaeef2; border-radius: 4px; text-align: center; margin: 20px 0; color: #006763; font-family: monospace;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    try {
      console.log(`[EmailService] Attempting to send OTP email to ${email}...`);
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] OTP email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error(`[EmailService] Failed to send email to ${email}:`, error);
      console.log(`[DEVELOPMENT ONLY] OTP code for ${email} is: ${otp}`);
      return false;
    }
  },
};
