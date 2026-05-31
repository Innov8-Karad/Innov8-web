// ═══════════════════════════════════════════════════════════════════════════════
// sendEmail — Reusable Nodemailer utility for Cloud Functions
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Gmail SMTP with App Password authentication.
// Env vars SMTP_EMAIL and SMTP_PASSWORD must be set in functions/.env
// ═══════════════════════════════════════════════════════════════════════════════

import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an email using the configured SMTP transporter.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const mailOptions = {
    from: `"Innov8 Karad" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[sendEmail] Email sent to ${to}: ${info.messageId}`);
}

/**
 * Build a branded welcome email for new students.
 */
export function buildWelcomeEmailHtml(
  studentName: string,
  resetLink: string,
  courseName?: string,
  batchName?: string
): string {
  const courseInfo = courseName ? `<p style="margin:0 0 4px;color:#94a3b8;font-size:14px;">Course: <strong style="color:#e2e8f0;">${courseName}</strong></p>` : "";
  const batchInfo = batchName ? `<p style="margin:0;color:#94a3b8;font-size:14px;">Batch: <strong style="color:#e2e8f0;">${batchName}</strong></p>` : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Innov8</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#1a1f35;border-radius:20px;overflow:hidden;border:1px solid rgba(99,102,241,0.2);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:36px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">INNOV8</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:2px;text-transform:uppercase;">Elevating Careers • Defining Futures</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:600;">Welcome aboard, ${studentName}! 🎉</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Your account has been created on the <strong style="color:#a5b4fc;">Innov8 Learning Platform</strong>. You're all set to start your journey!
              </p>

              ${(courseInfo || batchInfo) ? `
              <div style="background-color:#0f1328;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.15);">
                ${courseInfo}
                ${batchInfo}
              </div>
              ` : ""}

              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                To get started, set your password by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;">
                      Set Your Password →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="border-top:1px solid rgba(99,102,241,0.15);padding-top:20px;">
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${resetLink}" style="color:#818cf8;word-break:break-all;font-size:12px;">${resetLink}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f1328;padding:20px 32px;text-align:center;border-top:1px solid rgba(99,102,241,0.1);">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.5;">
                This email was sent by Innov8 Karad.<br>
                If you didn't expect this, please ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build a branded OTP email for signup email verification.
 * Displays a large 6-digit OTP with a 5-minute expiry notice.
 */
export function buildOTPEmailHtml(otp: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Innov8 Signup OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#1a1f35;border-radius:20px;overflow:hidden;border:1px solid rgba(233,80,9,0.2);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e95009 0%,#c74008 100%);padding:36px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">INNOV8</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:2px;text-transform:uppercase;">Elevating Careers &#x2022; Defining Futures</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:600;">Verify Your Email &#x1F510;</h2>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Enter the following OTP in the Innov8 app to verify <strong style="color:#e2e8f0;">${email}</strong> and complete your signup.
              </p>

              <!-- OTP Box -->
              <div style="background-color:#0f1328;border-radius:16px;padding:28px 20px;margin-bottom:28px;border:2px solid rgba(233,80,9,0.3);text-align:center;">
                <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Your One-Time Password</p>
                <p style="margin:0;color:#e95009;font-size:48px;font-weight:800;letter-spacing:12px;font-family:monospace;">${otp}</p>
              </div>

              <!-- Expiry Notice -->
              <div style="background-color:rgba(233,80,9,0.08);border-radius:10px;padding:12px 16px;margin-bottom:24px;border:1px solid rgba(233,80,9,0.15);">
                <p style="margin:0;color:#f97316;font-size:13px;line-height:1.5;">
                  &#x23F1; This OTP is valid for <strong>5 minutes</strong> only. Do not share it with anyone.
                </p>
              </div>

              <div style="border-top:1px solid rgba(233,80,9,0.1);padding-top:20px;">
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                  If you did not request this OTP, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f1328;padding:20px 32px;text-align:center;border-top:1px solid rgba(233,80,9,0.1);">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.5;">
                This email was sent by Innov8 Karad.<br>
                Never share your OTP with anyone.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
