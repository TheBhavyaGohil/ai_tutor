import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: number; purpose: string }>();

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Clean expired OTPs
function cleanExpiredOTPs() {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}

// Create email transporter
async function createTransporter() {
  // Check if SMTP credentials are configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Fallback to Ethereal for testing (creates a test account)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

// Send OTP email
async function sendOTPEmail(email: string, otp: string, purpose: string) {
  try {
    const transporter = await createTransporter();
    
    const subject = purpose === 'signup' ? 'Verify Your Email - EduGenie' : 'Reset Your Password - EduGenie';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px dashed #667eea; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: monospace; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 EduGenie</h1>
            <p>${purpose === 'signup' ? 'Email Verification' : 'Password Reset'}</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>${purpose === 'signup' 
              ? 'Thank you for signing up! To complete your registration, please verify your email address.' 
              : 'We received a request to reset your password. Use the code below to proceed.'}</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; font-size: 12px; color: #999;">Valid for 10 minutes</p>
            </div>
            
            <p><strong>Important:</strong> Do not share this code with anyone. Our team will never ask you for this code.</p>
            
            ${purpose === 'forgot-password' ? '<p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>' : ''}
            
            <div class="footer">
              <p>This email was sent by EduGenie. If you did not request this, please ignore this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"EduGenie" <noreply@edugenie.com>',
      to: email,
      subject: subject,
      html: htmlContent,
    });

    // Log preview URL if using Ethereal (test account)
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, purpose } = body; // purpose: 'signup' or 'forgot-password'

    if (!email || !purpose) {
      return NextResponse.json(
        { error: 'Email and purpose are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Clean expired OTPs
    cleanExpiredOTPs();

    // Generate OTP and store it
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), { otp, expiresAt, purpose });

    // Send email with OTP
    try {
      await sendOTPEmail(email, otp, purpose);

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully to your email'
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Remove the OTP since email failed
      otpStore.delete(email.toLowerCase());
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, purpose } = body;

    if (!email || !otp || !purpose) {
      return NextResponse.json(
        { error: 'Email, OTP, and purpose are required' },
        { status: 400 }
      );
    }

    // Clean expired OTPs
    cleanExpiredOTPs();

    const storedData = otpStore.get(email.toLowerCase());

    if (!storedData) {
      return NextResponse.json(
        { error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    if (storedData.purpose !== purpose) {
      return NextResponse.json(
        { error: 'Invalid OTP purpose' },
        { status: 400 }
      );
    }

    if (storedData.expiresAt < Date.now()) {
      otpStore.delete(email.toLowerCase());
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (storedData.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    // OTP is valid - remove it from store
    otpStore.delete(email.toLowerCase());

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
